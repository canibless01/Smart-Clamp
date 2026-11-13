"""Private opt-in Web Push. Acceptance is not proof of handset display.

Commit uncertain intent before sending: never blindly resend after a crash or
unknown HTTP outcome. Browser lock-screen payloads contain no account data.
"""
import base64,hashlib,json,re
from urllib.parse import urlparse
import requests
from cryptography.fernet import Fernet,InvalidToken
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from flask import Blueprint,current_app,g,request,jsonify
from pywebpush import webpush,WebPushException
from .db import transaction,one,rows,query,json_text,DomainError,outbox,audit
from .providers import config
from .live_auth import authenticated

bp=Blueprint('web_push',__name__)
HOSTS={'fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'}
def configured():return current_app.config.get('WEB_PUSH_ENABLED')=='true' and all(current_app.config.get(k) for k in ('VAPID_PRIVATE_KEY_FILE','VAPID_SUBJECT','PUSH_ENCRYPTION_KEY'))

def public_key():
    with open(config('VAPID_PRIVATE_KEY_FILE'),'rb') as file:key=serialization.load_pem_private_key(file.read(),password=None)
    if not isinstance(key,ec.EllipticCurvePrivateKey) or not isinstance(key.curve,ec.SECP256R1):raise DomainError('push_configuration_invalid','Web Push requires its own P-256 VAPID key.',503)
    return base64.urlsafe_b64encode(key.public_key().public_bytes(serialization.Encoding.X962,serialization.PublicFormat.UncompressedPoint)).decode().rstrip('=')

def validate_subscription(d):
    if not isinstance(d,dict):raise DomainError('validation_error','A browser push subscription is required.')
    endpoint=d.get('endpoint','');keys=d.get('keys') or {}
    if not isinstance(endpoint,str) or len(endpoint)>4096:raise DomainError('validation_error','Invalid push endpoint.')
    try:
        parsed=urlparse(endpoint);port=parsed.port
    except ValueError:raise DomainError('validation_error','Invalid push endpoint.')
    local=current_app.testing and parsed.scheme=='http' and parsed.hostname=='127.0.0.1'
    if not local and (parsed.scheme!='https' or parsed.hostname not in HOSTS or port not in (None,443) or parsed.username or parsed.password or parsed.fragment):raise DomainError('validation_error','Unsupported browser push service.')
    try:
        def decode(value):
            if not isinstance(value,str) or not re.fullmatch(r'[A-Za-z0-9_-]+={0,2}',value):raise ValueError()
            return base64.urlsafe_b64decode(value+'='*((-len(value))%4))
        raw=decode(keys.get('p256dh'));auth=decode(keys.get('auth'))
        ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(),raw)
        if len(auth)!=16:raise ValueError()
    except (ValueError,TypeError,AttributeError):raise DomainError('validation_error','Invalid push encryption keys.')
    return {'endpoint':endpoint,'keys':{'p256dh':keys['p256dh'],'auth':keys['auth']}}

@bp.route('/api/v1/users/me/push-subscriptions',methods=['GET','POST','DELETE'])
@authenticated
def subscriptions():
    if request.method=='GET':
        with transaction() as c:items=rows(c,'SELECT id,created_at FROM push_subscriptions WHERE user_id=:id AND enabled',id=g.actor['id'])
        return jsonify(available=bool(configured()),vapid_public_key=public_key() if configured() else None,items=items)
    d=request.get_json() or {}
    if request.method=='DELETE':
        endpoint=d.get('endpoint','')
        if not isinstance(endpoint,str) or not 1<=len(endpoint)<=4096:raise DomainError('validation_error','A push endpoint is required.')
        with transaction() as c:query(c,'UPDATE push_subscriptions SET enabled=false,updated_at=now() WHERE endpoint_hash=:hash AND user_id=:uid',hash=hashlib.sha256(endpoint.encode()).hexdigest(),uid=g.actor['id'])
        return jsonify(status='disabled')
    if not configured():raise DomainError('push_not_configured','Web Push is awaiting provider configuration.',503)
    subscription=validate_subscription(d);digest=hashlib.sha256(subscription['endpoint'].encode()).hexdigest()
    encrypted=Fernet(config('PUSH_ENCRYPTION_KEY').encode()).encrypt(json_text(subscription).encode()).decode()
    with transaction() as c:
        prior=one(c,'SELECT user_id FROM push_subscriptions WHERE endpoint_hash=:hash FOR UPDATE',hash=digest)
        if prior and str(prior['user_id'])!=g.actor['id']:raise DomainError('push_account_conflict','Disable notifications from the previous account on this browser first.',409)
        row=one(c,'INSERT INTO push_subscriptions(user_id,endpoint_hash,encrypted_subscription) VALUES(:uid,:hash,:encrypted) ON CONFLICT(endpoint_hash) DO UPDATE SET enabled=true,encrypted_subscription=excluded.encrypted_subscription,updated_at=now() RETURNING id',uid=g.actor['id'],hash=digest,encrypted=encrypted)
        query(c,"INSERT INTO user_preferences(user_id,value) VALUES(:uid,CAST(:value AS jsonb)) ON CONFLICT(user_id) DO UPDATE SET value=user_preferences.value||excluded.value,version=user_preferences.version+1,updated_at=now()",uid=g.actor['id'],value=json_text({'push_enabled':True}))
        audit(c,g.actor['id'],'push_subscription_enabled',row['id'])
    return jsonify(id=row['id'],status='enabled'),201

