"""OneSignal web push with encrypted opaque aliases, never predictable account IDs."""
import secrets,json,hashlib
from datetime import datetime,timezone,timedelta
from urllib.parse import urlparse
from cryptography.fernet import Fernet,InvalidToken
import requests
from flask import Blueprint,current_app,request,jsonify,g
from .db import transaction,one,rows,scalar,query,json_text,uuid_string,audit,DomainError
from .live_auth import authenticated
from .providers import config
from .email_routing import onesignal_endpoint

bp=Blueprint('onesignal_push',__name__)
def selected():return current_app.config.get('ONESIGNAL_PUSH_ENABLED')=='true'
def configured():return selected() and all(current_app.config.get(k) for k in ('ONESIGNAL_APP_ID','ONESIGNAL_REST_API_KEY','PUSH_ENCRYPTION_KEY','APP_ORIGIN'))
def crypt():
    try:return Fernet(config('PUSH_ENCRYPTION_KEY').encode())
    except (ValueError,TypeError):raise DomainError('onesignal_configuration_invalid','Configure the original push encryption key.',503)
def app_id():return uuid_string(config('ONESIGNAL_APP_ID'))

@bp.post('/api/v1/users/me/onesignal/session')
@authenticated
def session():
    if not configured():raise DomainError('onesignal_not_configured','OneSignal web push is awaiting configuration.',503)
    d=request.get_json() or {};app=app_id()
    with transaction() as c:
        query(c,'SELECT pg_advisory_xact_lock(hashtextextended(:key,0))',key='onesignal-user:'+g.actor['id'])
        account=one(c,'SELECT encrypted_alias FROM onesignal_push_accounts WHERE user_id=:uid AND app_id=:app',uid=g.actor['id'],app=app)
        if not account:
            alias='sc_'+secrets.token_hex(32)
            query(c,'INSERT INTO onesignal_push_accounts(user_id,app_id,encrypted_alias) VALUES(:uid,:app,:encrypted)',uid=g.actor['id'],app=app,encrypted=crypt().encrypt(alias.encode()).decode())
        else:
            try:alias=crypt().decrypt(account['encrypted_alias'].encode()).decode()
            except InvalidToken:raise DomainError('onesignal_decryption_failed','Restore the original push encryption key.',503)
        device=one(c,'SELECT id,enabled FROM onesignal_push_devices WHERE id=:id AND user_id=:uid AND app_id=:app',id=uuid_string(d['registration_id']),uid=g.actor['id'],app=app) if d.get('registration_id') else None
        if d.get('registration_id') and not device:raise DomainError('scope_denied','This browser registration does not belong to your account.',403)
        if not device:
            if scalar(c,"SELECT count(*) FROM onesignal_push_devices WHERE user_id=:uid AND created_at>now()-interval '1 hour'",uid=g.actor['id'])>=20:raise DomainError('rate_limited','Too many browser registrations. Reuse this device registration.',429)
            device=one(c,'INSERT INTO onesignal_push_devices(user_id,app_id) VALUES(:uid,:app) RETURNING id,enabled',uid=g.actor['id'],app=app)
        audit(c,g.actor['id'],'onesignal_browser_session',device['id'])
    return jsonify(app_id=app,external_alias=alias,registration_id=device['id'],enabled=device['enabled'],user_id=g.actor['id'])

@bp.post('/api/v1/users/me/onesignal/devices/<registration_id>')
@authenticated
def preference(registration_id):
    d=request.get_json() or {}
    if type(d.get('enabled')) is not bool:raise DomainError('validation_error','Choose an explicit browser notification preference.')
    if d['enabled'] and not configured():raise DomainError('onesignal_not_configured','OneSignal is not configured.',503)
    with transaction() as c:
        row=one(c,'UPDATE onesignal_push_devices SET enabled=:enabled,updated_at=now() WHERE id=:id AND user_id=:uid RETURNING id',id=uuid_string(registration_id),uid=g.actor['id'],enabled=d['enabled'])
        if not row:raise DomainError('scope_denied','This browser registration does not belong to your account.',403)
        if d['enabled']:query(c,'INSERT INTO user_preferences(user_id,value) VALUES(:uid,CAST(:value AS jsonb)) ON CONFLICT(user_id) DO UPDATE SET value=user_preferences.value||excluded.value,version=user_preferences.version+1,updated_at=now()',uid=g.actor['id'],value=json_text({'push_enabled':True}))
        audit(c,g.actor['id'],'onesignal_browser_preference',row['id'],{'enabled':d['enabled']})
    return jsonify(status='enabled' if d['enabled'] else 'disabled')

def device_count(c,recipients):
    return scalar(c,"SELECT count(*) FROM onesignal_push_devices d JOIN user_preferences p ON p.user_id=d.user_id WHERE d.user_id=ANY(CAST(:ids AS uuid[])) AND d.app_id=:app AND d.enabled AND p.value->'push_enabled'='true'::jsonb",ids=recipients,app=app_id()) if configured() else 0

