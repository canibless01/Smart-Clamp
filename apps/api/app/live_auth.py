from functools import wraps
from datetime import datetime,timezone
import re,hashlib
from urllib.parse import urlencode,urlparse
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
        if not p or not p['onboarding_completed_at']:raise DomainError('profile_required','Complete your account profile and accept the terms to continue.',403)
        g.actor=dict(p);g.actor['id']=str(p['id']);g.access_token=header[7:]
        return fn(*args,**kwargs)
    return wrapper

def staff(*roles):
    if g.actor['role'] not in roles:raise DomainError('forbidden','This action is not available in your workspace.',403)

def legal_versions():
    return {'terms_version':current_app.config.get('LEGAL_TERMS_VERSION') or 'preview-2026-11-13',
            'privacy_version':current_app.config.get('LEGAL_PRIVACY_VERSION') or 'preview-2026-11-13'}

def require_consent(d):
    versions=legal_versions()
    if d.get('accepted_terms') is not True or any(d.get(k)!=v for k,v in versions.items()):
        raise DomainError('consent_required','Read and explicitly accept the current terms and privacy policy.')
    return versions

def record_consent(c,uid,d):
    versions=require_consent(d)
    query(c,'INSERT INTO account_consents(user_id,terms_version,privacy_version) VALUES(:uid,:terms_version,:privacy_version) ON CONFLICT DO NOTHING',uid=uid,**versions)

def identity():
    header=request.headers.get('Authorization','')
    if not header.startswith('Bearer '):raise DomainError('unauthorized','Please log in to continue.',401)
    return auth_request('user',token=header[7:]),header[7:]

def verified_contacts(user):
    phone=user.get('phone') if user.get('phone_confirmed_at') else None
    if phone and not phone.startswith('+'):phone='+'+phone
    email=str(user.get('email','')).strip().lower() if user.get('email_confirmed_at') else None
    return phone,email or None

def session_response(data,c):
    user=data.get('user') or {};uid=user.get('id')
    if not data.get('access_token') or not uid:raise DomainError('verification_required','Verify your email or phone before logging in.',403)
    p=one(c,'SELECT id,role,subscription_tier,onboarding_completed_at FROM profiles WHERE id=:id',id=uid)
    return {**{k:data[k] for k in('access_token','refresh_token','expires_in') if k in data},
            'user_id':uid,'role':p['role'] if p else None,'subscription_tier':p['subscription_tier'] if p else 'free',
            'onboarding_required':not p or not p['onboarding_completed_at']}

@bp.get('/api/v1/auth/options')
def auth_options():
    settings=auth_request('settings');external=settings.get('external') or {}
    return jsonify(**legal_versions(),email_enabled=bool(external.get('email')),phone_enabled=bool(external.get('phone')),google_enabled=bool(external.get('google')))

