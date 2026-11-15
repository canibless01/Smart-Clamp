"""Signed Resend/Svix feedback, bounded replay protection and minimal event storage."""
import base64,hashlib,hmac,json,re,time,uuid
from datetime import datetime,timezone,timedelta
from cryptography.fernet import Fernet,InvalidToken
from flask import Blueprint,current_app,request,jsonify
from .db import transaction,one,rows,query,DomainError,audit
from .providers import config
bp=Blueprint('email_receipts',__name__)
STATES={'email.sent':'sent','email.delivery_delayed':'delayed','email.delivered':'delivered','email.failed':'failed','email.suppressed':'suppressed','email.bounced':'bounced','email.complained':'complained'}
RANK={s:i for i,s in enumerate(('unknown','sent','delayed','delivered','failed','suppressed','bounced','complained'))}

def address_hash(address):
    return hmac.new(config('EMAIL_ENCRYPTION_KEY').encode(),address.strip().lower().encode(),hashlib.sha256).hexdigest()

def verify(raw,headers,secret,now=None):
    event_id=headers.get('svix-id','');stamp=headers.get('svix-timestamp','');signatures=headers.get('svix-signature','')
    if not re.fullmatch(r'[A-Za-z0-9_-]{1,200}',event_id) or not re.fullmatch(r'\d{1,12}',stamp) or len(signatures)>4096:raise DomainError('invalid_webhook','Invalid email webhook.',401)
    if abs((time.time() if now is None else now)-int(stamp))>300:raise DomainError('invalid_webhook','Email webhook timestamp is outside the accepted window.',401)
    if not isinstance(secret,str):raise DomainError('email_webhook_configuration','Restore the email webhook signing secret.',503)
    try:key=base64.b64decode(secret.removeprefix('whsec_'),validate=True)
    except (ValueError,TypeError):raise DomainError('email_webhook_configuration','Restore the email webhook signing secret.',503)
    if not 16<=len(key)<=128:raise DomainError('email_webhook_configuration','Restore the email webhook signing secret.',503)
    expected=base64.b64encode(hmac.new(key,(event_id+'.'+stamp+'.').encode()+raw,hashlib.sha256).digest()).decode()
    if not any(re.fullmatch(r'v1,[A-Za-z0-9+/]{43}=',part) and hmac.compare_digest(part[3:],expected) for part in signatures.split()):raise DomainError('invalid_webhook','Invalid email webhook signature.',401)
    return event_id

def dispatch(c,nid):
    return one(c,"SELECT n.id,n.status,n.provider_reference,e.* FROM notifications n JOIN email_dispatches e ON e.notification_id=n.id WHERE n.id=:id AND n.channel='email' AND e.provider='resend' FOR UPDATE OF n,e",id=nid)

def apply(c,event,n):
    if not n or not n['first_attempt_at']:return
    try:raw=Fernet(config('EMAIL_ENCRYPTION_KEY').encode()).decrypt(n['encrypted_request'].encode());payload=json.loads(raw)
    except (InvalidToken,ValueError):raise DomainError('email_decryption_failed','Restore the original email encryption key to reconcile delivery.',503)
    if hashlib.sha256(raw).hexdigest()!=n['request_sha256']:raise DomainError('email_integrity_failed','Email request integrity requires review.',503)
    disposition='matched'
    if event['recipient_hash']!=address_hash(payload['to'][0]):disposition='recipient_mismatch'
    elif n['provider_reference'] and n['provider_reference']!=event['provider_reference']:disposition='reference_mismatch'
    query(c,'UPDATE email_delivery_events SET notification_id=:id,disposition=:state WHERE event_id=:event',id=n['notification_id'],state=disposition,event=event['event_id'])
    if disposition!='matched':return
    state=STATES[event['event_type']]
    if RANK[state]>RANK[n['delivery_state']] or (state==n['delivery_state'] and (not n['delivery_event_at'] or event['occurred_at']>n['delivery_event_at'])):
        query(c,'UPDATE email_dispatches SET delivery_state=:state,delivery_event_at=:at WHERE notification_id=:id',id=n['notification_id'],state=state,at=event['occurred_at'])
    # Any signed outbound event proves the pinned provider request exists. No failover/resend.
    query(c,"UPDATE notifications SET status='provider_accepted',provider_reference=coalesce(provider_reference,:ref),last_error=NULL WHERE id=:id",id=n['notification_id'],ref=event['provider_reference'])
    if state in ('bounced','complained','suppressed'):
        query(c,'INSERT INTO email_suppressions(address_hash,reason,notification_id) VALUES(:hash,:reason,:id) ON CONFLICT(address_hash) DO NOTHING',hash=event['recipient_hash'],reason=state,id=n['notification_id'])
    audit(c,None,'email_delivery_event_applied',n['notification_id'],{'event_type':event['event_type'],'event_id':event['event_id']})

