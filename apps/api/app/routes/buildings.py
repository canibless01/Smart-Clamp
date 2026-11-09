from flask import Blueprint, request, jsonify
from .. import require_auth, api_error
import uuid, hashlib

bp = Blueprint('buildings', __name__)

@bp.route('/api/v1/buildings', methods=['POST'])
def create_building():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    if auth['role'] not in ('landlord','internal_superadmin','internal_ops'):
        return api_error('forbidden','Not a landlord',403)
    data = request.get_json(force=True) or {}
    name = data.get('name')
    address = data.get('address')
    meter_type = data.get('meter_type')
    if not name or not address or meter_type not in ('with_meter','no_meter'):
        return api_error('validation_error','name/address/meter_type required',400)
    # idempotency
    key = request.headers.get('Idempotency-Key')
    body_hash = hashlib.sha256(request.get_data()).hexdigest()
    from flask import current_app, g
    from . import check_idempotency, save_idempotency
    existing = check_idempotency(key, body_hash) if key else None
    if existing: return existing
    bid = str(uuid.uuid4())
    building = {'building_id':bid,'name':name,'address':address,'meter_type':meter_type,'landlord_id':auth['sub'],'region':'futa'}
    current_app.stores['buildings'][bid]=building
    resp = {'building_id':bid}
    if key: save_idempotency(key, body_hash, resp, 200)
    return jsonify(resp)

@bp.route('/api/v1/buildings', methods=['GET'])
def list_buildings():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    from flask import current_app
    items = [b for b in current_app.stores['buildings'].values() if b['landlord_id']==auth['sub'] or auth['role'].startswith('internal')]
    # pagination
    cursor = request.args.get('cursor')
    limit = min(max(int(request.args.get('limit',50)),1),100)
    return jsonify({'items':items[:limit],'next_cursor':None,'snapshot_version':1})

@bp.route('/api/v1/buildings/<building_id>/rooms', methods=['POST'])
def add_room(building_id):
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    from flask import current_app
    building = current_app.stores['buildings'].get(building_id)
    if not building: return api_error('not_found','Building not found',404)
    if building['landlord_id'] != auth['sub']:
        return api_error('forbidden','Not the owning landlord',403)
    data = request.get_json(force=True) or {}
    label = data.get('label')
    if not label: return api_error('validation_error','label required',400)
    rid = str(uuid.uuid4())
    room = {'room_id':rid,'building_id':building_id,'label':label,'invite_link':f'https://smartclamp.ng/invite/{rid}'}
    current_app.stores['rooms'][rid]=room
    return jsonify({'room_id':rid,'invite_link':room['invite_link']})

@bp.route('/api/v1/rooms/<room_id>/join', methods=['POST'])
def join_room(room_id):
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    from flask import current_app
    room = current_app.stores['rooms'].get(room_id)
    if not room: return api_error('not_found','Room not found',404)
    # Simulate already claimed
    if room.get('tenant_id'):
        return jsonify({'room_id':room_id,'device_id':room.get('device_id'),'status':'room_already_claimed'}),409
    room['tenant_id']=auth['sub']
    # create wallet
    wid = str(uuid.uuid4())
    current_app.stores['wallets'][wid]={'wallet_id':wid,'room_id':room_id,'available_kobo':500000,'reserved_kobo':0,'ledger_version':1}
    return jsonify({'room_id':room_id,'device_id':room.get('device_id'),'status':'joined'})

@bp.route('/api/v1/rooms/<room_id>/transfer', methods=['POST'])
def transfer_room(room_id):
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    from flask import current_app
    room = current_app.stores['rooms'].get(room_id)
    if not room: return api_error('not_found','Room not found',404)
    # revoke old tenant
    room['tenant_id']=None
    room['device_id']=None
    # new occupancy interval would be created; preserve history via old room copy
    return jsonify({'room_id':room_id,'invite_link':f'https://smartclamp.ng/invite/{room_id}'})

@bp.route('/api/v1/rooms/<room_id>/occupancies', methods=['GET'])
def occupancies(room_id):
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'items':[],'next_cursor':None})

@bp.route('/api/v1/rooms/<room_id>/invitations', methods=['POST'])
def create_invitation(room_id):
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    data = request.get_json(force=True) or {}
    return jsonify({'id':str(uuid.uuid4()),'status':'invitation_created'}),201

@bp.route('/api/v1/invitations/accept', methods=['POST'])
def accept_invitation():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'id':str(uuid.uuid4()),'status':'accepted'})

@bp.route('/api/v1/invitations/<invitation_id>', methods=['DELETE'])
def revoke_invitation(invitation_id):
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'id':invitation_id,'status':'revoked'})
