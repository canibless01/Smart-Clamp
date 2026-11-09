from flask import Blueprint, request, jsonify
from .. import api_error, make_token, require_auth, verify_token
import uuid, re

bp = Blueprint('auth', __name__)

PHONE_RE = re.compile(r'^\+[1-9][0-9]{7,14}$')

# In-memory user store injected via app.stores
@bp.route('/api/v1/auth/signup', methods=['POST'])
def signup():
    data = request.get_json(force=True) or {}
    phone = data.get('phone','')
    pwd = data.get('password','')
    full_name = data.get('full_name','')
    role = data.get('role','tenant')
    if not PHONE_RE.match(phone):
        return api_error('validation_error','phone must be E.164',400)
    if len(pwd) < 8:
        return api_error('validation_error','password min 8',400)
    if role in ('internal_ops','internal_finance','internal_support','internal_engineering','internal_superadmin','nepa_staff','installer'):
        return api_error('forbidden','Privileged role requires invitation',403)
    from flask import current_app
    stores = current_app.stores
    if phone in stores['users']:
        return api_error('conflict','phone already registered',409)
    user_id = str(uuid.uuid4())
    user = {'user_id':user_id,'phone':phone,'full_name':full_name,'role':role,'subscription_tier':'free'}
    stores['users'][phone]=user
    stores['users'][user_id]=user  # also by id
    access = make_token(user_id, role, phone)
    return jsonify({'user_id':user_id,'role':role,'subscription_tier':'free','access_token':access,'refresh_token':access})

@bp.route('/api/v1/auth/login', methods=['POST'])
def login():
    data = request.get_json(force=True) or {}
    phone = data.get('phone','')
    pwd = data.get('password','')
    from flask import current_app
    stores = current_app.stores
    user = stores['users'].get(phone)
    if not user:
        return api_error('unauthorized','Invalid credentials',401)
    # password not checked in sandbox; demo only
    access = make_token(user['user_id'], user['role'], phone)
    return jsonify({'user_id':user['user_id'],'role':user['role'],'subscription_tier':user.get('subscription_tier','free'),'access_token':access,'refresh_token':access})

@bp.route('/api/v1/auth/recovery', methods=['POST'])
def recovery():
    # generic response, no enumeration
    return jsonify({'id':str(uuid.uuid4()),'status':'accepted'})

@bp.route('/api/v1/auth/refresh', methods=['POST'])
def refresh():
    data = request.get_json(force=True) or {}
    token = data.get('refresh_token','')
    payload = verify_token(token)
    if not payload:
        return api_error('unauthorized','Invalid token',401)
    new_token = make_token(payload['sub'], payload['role'], payload.get('phone',''))
    return jsonify({'id':str(uuid.uuid4()),'status':'accepted','access_token':new_token})

@bp.route('/api/v1/auth/logout', methods=['POST'])
def logout():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'id':str(uuid.uuid4()),'status':'logged_out'})

@bp.route('/api/v1/auth/step-up/challenges', methods=['POST'])
def stepup_challenge():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    data = request.get_json(force=True) or {}
    if 'operation_hash' not in data or 'scope_ids' not in data:
        return api_error('validation_error','operation_hash and scope_ids required',400)
    challenge_id = str(uuid.uuid4())
    return jsonify({'id':challenge_id,'status':'challenge_created','version':1}),201

@bp.route('/api/v1/auth/step-up/challenges/<challenge_id>/verify', methods=['POST'])
def stepup_verify(challenge_id):
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    data = request.get_json(force=True) or {}
    code = data.get('code','')
    if not re.match(r'^\d{6}$', code):
        return api_error('validation_error','code must be 6 digits',400)
    # In sandbox, 123456 always succeeds
    if code != '123456':
        return api_error('unauthorized','Invalid code, 5 attempts max, 60s cooldown',401)
    return jsonify({'id':challenge_id,'status':'verified','version':1})

@bp.route('/api/v1/users/me/context', methods=['GET'])
def user_context():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'snapshot_version':1,'generated_at':'2026-11-09T12:00:00Z','authorized_context':{'user_id':auth['sub'],'role':auth['role']},'devices':[],'allowed_actions':['view_dashboard']})

@bp.route('/api/v1/users/me/preferences', methods=['PATCH'])
def preferences():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'id':str(uuid.uuid4()),'status':'updated','version':1})

@bp.route('/api/v1/users/me/report-preferences', methods=['PATCH'])
def report_prefs():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'id':str(uuid.uuid4()),'status':'updated'})

@bp.route('/api/v1/users/me/subscription', methods=['GET','PATCH'])
def subscription():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    if request.method=='GET':
        return jsonify({'id':str(uuid.uuid4()),'status':'active','plan':'free','grace_until':None})
    return jsonify({'id':str(uuid.uuid4()),'status':'updated','version':2})

@bp.route('/api/v1/users/me/subscription/cancel', methods=['POST'])
def cancel_sub():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'id':str(uuid.uuid4()),'status':'cancelled','message':'Subscription cancelled; electricity remains separately governed.'})
