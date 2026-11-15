"""Opt-in transactional email with frozen payloads and bounded provider idempotency.

Provider acceptance is not inbox delivery. Never start a fresh request identity
to recover an uncertain send, nor retry after the provider's deduplication window.
"""
from datetime import datetime,timezone,timedelta
from urllib.parse import urlparse
from email.utils import parseaddr
import hashlib,json,re
import requests
from cryptography.fernet import Fernet,InvalidToken
from flask import current_app
from .db import transaction,one,query,json_text,DomainError,audit
from .providers import config
from .email_routing import onesignal_email_configured,reserve_resend,onesignal_endpoint,onesignal_email_payload

def configured():return current_app.config.get('EMAIL_ENABLED')=='true' and all(current_app.config.get(k) for k in ('EMAIL_FROM','EMAIL_ENCRYPTION_KEY','APP_ORIGIN')) and (bool(current_app.config.get('RESEND_API_KEY')) or bool(onesignal_email_configured()))

def valid_email(value):return isinstance(value,str) and len(value)<=254 and bool(re.fullmatch(r'[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+',value))

def sender_address():
    sender=config('EMAIL_FROM');address=parseaddr(sender)[1]
    if '\r' in sender or '\n' in sender or not valid_email(address):raise DomainError('email_configuration_invalid','Configure one verified sender address.',503)
    return sender

def endpoint():
    url=current_app.config.get('RESEND_API_URL','https://api.resend.com/emails')
    parsed=urlparse(url)
    if url!='https://api.resend.com/emails' and not(current_app.testing and parsed.scheme=='http' and parsed.hostname=='127.0.0.1'):raise DomainError('email_configuration_invalid','Email requests require the approved Resend HTTPS endpoint.',503)
    return url

def queue_email(c,uid,key,message,dedupe,episode):
    if not configured():return
    pref=one(c,'SELECT value FROM user_preferences WHERE user_id=:id',id=uid)
    if not pref or pref['value'].get('email_enabled') is not True:return
    user=one(c,'SELECT email FROM profiles WHERE id=:id',id=uid)
    if not user or not valid_email(user['email']):return
    n=one(c,"INSERT INTO notifications(recipient_id,template_key,channel,status,payload,dedupe_key,episode_id) VALUES(:uid,:key,'email','queued',CAST(:payload AS jsonb),:dedupe,:episode) ON CONFLICT(dedupe_key) DO NOTHING RETURNING id",uid=uid,key=key,payload=json_text({'message':message}),dedupe='email:'+dedupe,episode=episode)
    if not n:return
    from .email_receipts import address_hash
    if one(c,'SELECT address_hash FROM email_suppressions WHERE address_hash=:hash',hash=address_hash(user['email'])):
        query(c,"UPDATE notifications SET status='failed',last_error='recipient_suppressed' WHERE id=:id",id=n['id']);return
    try:
        origin=config('APP_ORIGIN').rstrip('/');parsed=urlparse(origin)
        if parsed.scheme!='https' and not(current_app.testing and parsed.scheme=='http' and parsed.hostname in ('localhost','127.0.0.1')):raise DomainError('email_configuration_invalid','Account email links require HTTPS.',503)
        payload={'from':sender_address(),'to':[user['email']],'subject':'SmartClamp account update','text':message+'\n\nOpen your account securely: '+origin+'/alerts'}
        raw=json_text(payload).encode();encrypted=Fernet(config('EMAIL_ENCRYPTION_KEY').encode()).encrypt(raw).decode()
    except (DomainError,ValueError,TypeError):
        # Optional delivery misconfiguration must not undo payment/safety records.
        query(c,"UPDATE notifications SET status='failed',last_error='email_configuration_invalid' WHERE id=:id",id=n['id']);return
    query(c,'INSERT INTO email_dispatches(notification_id,encrypted_request,request_sha256) VALUES(:id,:encrypted,:hash)',id=n['id'],encrypted=encrypted,hash=hashlib.sha256(raw).hexdigest())
    query(c,"INSERT INTO outbox(aggregate_type,aggregate_id,event_type,payload) VALUES('notification',:id,'email_queued',CAST(:payload AS jsonb))",id=n['id'],payload=json_text({'notification_id':str(n['id'])}))