@bp.post('/api/v1/auth/signup')
def signup():
    d=request.get_json() or {};phone=str(d.get('phone','')).replace(' ','');email=str(d.get('email','')).strip().lower();role=d.get('role','tenant');name=str(d.get('full_name','')).strip()
    if role not in PUBLIC_ROLES:raise DomainError('forbidden','Professional or utility roles require an invitation.',403)
    require_consent(d)
    if bool(phone)==bool(email) or (phone and not re.fullmatch(r'\+[1-9]\d{7,14}',phone)) or (email and not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',email)) or not isinstance(d.get('password'),str) or len(d['password'])<8 or not 1<=len(name)<=160:
        raise DomainError('validation_error','Enter a name, one email or international phone number, and a password of at least 8 characters.')
    contact={'phone':phone} if phone else {'email':email}
    result=auth_request('signup','POST',{**contact,'password':d['password'],'data':{'full_name':name}})
    user=result.get('user') or result;uid=uuid_string(user.get('id'))
    # Supabase may intentionally obscure an already registered identity. Never
    # modify its profile, role or consent unless a session proves ownership.
    with transaction() as c:
        existing=one(c,'SELECT id FROM profiles WHERE id=:id',id=uid)
        if not existing:
            query(c,'INSERT INTO profiles(id,phone,email,full_name,role,onboarding_completed_at) VALUES(:id,:phone,:email,:name,:role,now())',id=uid,phone=phone or None,email=email or None,name=name,role=role)
            record_consent(c,uid,d);audit(c,uid,'account_created',uid)
        if result.get('access_token'):return jsonify(session_response(result,c))
    return jsonify(status='verification_required',**contact),202

@bp.post('/api/v1/auth/verify')
def verify_phone():
    d=request.get_json() or {}
    if not re.fullmatch(r'\d{6,10}',str(d.get('code',''))):raise DomainError('validation_error','Enter the verification code sent to your email or phone.')
    contact={'email':str(d['email']).strip().lower()} if d.get('email') else {'phone':d.get('phone')}
    result=auth_request('verify','POST',{**contact,'token':d['code'],'type':'signup' if d.get('email') else 'sms'})
    with transaction() as c:return jsonify(session_response(result,c))

@bp.post('/api/v1/auth/login')
def login():
    d=request.get_json() or {};email=str(d.get('email','')).strip().lower();phone=str(d.get('phone','')).replace(' ','')
    if bool(email)==bool(phone) or not d.get('password'):raise DomainError('unauthorized','Enter your email or phone and password.',401)
    result=auth_request('token?grant_type=password','POST',{**({'email':email} if email else {'phone':phone}),'password':d['password']})
    with transaction() as c:return jsonify(session_response(result,c))

@bp.route('/api/v1/auth/onboarding',methods=['GET','POST'])
def onboarding():
    user,token=identity();uid=uuid_string(user.get('id'));phone,email=verified_contacts(user)
    with transaction() as c:
        p=one(c,'SELECT * FROM profiles WHERE id=:id FOR UPDATE',id=uid)
        if request.method=='GET':
            return jsonify(full_name=p['full_name'] if p else (user.get('user_metadata') or {}).get('full_name',''),role=p['role'] if p else None,email=email,phone=phone,**legal_versions())
        d=request.get_json() or {};require_consent(d);name=str(d.get('full_name','')).strip();role=d.get('role','homeowner')
        if not 1<=len(name)<=160:raise DomainError('validation_error','Enter your full name.')
        if not phone and not email:raise DomainError('verification_required','Verify an email or phone with your sign-in provider.',403)
        if not p and role not in PUBLIC_ROLES:raise DomainError('forbidden','This account type requires an invitation.',403)
        if p:
            # Existing trusted roles are immutable through public onboarding.
            query(c,'UPDATE profiles SET full_name=:name,phone=:phone,email=:email,onboarding_completed_at=now(),updated_at=now() WHERE id=:id',id=uid,name=name,phone=phone,email=email)
        else:
            query(c,'INSERT INTO profiles(id,full_name,role,phone,email,onboarding_completed_at) VALUES(:id,:name,:role,:phone,:email,now())',id=uid,name=name,role=role,phone=phone,email=email)
        record_consent(c,uid,d);audit(c,uid,'account_onboarding_completed',uid)
        p=one(c,'SELECT role FROM profiles WHERE id=:id',id=uid)
    return jsonify(status='completed',role=p['role'])

@bp.post('/api/v1/auth/oauth/start')
def oauth_start():
    d=request.get_json() or {};challenge=d.get('code_challenge','');flow=d.get('flow_id','')
    if not re.fullmatch(r'[A-Za-z0-9_-]{43}',str(challenge)) or not re.fullmatch(r'[a-f0-9]{64}',str(flow)):raise DomainError('validation_error','A fresh PKCE sign-in request is required.')
    if not (auth_request('settings').get('external') or {}).get('google'):raise DomainError('google_not_configured','Google sign-in has not been enabled by the operator.',503)
    origin=current_app.config.get('APP_ORIGIN','').rstrip('/');parsed=urlparse(origin)
    if parsed.scheme!='https' or not parsed.netloc or parsed.path or parsed.query or parsed.fragment:
        if not(current_app.testing and parsed.scheme=='http' and parsed.hostname in ('localhost','127.0.0.1')):raise DomainError('invalid_provider_configuration','A fixed HTTPS application origin is required.',503)
    base=(current_app.config.get('SUPABASE_AUTH_URL') or current_app.config.get('SUPABASE_URL','').rstrip('/')+'/auth/v1').rstrip('/')
    if urlparse(base).scheme!='https' and not current_app.testing:raise DomainError('invalid_provider_configuration','Google sign-in requires HTTPS authentication.',503)
    params={'provider':'google','code_challenge':challenge,'code_challenge_method':'s256','redirect_to':origin+'/auth/callback?flow_id='+flow}
    return jsonify(url=base+'/authorize?'+urlencode(params))

@bp.post('/api/v1/auth/oauth/exchange')
def oauth_exchange():
    d=request.get_json() or {};code=d.get('code','');verifier=d.get('code_verifier','')
    if not isinstance(code,str) or not 1<=len(code)<=4096 or not re.fullmatch(r'[A-Za-z0-9._~-]{43,128}',str(verifier)):raise DomainError('validation_error','The Google sign-in request is incomplete or expired.')
    result=auth_request('token?grant_type=pkce','POST',{'auth_code':code,'code_verifier':verifier})
    with transaction() as c:return jsonify(session_response(result,c))

@bp.post('/api/v1/auth/refresh')
def refresh():
    d=request.get_json() or {}
    if not d.get('refresh_token'):raise DomainError('unauthorized','A refresh token is required.',401)
    result=auth_request('token?grant_type=refresh_token','POST',{'refresh_token':d['refresh_token']})
    with transaction() as c:return jsonify(session_response(result,c))

@bp.post('/api/v1/auth/logout')
def logout():
    user,token=identity()
    auth_request('logout','POST',token=token)
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
    result['authorized_context']={k:g.actor[k] for k in('id','role','full_name','phone','email','subscription_tier')}
    return jsonify(result)

@bp.route('/api/v1/users/me/preferences',methods=['GET','PATCH'])
@authenticated
def preferences():
    with transaction() as c:
        if request.method=='PATCH':
            d=request.get_json() or {};allowed={'language','email_enabled','sms_enabled','push_enabled','utility_notices_enabled','theme'}
            if set(d)-allowed:raise DomainError('validation_error','Unknown preference field.')
            for key in ('email_enabled','sms_enabled','push_enabled','utility_notices_enabled'):
                if key in d and type(d[key]) is not bool:raise DomainError('validation_error','Notification preferences require explicit booleans.')
            if d.get('sms_enabled') is True and not g.actor.get('phone'):raise DomainError('phone_verification_required','Verify a phone before enabling SMS.',409)
            if 'language' in d and d['language']!='en':raise DomainError('validation_error','This language is not supported yet.')
            if 'theme' in d and d['theme'] not in ('light','dark','system'):raise DomainError('validation_error','Choose a supported theme.')
            query(c,"INSERT INTO user_preferences(user_id,value) VALUES(:id,CAST(:v AS jsonb)) ON CONFLICT(user_id) DO UPDATE SET value=user_preferences.value||excluded.value,version=user_preferences.version+1,updated_at=now()",id=g.actor['id'],v=json_text(d))
        p=one(c,'SELECT value,version FROM user_preferences WHERE user_id=:id',id=g.actor['id'])
        from .notifications import sms_configured
        from .web_push import configured as push_configured
        return jsonify({**(dict(p) if p else {'value':{},'version':0}),
                        'notification_channels':{'sms':bool(sms_configured()),'email':False,'push':bool(push_configured())}})

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
    if not g.actor.get('phone'):raise DomainError('phone_verification_required','Verify a security phone in Settings first.',409)
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
    contact={'email':str(d['email']).strip().lower()} if d.get('email') else {'phone':d.get('phone')}
    result=auth_request('verify','POST',{**contact,'token':str(d['code']),'type':'recovery' if d.get('email') else 'sms'})
    if not result.get('access_token'):raise DomainError('verification_required','Phone verification is required.',401)
    with transaction() as c:
        if not one(c,'SELECT id FROM profiles WHERE id=:id',id=uuid_string(result.get('user',{}).get('id'))):raise DomainError('profile_required','Contact support to complete your account profile.',403)
    auth_request('user','PUT',{'password':d['password']},token=result['access_token'])
    auth_request('logout','POST',token=result['access_token'])
    return jsonify(status='password_updated')

@bp.post('/api/v1/auth/phone/enroll')
@authenticated
def enroll_phone():
    d=request.get_json() or {};phone=str(d.get('phone','')).replace(' ','')
    if not re.fullmatch(r'\+[1-9]\d{7,14}',phone):raise DomainError('validation_error','Enter your phone with its country code.')
    if g.actor['phone']:raise DomainError('phone_already_bound','Changing an existing security phone requires account recovery support.',409)
    user=auth_request('user',token=g.access_token)
    try:recent=(datetime.now(timezone.utc)-datetime.fromisoformat(user['last_sign_in_at'].replace('Z','+00:00'))).total_seconds()
    except (KeyError,ValueError,TypeError):recent=601
    if not 0<=recent<=600:raise DomainError('recent_signin_required','Log in again before adding a security phone.',403)
    auth_request('user','PUT',{'phone':phone},token=g.access_token)
    return jsonify(status='verification_required'),202

@bp.post('/api/v1/auth/phone/verify')
@authenticated
def verify_enrolled_phone():
    d=request.get_json() or {};phone=str(d.get('phone','')).replace(' ','')
    if g.actor['phone']:raise DomainError('phone_already_bound','A security phone is already registered.',409)
    if not re.fullmatch(r'\+[1-9]\d{7,14}',phone) or not re.fullmatch(r'\d{6,10}',str(d.get('code',''))):raise DomainError('validation_error','Enter the phone number and verification code.')
    result=auth_request('verify','POST',{'phone':phone,'token':str(d['code']),'type':'phone_change'},token=g.access_token)
    user=result.get('user') or {};verified,email=verified_contacts(user)
    if user.get('id')!=g.actor['id'] or verified!=phone:raise DomainError('unauthorized','The verification does not belong to this account.',401)
    with transaction() as c:
        query(c,'UPDATE profiles SET phone=:phone,updated_at=now() WHERE id=:id AND phone IS NULL',phone=verified,id=g.actor['id'])
        audit(c,g.actor['id'],'security_phone_verified',g.actor['id'])
    return jsonify(status='verified')
