"""Opt-in SMS delivery with durable dispatch intent and no blind retries after uncertainty."""
from datetime import datetime,timedelta,timezone
from zoneinfo import ZoneInfo
from urllib.parse import urlparse
import re
import requests
from flask import current_app
from .db import transaction,one,query,json_text,audit,DomainError
from .providers import config

CRITICAL={'supply.lost','supply.restored','protection','tamper','payment.confirmed','vending.delayed','vending.token_ready'}

def sms_configured():
    return current_app.config.get('SMS_ENABLED')=='true' and all(current_app.config.get(k) for k in ('AT_USERNAME','AT_API_KEY','AT_SENDER_ID'))

def delivery_time(template,now):
    local=now.astimezone(ZoneInfo('Africa/Lagos'))
    if template in CRITICAL or 7<=local.hour<21:return now
    morning=(local+timedelta(days=1) if local.hour>=21 else local).replace(hour=7,minute=0,second=0,microsecond=0)
    return morning.astimezone(timezone.utc)

def queue_sms(c,uid,key,message,dedupe,episode):
    if not sms_configured():return
    pref=one(c,'SELECT value FROM user_preferences WHERE user_id=:id',id=uid)
    if not pref or pref['value'].get('sms_enabled') is not True:return
    n=one(c,"""INSERT INTO notifications(recipient_id,template_key,channel,status,payload,dedupe_key,episode_id)
        VALUES(:uid,:key,'sms','queued',CAST(:payload AS jsonb),:dedupe,:episode)
        ON CONFLICT(dedupe_key) DO NOTHING RETURNING id""",uid=uid,key=key,payload=json_text({'message':message}),dedupe='sms:'+dedupe,episode=episode)
    if n:
        query(c,"""INSERT INTO outbox(aggregate_type,aggregate_id,event_type,payload,next_attempt_at)
            VALUES('notification',:id,'sms_queued',CAST(:payload AS jsonb),:at)""",
            id=n['id'],payload=json_text({'notification_id':str(n['id'])}),at=delivery_time(key,datetime.now(timezone.utc)))

def sms_request(phone,message):
    url=current_app.config.get('AT_SMS_URL','https://api.africastalking.com/version1/messaging')
    parsed=urlparse(url)
    if parsed.scheme!='https' and not(current_app.testing and parsed.scheme=='http' and parsed.hostname in ('127.0.0.1','localhost')):
        raise DomainError('invalid_provider_configuration','SMS provider connections require HTTPS.',503)
    return url,{'apiKey':config('AT_API_KEY'),'Accept':'application/json'},dict(username=config('AT_USERNAME'),to=phone,message=message,bulkSMSMode=1,**{'from':config('AT_SENDER_ID')})

def process_sms(notification_id):
    with transaction() as c:
        n=one(c,"SELECT * FROM notifications WHERE id=:id AND channel='sms' FOR UPDATE",id=notification_id)
        if not n or n['status']!='queued':return
        pref=one(c,'SELECT value FROM user_preferences WHERE user_id=:id',id=n['recipient_id'])
        if not pref or pref['value'].get('sms_enabled') is not True or n['template_key']=='utility.notice' and pref['value'].get('utility_notices_enabled') is not True:
            query(c,"UPDATE notifications SET status='failed',last_error='recipient_opted_out' WHERE id=:id",id=notification_id);return
        if not sms_configured():raise DomainError('sms_not_configured','SMS delivery requires an activated provider.',503)
        user=one(c,'SELECT phone FROM profiles WHERE id=:id',id=n['recipient_id'])
        if not user or not re.fullmatch(r'\+[1-9]\d{7,14}',user['phone'] or ''):
            query(c,"UPDATE notifications SET status='failed',last_error='recipient_invalid' WHERE id=:id",id=notification_id);return
        url,headers,data=sms_request(user['phone'],n['payload']['message'])
        # AT does not document a caller-supplied idempotency key for standard SMS.
        # Commit uncertain intent BEFORE HTTP; a crash/reclaimed lease cannot send twice.
        query(c,"UPDATE notifications SET status='unknown',dispatched_at=now(),attempts=attempts+1,last_error='dispatch_outcome_unknown' WHERE id=:id",id=notification_id)
    status='unknown';reference=None;error='dispatch_outcome_unknown'
    try:
        response=requests.post(url,headers=headers,data=data,timeout=(5,20),allow_redirects=False)
        if 400<=response.status_code<500:status='failed';error='provider_rejected'
        elif response.status_code in (200,201):
            recipients=response.json().get('SMSMessageData',{}).get('Recipients',[])
            if len(recipients)==1 and recipients[0].get('number')==data['to']:
                r=recipients[0]
                if r.get('statusCode')==101 and isinstance(r.get('messageId'),str) and r['messageId']:
                    status='provider_accepted';reference=r['messageId'];error=None
                elif type(r.get('statusCode')) is int and r['statusCode']>=400:
                    status='failed';error='provider_rejected'
    except (requests.RequestException,ValueError,TypeError,AttributeError):pass
    with transaction() as c:
        query(c,"UPDATE notifications SET status=:status,provider_reference=:ref,last_error=:error WHERE id=:id AND status='unknown'",id=notification_id,status=status,ref=reference,error=error)
        audit(c,None,'sms_dispatch_recorded',notification_id,{'status':status})
