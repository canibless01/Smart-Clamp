from functools import wraps
from datetime import datetime,timezone
import re,hashlib
from flask import Blueprint,request,jsonify,g,current_app
from .db import transaction,one,rows,query,DomainError,audit,json_text,uuid_string
from .providers import auth_request
bp=Blueprint('live_auth',__name__)
PUBLIC_ROLES={'tenant','landlord','homeowner','agent','referrer'}

def authenticated(fn):
    @wraps(fn)
    def wrapper(*args,**kwargs):
        header=request.headers.get('Authorization','')
        if not header.startswith('Bearer '):raise DomainError('unauthorized','Please log in to continue.',401)
        user=auth_request('user',token=header[7:])
        with transaction() as c:p=one(c,'SELECT * FROM profiles WHERE id=:id',id=uuid_string(user.get('id')))
        if not p:raise DomainError('profile_required','Your account profile is incomplete. Please contact support.',403)
        g.actor=dict(p);g.actor['id']=str(p['id']);g.access_token=header[7:]
        return fn(*args,**kwargs)
    return wrapper

def staff(*roles):
    if g.actor['role'] not in roles:raise DomainError('forbidden','This action is not available in your workspace.',403)

def session_response(data,c):
    user=data.get('user') or {};uid=user.get('id')
    if not data.get('access_token') or not uid:raise DomainError('verification_required','Confirm your phone number before logging in.',403)
    p=one(c,'SELECT id,role,subscription_tier FROM profiles WHERE id=:id',id=uid)
    if not p:raise DomainError('profile_required','A profile is required for this account.',403)
    return {**{k:data[k] for k in('access_token','refresh_token','expires_in') if k in data},'user_id':str(p['id']),'role':p['role'],'subscription_tier':p['subscription_tier']}

@bp.post('/api/v1/auth/signup')
def signup():
    d=request.get_json() or {};phone=str(d.get('phone','')).replace(' ','');role=d.get('role','tenant');name=str(d.get('full_name','')).strip()
    if role not in PUBLIC_ROLES:raise DomainError('forbidden','Professional or utility roles require an invitation.',403)
    if not re.fullmatch(r'\+[1-9]\d{7,14}',phone) or len(d.get('password',''))<8 or not name:raise DomainError('validation_error','A full name, international phone number and password of at least 8 characters are required.')
    with transaction() as c:
        if one(c,'SELECT id FROM profiles WHERE phone=:phone',phone=phone):raise DomainError('conflict','This phone is already registered.',409)
    result=auth_request('signup','POST',{'phone':phone,'password':d['password'],'data':{'full_name':name}})
    user=result.get('user') or result;uid=uuid_string(user.get('id'))
    with transaction() as c:
        query(c,'INSERT INTO profiles(id,phone,full_name,role) VALUES(:id,:phone,:name,:role) ON CONFLICT(id) DO NOTHING',id=uid,phone=phone,name=name,role=role)
        audit(c,uid,'account_created',uid)
        if result.get('access_token'):return jsonify(session_response(result,c))
    return jsonify(status='verification_required',phone=phone),202

@bp.post('/api/v1/auth/verify')
def verify_phone():
    d=request.get_json() or {}
    if not re.fullmatch(r'\d{6,10}',str(d.get('code',''))):raise DomainError('validation_error','Enter the verification code sent to your phone.')
    result=auth_request('verify','POST',{'phone':d.get('phone'),'token':d['code'],'type':'sms'})
    with transaction() as c:return jsonify(session_response(result,c))

@bp.post('/api/v1/auth/login')
def login():
    d=request.get_json() or {}
    if not d.get('phone') or not d.get('password'):raise DomainError('unauthorized','Phone and password are required.',401)
    result=auth_request('token?grant_type=password','POST',{'phone':d['phone'].replace(' ',''),'password':d['password']})
    with transaction() as c:return jsonify(session_response(result,c))

@bp.post('/api/v1/auth/refresh')
def refresh():
    d=request.get_json() or {}
    if not d.get('refresh_token'):raise DomainError('unauthorized','A refresh token is required.',401)
    result=auth_request('token?grant_type=refresh_token','POST',{'refresh_token':d['refresh_token']})
    with transaction() as c:return jsonify(session_response(result,c))

@bp.post('/api/v1/auth/logout')
@authenticated
def logout():
    auth_request('logout','POST',token=g.access_token)
    return jsonify(status='logged_out')

@bp.post('/api/v1/auth/recovery')
def recovery():
    d=request.get_json() or {};email=d.get('email') or d.get('phone_or_email','')
    if '@' not in email:raise DomainError('phone_recovery_required','For phone accounts, request a sign-in code through the phone verification flow.',422)
    auth_request('recover','POST',{'email':email})
    return jsonify(status='accepted')

@bp.get('/api/v1/users/me/context')
@authenticated
def context():
    from .live_resources import projection
    with transaction() as c: result=projection(c)
    result['authorized_context']={k:g.actor[k] for k in('id','role','full_name','phone','subscription_tier')}
    return jsonify(result)

@bp.route('/api/v1/users/me/preferences',methods=['GET','PATCH'])
@authenticated
def preferences():
    with transaction() as c:
        if request.method=='PATCH':
            d=request.get_json() or {};allowed={'language','email_enabled','sms_enabled','push_enabled','theme'}
            if set(d)-allowed:raise DomainError('validation_error','Unknown preference field.')
            query(c,"INSERT INTO user_preferences(user_id,value) VALUES(:id,CAST(:v AS jsonb)) ON CONFLICT(user_id) DO UPDATE SET value=user_preferences.value||excluded.value,version=user_preferences.version+1,updated_at=now()",id=g.actor['id'],v=json_text(d))
        p=one(c,'SELECT value,version FROM user_preferences WHERE user_id=:id',id=g.actor['id'])
        return jsonify(dict(p) if p else {'value':{},'version':0})

