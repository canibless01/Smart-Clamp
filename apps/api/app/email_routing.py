"""UTC quota reservations and provider-pinned email dispatch selection."""
import html
from email.utils import parseaddr
from urllib.parse import urlparse
from flask import current_app
from .db import one,query,scalar,DomainError
from .providers import config

def onesignal_email_configured():
    return current_app.config.get('ONESIGNAL_EMAIL_ENABLED')=='true' and all(current_app.config.get(k) for k in ('ONESIGNAL_APP_ID','ONESIGNAL_REST_API_KEY'))

def limits():
    try:
        day=int((current_app.config.get('RESEND_DAILY_EMAIL_LIMIT') or 100));month=int((current_app.config.get('RESEND_MONTHLY_EMAIL_LIMIT') or 3000))
        if not 1<=day<=100 or not 1<=month<=3000:raise ValueError()
    except (ValueError,TypeError):raise DomainError('email_quota_configuration_invalid','Configure Resend daily/monthly budgets within the approved allowance.',503)
    return day,month

def reserve_resend(c,nid,now):
    # Reserve at HTTP dispatch, not queue creation: overnight backlogs count on
    # the actual send day. Same-day retries reuse a reservation. A cross-midnight
    # retry reserves another daily slot conservatively, retaining its provider.
    day=now.date();month=day.replace(day=1);scope=(current_app.config.get('EMAIL_QUOTA_TEST_SCOPE') or 'resend') if current_app.testing else 'resend'
    query(c,'SELECT pg_advisory_xact_lock(hashtextextended(:key,0))',key='email-quota:'+scope)
    if one(c,'SELECT notification_id FROM email_quota_reservations WHERE notification_id=:id AND day=:day',id=nid,day=day):return True
    daily,monthly=limits()
    for period,start in [('month',month),('day',day)]:query(c,'INSERT INTO email_quota_counters(scope,period,starts_on) VALUES(:scope,:period,:start) ON CONFLICT DO NOTHING',scope=scope,period=period,start=start)
    used_day=scalar(c,"SELECT reserved FROM email_quota_counters WHERE scope=:scope AND period='day' AND starts_on=:start",scope=scope,start=day)
    used_month=scalar(c,"SELECT reserved FROM email_quota_counters WHERE scope=:scope AND period='month' AND starts_on=:start",scope=scope,start=month)
    counted_month=bool(one(c,'SELECT notification_id FROM email_quota_reservations WHERE notification_id=:id AND day>=:month AND day<=:day',id=nid,month=month,day=day))
    if used_day>=daily or not counted_month and used_month>=monthly:return False
    query(c,"UPDATE email_quota_counters SET reserved=reserved+1 WHERE scope=:scope AND period='day' AND starts_on=:start",scope=scope,start=day)
    if not counted_month:query(c,"UPDATE email_quota_counters SET reserved=reserved+1 WHERE scope=:scope AND period='month' AND starts_on=:start",scope=scope,start=month)
    query(c,'INSERT INTO email_quota_reservations(notification_id,scope,day) VALUES(:id,:scope,:day)',id=nid,scope=scope,day=day)
    return True

def onesignal_endpoint(channel):
    url=(current_app.config.get('ONESIGNAL_API_URL') or 'https://api.onesignal.com/notifications')
    parsed=urlparse(url)
    if url!='https://api.onesignal.com/notifications' and not(current_app.testing and parsed.scheme=='http' and parsed.hostname=='127.0.0.1'):raise DomainError('onesignal_configuration_invalid','OneSignal requires the approved HTTPS endpoint.',503)
    return url+'?c='+channel

def onesignal_email_payload(payload,app_id,request_id):
    name,address=parseaddr(payload['from'])
    return {'app_id':app_id,'target_channel':'email','email_to':payload['to'],'email_from_address':address,'email_from_name':name or 'SmartClamp','email_subject':payload['subject'],'email_body':'<div style="white-space:pre-wrap">'+html.escape(payload['text'])+'</div>','idempotency_key':str(request_id)}

def quota_summary(c,now):
    day,month=limits();scope=(current_app.config.get('EMAIL_QUOTA_TEST_SCOPE') or 'resend') if current_app.testing else 'resend'
    daily=scalar(c,"SELECT reserved FROM email_quota_counters WHERE scope=:scope AND period='day' AND starts_on=:start",scope=scope,start=now.date()) or 0
    monthly=scalar(c,"SELECT reserved FROM email_quota_counters WHERE scope=:scope AND period='month' AND starts_on=:start",scope=scope,start=now.date().replace(day=1)) or 0
    return {'resend_day_reserved':daily,'daily_limit':day,'resend_month_reserved':monthly,'monthly_limit':month,'calendar':'UTC','onesignal_fallback_configured':bool(onesignal_email_configured())}