def process_email(notification_id):
    now=datetime.now(timezone.utc)
    with transaction() as c:
        n=one(c,"SELECT n.*,e.encrypted_request,e.request_sha256,e.first_attempt_at,e.retry_until,e.credential_fingerprint,e.provider,e.provider_app_id,e.provider_request_id,e.encrypted_provider_request,e.webhook_tag FROM notifications n JOIN email_dispatches e ON e.notification_id=n.id WHERE n.id=:id AND n.channel='email' FOR UPDATE OF n,e",id=notification_id)
        if not n or n['status'] not in ('queued','unknown'):return
        pref=one(c,'SELECT value FROM user_preferences WHERE user_id=:id',id=n['recipient_id'])
        opted=not pref or pref['value'].get('email_enabled') is not True or n['template_key']=='utility.notice' and pref['value'].get('utility_notices_enabled') is not True
        if opted:
            query(c,"UPDATE notifications SET status=:status,last_error='recipient_opted_out' WHERE id=:id",id=notification_id,status='unknown' if n['first_attempt_at'] else 'failed');return
        if not configured():raise DomainError('email_not_configured','Email delivery is awaiting configuration.',503)
        try:raw=Fernet(config('EMAIL_ENCRYPTION_KEY').encode()).decrypt(n['encrypted_request'].encode());payload=json.loads(raw)
        except (InvalidToken,ValueError):raise DomainError('email_decryption_failed','Restore the original email encryption key before retrying.',503)
        if hashlib.sha256(raw).hexdigest()!=n['request_sha256']:raise DomainError('email_integrity_failed','Email request integrity requires review.',503)
        user=one(c,'SELECT email FROM profiles WHERE id=:id',id=n['recipient_id'])
        if not user or payload['to']!=[user['email']]:
            query(c,"UPDATE notifications SET status=:status,last_error='recipient_changed' WHERE id=:id",id=notification_id,status='unknown' if n['first_attempt_at'] else 'failed');return
        from .email_receipts import address_hash
        if one(c,'SELECT address_hash FROM email_suppressions WHERE address_hash=:hash',hash=address_hash(payload['to'][0])):
            query(c,"UPDATE notifications SET status=:status,last_error='recipient_suppressed' WHERE id=:id",id=notification_id,status='unknown' if n['first_attempt_at'] else 'failed');return
        provider=n['provider']
        if n['first_attempt_at'] and (now<n['first_attempt_at'] or now>=n['retry_until']):
            query(c,"UPDATE notifications SET status='unknown',last_error=:error WHERE id=:id",id=notification_id,error='clock_rollback' if now<n['first_attempt_at'] else 'idempotency_window_expired');return
        if not provider:
            if current_app.config.get('RESEND_API_KEY') and reserve_resend(c,notification_id,now):provider='resend'
            elif onesignal_email_configured():provider='onesignal'
            else:raise DomainError('email_fallback_not_configured','Resend allowance is reserved; configure OneSignal fallback before sending more.',503)
        elif provider=='resend' and not reserve_resend(c,notification_id,now):raise DomainError('email_quota_waiting','The pinned Resend request is awaiting quota; it cannot fail over after an uncertain send.',503)
        app_id=n['provider_app_id'] if n['first_attempt_at'] else config('ONESIGNAL_APP_ID') if provider=='onesignal' else None
        api_key=config('ONESIGNAL_REST_API_KEY' if provider=='onesignal' else 'RESEND_API_KEY')
        fingerprint=hashlib.sha256(api_key.encode()).hexdigest()
        if n['first_attempt_at'] and fingerprint!=n['credential_fingerprint']:
            query(c,"UPDATE notifications SET status='unknown',last_error='provider_credentials_changed' WHERE id=:id",id=notification_id);return
        url=onesignal_endpoint('email') if provider=='onesignal' else endpoint()
        if not n['first_attempt_at']:
            query(c,'UPDATE email_dispatches SET provider=:provider,provider_app_id=:app,first_attempt_at=:at,retry_until=:until,credential_fingerprint=:fingerprint WHERE notification_id=:id',id=notification_id,provider=provider,app=app_id,at=now,until=now+timedelta(hours=23),fingerprint=fingerprint)
        headers={'Authorization':('Key ' if provider=='onesignal' else 'Bearer ')+api_key}
        if provider=='onesignal':request_payload=onesignal_email_payload(payload,app_id,n['provider_request_id'])
        else:
            headers['Idempotency-Key']='smartclamp-email-'+str(notification_id);request_payload={**payload,'tags':[{'name':'smartclamp_dispatch','value':str(n['webhook_tag'])}]}
        if n['encrypted_provider_request']:
            try:provider_raw=Fernet(config('EMAIL_ENCRYPTION_KEY').encode()).decrypt(n['encrypted_provider_request'].encode())
            except InvalidToken:raise DomainError('email_decryption_failed','Restore the original email encryption key before retrying.',503)
        else:
            provider_raw=json_text(request_payload).encode()
            sealed=Fernet(config('EMAIL_ENCRYPTION_KEY').encode()).encrypt(provider_raw).decode()
            query(c,'UPDATE email_dispatches SET encrypted_provider_request=:sealed WHERE notification_id=:id',id=notification_id,sealed=sealed)
        headers['Content-Type']='application/json'
        query(c,"UPDATE notifications SET status='unknown',dispatched_at=coalesce(dispatched_at,now()),attempts=attempts+1,last_error='dispatch_outcome_unknown' WHERE id=:id",id=notification_id)
    status='unknown';error='dispatch_outcome_unknown';reference=None
    try:
        response=requests.post(url,headers=headers,data=provider_raw,timeout=(5,20),allow_redirects=False)
        if response.status_code in (200,201,202):
            data=response.json()
            if isinstance(data,dict) and isinstance(data.get('id'),str) and data['id']:status='provider_accepted';reference=data['id'];error=None
        elif 400<=response.status_code<500 and response.status_code not in (408,429):status='failed';error='provider_rejected'
    except (requests.RequestException,ValueError,TypeError):pass
    with transaction() as c:
        query(c,"UPDATE notifications SET status=:status,provider_reference=coalesce(provider_reference,:ref),last_error=:error WHERE id=:id AND status='unknown'",id=notification_id,status=status,ref=reference,error=error)
        from .email_receipts import reconcile
        reconcile(c,notification_id)
        status=one(c,'SELECT status FROM notifications WHERE id=:id',id=notification_id)['status']
        audit(c,None,'email_dispatch_recorded',notification_id,{'status':status})
    if status=='unknown':raise DomainError('email_retry_pending','The same email request needs idempotent reconciliation.',503)