def reconcile(c,notification_id):
    n=dispatch(c,notification_id)
    if not n or not n['provider_reference']:return
    for event in rows(c,"SELECT * FROM email_delivery_events WHERE provider_reference=:ref AND disposition='unmatched' ORDER BY occurred_at,event_id FOR UPDATE",ref=n['provider_reference']):
        apply(c,event,dispatch(c,notification_id))

@bp.post('/api/v1/webhooks/resend')
def resend_receipt():
    raw=request.get_data();secret=config('RESEND_WEBHOOK_SECRET');eid=verify(raw,request.headers,secret)
    try:
        payload=json.loads(raw);kind=payload.get('type')
        if kind not in STATES:return jsonify(status='ignored_event')
        data=payload['data'];ref=str(uuid.UUID(data['email_id']));to=data['to']
        if not isinstance(to,list) or len(to)!=1 or not isinstance(to[0],str) or len(to[0])>254 or '@' not in to[0]:raise ValueError()
        occurred=datetime.fromisoformat(payload['created_at'].replace('Z','+00:00'))
        if not occurred.tzinfo or occurred>datetime.now(timezone.utc)+timedelta(minutes=5):raise ValueError()
        tags=data.get('tags') or {};tag=tags.get('smartclamp_dispatch')
        tag=str(uuid.UUID(tag)) if tag else None
    except (ValueError,TypeError,KeyError,AttributeError):raise DomainError('invalid_webhook_payload','Email webhook event fields are invalid.',400)
    digest=hashlib.sha256(raw).hexdigest()
    with transaction() as c:
        # Serialize the same event before resolving dispatch rows, consistent with worker locks.
        query(c,'SELECT pg_advisory_xact_lock(hashtext(:key))',key='resend-event:'+eid)
        previous=one(c,'SELECT * FROM email_delivery_events WHERE event_id=:id',id=eid)
        if previous:
            if previous['body_sha256']!=digest:raise DomainError('webhook_conflict','This email event ID already has different content.',409)
            if previous['disposition']!='unmatched':return jsonify(status='already_recorded')
        else:
            query(c,'INSERT INTO email_delivery_events(event_id,body_sha256,provider_reference,event_type,occurred_at,recipient_hash) VALUES(:id,:digest,:ref,:kind,:at,:hash)',id=eid,digest=digest,ref=ref,kind=kind,at=occurred,hash=address_hash(to[0]))
        matches=rows(c,"SELECT n.id FROM notifications n JOIN email_dispatches e ON e.notification_id=n.id WHERE n.channel='email' AND e.provider='resend' AND(n.provider_reference=:ref OR e.webhook_tag=CAST(:tag AS uuid))",ref=ref,tag=tag)
        if len(matches)>1:raise DomainError('webhook_conflict','The email event reference requires review.',409)
        if matches:apply(c,one(c,'SELECT * FROM email_delivery_events WHERE event_id=:id',id=eid),dispatch(c,matches[0]['id']))
    return jsonify(status='recorded')