def queue_push(c,uid,key,dedupe,episode):
    if not configured():return
    pref=one(c,'SELECT value FROM user_preferences WHERE user_id=:id',id=uid)
    if not pref or pref['value'].get('push_enabled') is not True:return
    subs=rows(c,'SELECT id FROM push_subscriptions WHERE user_id=:id AND enabled',id=uid)
    if not subs:return
    n=one(c,"INSERT INTO notifications(recipient_id,template_key,channel,status,payload,dedupe_key,episode_id) VALUES(:uid,:key,'push','queued','{}'::jsonb,:dedupe,:episode) ON CONFLICT(dedupe_key) DO NOTHING RETURNING id",uid=uid,key=key,dedupe='push:'+dedupe,episode=episode)
    if not n:return
    for sub in subs:
        delivery=one(c,'INSERT INTO push_deliveries(notification_id,subscription_id) VALUES(:nid,:sid) RETURNING id',nid=n['id'],sid=sub['id'])
        query(c,"INSERT INTO outbox(aggregate_type,aggregate_id,event_type,payload) VALUES('push_delivery',:id,'push_queued',CAST(:payload AS jsonb))",id=delivery['id'],payload=json_text({'delivery_id':str(delivery['id'])}))

class NoRedirectSession(requests.Session):
    def request(self,*args,**kwargs):
        kwargs['allow_redirects']=False
        return super().request(*args,**kwargs)

def process_push(delivery_id):
    with transaction() as c:
        d=one(c,"SELECT d.*,s.enabled,s.user_id,s.encrypted_subscription FROM push_deliveries d JOIN push_subscriptions s ON s.id=d.subscription_id WHERE d.id=:id FOR UPDATE OF d",id=delivery_id)
        if not d or d['status']!='queued':return
        pref=one(c,'SELECT value FROM user_preferences WHERE user_id=:id',id=d['user_id'])
        if not d['enabled'] or not pref or pref['value'].get('push_enabled') is not True:
            query(c,"UPDATE push_deliveries SET status='opted_out' WHERE id=:id",id=delivery_id)
            query(c,"UPDATE notifications SET status='failed' WHERE id=:id AND NOT EXISTS(SELECT 1 FROM push_deliveries WHERE notification_id=:id AND status IN('queued','unknown','provider_accepted'))",id=d['notification_id']);return
        if not configured():raise DomainError('push_not_configured','Web Push is not configured.',503)
        try:subscription=validate_subscription(json.loads(Fernet(config('PUSH_ENCRYPTION_KEY').encode()).decrypt(d['encrypted_subscription'].encode())))
        except (InvalidToken,ValueError):raise DomainError('push_configuration_invalid','Push subscription decryption requires the original key.',503)
        query(c,"UPDATE push_deliveries SET status='unknown',dispatched_at=now(),last_error='dispatch_outcome_unknown' WHERE id=:id",id=delivery_id)
        query(c,"UPDATE notifications SET status='unknown' WHERE id=:id",id=d['notification_id'])
    status='unknown';error='dispatch_outcome_unknown'
    try:
        with NoRedirectSession() as session:
            response=webpush(subscription_info=subscription,data=json_text({'id':str(d['notification_id'])}),vapid_private_key=config('VAPID_PRIVATE_KEY_FILE'),vapid_claims={'sub':config('VAPID_SUBJECT')},ttl=3600,timeout=20,requests_session=session)
        if response.status_code in (200,201,202):status='provider_accepted';error=None
    except WebPushException as exc:
        code=exc.response.status_code if exc.response is not None else None
        if code in (404,410):status='expired';error='subscription_expired'
        elif code is not None and 400<=code<500:status='failed';error='push_service_rejected'
    except (requests.RequestException,ValueError,TypeError):pass
    with transaction() as c:
        query(c,'UPDATE push_deliveries SET status=:status,last_error=:error WHERE id=:id',id=delivery_id,status=status,error=error)
        if status=='expired':query(c,'UPDATE push_subscriptions SET enabled=false,updated_at=now() WHERE id=:id',id=d['subscription_id'])
        pending=one(c,"SELECT id FROM push_deliveries WHERE notification_id=:id AND status='queued' LIMIT 1",id=d['notification_id'])
        if not pending:
            outcomes={r['status'] for r in rows(c,'SELECT status FROM push_deliveries WHERE notification_id=:id',id=d['notification_id'])}
            summary='unknown' if 'unknown' in outcomes else 'provider_accepted' if 'provider_accepted' in outcomes else 'failed'
            query(c,'UPDATE notifications SET status=:status WHERE id=:id',id=d['notification_id'],status=summary)
        audit(c,None,'push_dispatch_recorded',delivery_id,{'status':status})