def queue(c,uid,key,dedupe,episode):
    if not configured() or not device_count(c,[uid]):return
    account=one(c,'SELECT encrypted_alias FROM onesignal_push_accounts WHERE user_id=:uid AND app_id=:app',uid=uid,app=app_id())
    if not account:return
    n=one(c,"INSERT INTO notifications(recipient_id,template_key,channel,status,payload,dedupe_key,episode_id) VALUES(:uid,:key,'push','queued','{}'::jsonb,:dedupe,:episode) ON CONFLICT(dedupe_key) DO NOTHING RETURNING id",uid=uid,key=key,dedupe='push:'+dedupe,episode=episode)
    if not n:return
    origin=config('APP_ORIGIN').rstrip('/');url=urlparse(origin)
    if url.scheme!='https' and not(current_app.testing and url.scheme=='http' and url.hostname in ('localhost','127.0.0.1')):raise DomainError('onesignal_configuration_invalid','Browser notification links require HTTPS.',503)
    payload={'app_id':app_id(),'target_channel':'push','include_aliases':{'external_id':[crypt().decrypt(account['encrypted_alias'].encode()).decode()]},'headings':{'en':'SmartClamp'},'contents':{'en':'You have an account update. Open SmartClamp to view it securely.'},'web_url':origin+'/alerts','idempotency_key':str(n['id'])}
    encrypted=crypt().encrypt(json_text(payload).encode()).decode()
    query(c,'INSERT INTO onesignal_push_deliveries(notification_id,encrypted_request) VALUES(:id,:encrypted)',id=n['id'],encrypted=encrypted)
    query(c,"INSERT INTO outbox(aggregate_type,aggregate_id,event_type,payload) VALUES('notification',:id,'onesignal_push_queued',CAST(:payload AS jsonb))",id=n['id'],payload=json_text({'notification_id':str(n['id'])}))

def process(notification_id):
    now=datetime.now(timezone.utc)
    with transaction() as c:
        n=one(c,"SELECT n.*,d.encrypted_request,d.first_attempt_at,d.retry_until,d.credential_fingerprint FROM notifications n JOIN onesignal_push_deliveries d ON d.notification_id=n.id WHERE n.id=:id FOR UPDATE OF n,d",id=notification_id)
        if not n or n['status'] not in ('queued','unknown'):return
        pref=one(c,'SELECT value FROM user_preferences WHERE user_id=:id',id=n['recipient_id'])
        stopped=not configured() or not pref or pref['value'].get('push_enabled') is not True or n['template_key']=='utility.notice' and pref['value'].get('utility_notices_enabled') is not True
        if not stopped:stopped=not device_count(c,[str(n['recipient_id'])])
        if stopped:
            query(c,"UPDATE notifications SET status=:status,last_error='recipient_or_channel_disabled' WHERE id=:id",id=notification_id,status='unknown' if n['first_attempt_at'] else 'failed');return
        try:raw=crypt().decrypt(n['encrypted_request'].encode());payload=json.loads(raw)
        except (InvalidToken,ValueError):raise DomainError('onesignal_decryption_failed','Restore the original push encryption key.',503)
        fingerprint=hashlib.sha256(config('ONESIGNAL_REST_API_KEY').encode()).hexdigest()
        if payload['app_id']!=app_id() or n['first_attempt_at'] and (now<n['first_attempt_at'] or now>=n['retry_until'] or n['credential_fingerprint']!=fingerprint):
            query(c,"UPDATE notifications SET status='unknown',last_error='original_provider_identity_requires_review' WHERE id=:id",id=notification_id);return
        url=onesignal_endpoint('push')
        if not n['first_attempt_at']:query(c,'UPDATE onesignal_push_deliveries SET first_attempt_at=:at,retry_until=:until,credential_fingerprint=:fingerprint WHERE notification_id=:id',id=notification_id,at=now,until=now+timedelta(hours=23),fingerprint=fingerprint)
        query(c,"UPDATE notifications SET status='unknown',dispatched_at=coalesce(dispatched_at,now()),attempts=attempts+1,last_error='dispatch_outcome_unknown' WHERE id=:id",id=notification_id)
    status='unknown';error='dispatch_outcome_unknown';reference=None
    try:
        response=requests.post(url,headers={'Authorization':'Key '+config('ONESIGNAL_REST_API_KEY'),'Content-Type':'application/json'},data=raw,timeout=(5,20),allow_redirects=False)
        if response.status_code in (200,201,202):
            data=response.json()
            if isinstance(data,dict) and isinstance(data.get('id'),str) and data['id']:status='provider_accepted';reference=data['id'];error=None
        elif 400<=response.status_code<500 and response.status_code not in (408,429):status='failed';error='provider_rejected'
    except (requests.RequestException,ValueError):pass
    with transaction() as c:
        query(c,'UPDATE notifications SET status=:status,last_error=:error,provider_reference=:ref WHERE id=:id',id=notification_id,status=status,error=error,ref=reference)
        audit(c,None,'onesignal_push_recorded',notification_id,{'status':status})
    if status=='unknown':raise DomainError('onesignal_retry_pending','Original push request needs idempotent recovery.',503)