@bp.patch('/api/v1/users/me/report-preferences')
@authenticated
def report_preferences():
    d=request.get_json() or {}
    if type(d.get('auto_delivery_enabled')) is not bool or d.get('frequency','monthly') not in('monthly',):raise DomainError('validation_error','Choose monthly delivery on or off.')
    with transaction() as c:
        query(c,'INSERT INTO report_preferences(user_id,auto_delivery_enabled,frequency) VALUES(:id,:active,:freq) ON CONFLICT(user_id) DO UPDATE SET auto_delivery_enabled=excluded.auto_delivery_enabled,frequency=excluded.frequency',id=g.actor['id'],active=d['auto_delivery_enabled'],freq=d.get('frequency','monthly'))
    return jsonify(status='updated')

@bp.get('/api/v1/users/me/subscription')
@authenticated
def subscription():
    with transaction() as c:
        s=one(c,'SELECT * FROM subscriptions WHERE user_id=:id ORDER BY updated_at DESC LIMIT 1',id=g.actor['id'])
        return jsonify(dict(s) if s else {'plan':'free','status':'not_subscribed','version':0})

@bp.patch('/api/v1/users/me/subscription')
@authenticated
def upgrade():
    raise DomainError('subscription_checkout_unavailable','Paid subscription pricing and the provider plan must be configured before upgrading.',503)

@bp.post('/api/v1/users/me/subscription/cancel')
@authenticated
def cancel():
    # Never pretend provider recurring billing has stopped.
    raise DomainError('subscription_provider_required','Cancellation requires the linked subscription provider. Contact support if you have an active charge.',503)

@bp.post('/api/v1/auth/step-up/challenges')
@authenticated
def challenge():
    d=request.get_json() or {};ids=d.get('scope_ids') or []
    if not ids or len(ids)>20 or not re.fullmatch('[0-9a-f]{64}',str(d.get('operation_hash',''))):raise DomainError('validation_error','An operation hash and device scope are required.')
    from .db import device
    with transaction() as c:
        for did in ids:device(c,g.actor,did,write=True)
        recent=one(c,"SELECT id FROM step_up_challenges WHERE user_id=:uid AND created_at>now()-interval '60 seconds'",uid=g.actor['id'])
        if recent:raise DomainError('rate_limited','Wait a minute before requesting another confirmation code.',429)
    auth_request('otp','POST',{'phone':g.actor['phone'],'should_create_user':False})
    with transaction() as c:
        row=one(c,'INSERT INTO step_up_challenges(user_id,operation_hash,scope_ids) VALUES(:uid,:hash,CAST(:ids AS uuid[])) RETURNING id,expires_at',uid=g.actor['id'],hash=d['operation_hash'],ids=ids)
    return jsonify({**dict(row),'status':'code_sent'}),201

@bp.post('/api/v1/auth/step-up/challenges/<challenge_id>/verify')
@authenticated
def confirm(challenge_id):
    d=request.get_json() or {}
    with transaction() as c:
        ch=one(c,"UPDATE step_up_challenges SET attempts=attempts+1 WHERE id=:id AND user_id=:uid AND expires_at>now() AND attempts<5 AND used_at IS NULL RETURNING *",id=uuid_string(challenge_id),uid=g.actor['id'])
    if not ch:raise DomainError('challenge_expired','Request a fresh confirmation code.',401)
    result=auth_request('verify','POST',{'phone':g.actor['phone'],'token':str(d.get('code','')),'type':'sms'})
    if result.get('user',{}).get('id')!=g.actor['id']:raise DomainError('unauthorized','Confirmation does not match this account.',401)
    with transaction() as c:query(c,'UPDATE step_up_challenges SET verified_at=now() WHERE id=:id AND used_at IS NULL',id=challenge_id)
    return jsonify(id=challenge_id,status='verified')

@bp.post('/api/v1/auth/recovery/phone')
def phone_recovery():
    d=request.get_json() or {};phone=str(d.get('phone','')).replace(' ','')
    if not re.fullmatch(r'\+[1-9]\d{7,14}',phone):raise DomainError('validation_error','Enter your phone with its country code.')
    auth_request('otp','POST',{'phone':phone,'should_create_user':False})
    return jsonify(status='code_requested'),202

@bp.post('/api/v1/auth/recovery/complete')
def complete_phone_recovery():
    d=request.get_json() or {}
    if not isinstance(d.get('password'),str) or len(d['password'])<8 or not re.fullmatch(r'\d{6,10}',str(d.get('code',''))):raise DomainError('validation_error','A verification code and password of at least 8 characters are required.')
    result=auth_request('verify','POST',{'phone':d.get('phone'),'token':str(d['code']),'type':'sms'})
    if not result.get('access_token'):raise DomainError('verification_required','Phone verification is required.',401)
    with transaction() as c:
        if not one(c,'SELECT id FROM profiles WHERE id=:id',id=uuid_string(result.get('user',{}).get('id'))):raise DomainError('profile_required','Contact support to complete your account profile.',403)
    auth_request('user','PUT',{'password':d['password']},token=result['access_token'])
    auth_request('logout','POST',token=result['access_token'])
    return jsonify(status='password_updated')
