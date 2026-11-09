from flask import Blueprint, request, jsonify
from .. import require_auth, api_error
import uuid, hashlib, secrets

bp = Blueprint('devices', __name__)

@bp.route('/api/v1/devices/register', methods=['POST'])
def register_device():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    if auth['role'] not in ('installer','internal_ops','internal_superadmin','landlord'):
        return api_error('forbidden','Only installer/internal_ops',403)
    data = request.get_json(force=True) or {}
    role = data.get('role')
    has_relay = data.get('has_relay',False)
    has_voltage_sensor = data.get('has_voltage_sensor',False)
    if role not in ('transformer_monitor','pole_gateway','pole_device','house_full','building_hub','ir_reader'):
        return api_error('validation_error','invalid role',400)
    did = str(uuid.uuid4())
    raw_key = secrets.token_hex(32)  # 256-bit hex
    from flask import current_app
    current_app.stores['devices'][did]={'device_id':did,'role':role,'has_relay':has_relay,'has_voltage_sensor':has_voltage_sensor,'owner_id':auth['sub']}
    return jsonify({'device_id':did,'device_hmac_key_raw':raw_key})

@bp.route('/api/v1/devices/<device_id>', methods=['GET'])
def get_device(device_id):
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    from flask import current_app
    dev = current_app.stores['devices'].get(device_id)
    if not dev: return api_error('not_found','Device not found',404)
    # projection
    return jsonify({
        'id':device_id,
        'profile':dev['role'],
        'capabilities': ['metering','relay'] if dev['has_relay'] else ['metering'],
        'config_epoch':1,
        'calibration_status':'qualified',
        'last_seen_at':'2026-11-09T12:00:00Z',
        'projection':{
            'snapshot_version':1,
            'generated_at':'2026-11-09T12:00:00Z',
            'authorized_context':{'user_id':auth['sub']},
            'devices':[{'id':device_id,'role':dev['role'],'capabilities':['metering'],'supply_state':'present','connectivity':'online','relay':{'requested':False,'observed':False,'observed_at':'2026-11-09T12:00:00Z','pending_command_id':None,'off_reasons':[]},'measurement':{'value':1240,'unit':'W','observed_at':'2026-11-09T12:00:00Z','quality':'verified','coverage':'98%'},'wallet':{'available':500000,'reserved':0,'unit':'kobo','ledger_version':1}}],
            'allowed_actions':['view','recharge'] + (['relay_toggle'] if dev['has_relay'] else [])
        }
    })

@bp.route('/api/v1/devices/<device_id>/relay', methods=['POST'])
def relay_toggle(device_id):
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    from flask import current_app
    dev = current_app.stores['devices'].get(device_id)
    if not dev: return api_error('not_found','Device not found',404)
    if not dev['has_relay']:
        return api_error('validation_error','Device has no relay',400)
    data = request.get_json(force=True) or {}
    state = data.get('state')
    if state not in ('on','off'):
        return api_error('validation_error','state must be on/off',400)
    # Check OFF reasons: protection, wallet_zero, budget, schedule, manual, maintenance, utility
    # Demo: if supply lost, reject
    # Simulate step-up required
    command_token_id = str(uuid.uuid4())
    current_app.stores['commands'][command_token_id]={'device_id':device_id,'state':state,'status':'pending_customer_confirmation','requester':auth['sub']}
    return jsonify({'status':'pending_customer_confirmation','command_token_id':command_token_id})

@bp.route('/api/v1/commands/<command_token_id>/confirm', methods=['POST'])
def confirm_command(command_token_id):
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    from flask import current_app
    cmd = current_app.stores['commands'].get(command_token_id)
    if not cmd: return api_error('not_found','Command not found',404)
    data = request.get_json(force=True) or {}
    if not data.get('otp_code'):
        return api_error('validation_error','otp_code required',400)
    cmd['status']='pending_delivery'
    return jsonify({'status':'pending_delivery'})

@bp.route('/api/v1/devices/<device_id>/schedules', methods=['POST','GET'])
def schedules(device_id):
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    if request.method=='GET':
        return jsonify({'items':[],'next_cursor':None})
    data = request.get_json(force=True) or {}
    if not data.get('days_of_week') or not data.get('on_time') or not data.get('off_time'):
        return api_error('validation_error','days_of_week/on_time/off_time required',400)
    sid = str(uuid.uuid4())
    return jsonify({'schedule_id':sid})

@bp.route('/api/v1/schedules/<schedule_id>', methods=['PATCH','DELETE'])
def schedule_modify(schedule_id):
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'id':schedule_id,'status':'updated'})

@bp.route('/api/v1/devices/<device_id>/budget', methods=['POST'])
def budget(device_id):
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    data = request.get_json(force=True) or {}
    limit = data.get('monthly_limit_naira')
    if limit is None: return api_error('validation_error','monthly_limit_naira required',400)
    daily = round(limit/30,2)
    return jsonify({'daily_limit_units':daily})

@bp.route('/api/v1/devices/<device_id>/viewers', methods=['POST','GET'])
def viewers(device_id):
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    if request.method=='GET':
        return jsonify({'items':[],'next_cursor':None})
    data = request.get_json(force=True) or {}
    if not data.get('viewer_phone'):
        return api_error('validation_error','viewer_phone required',400)
    return jsonify({'id':str(uuid.uuid4()),'status':'viewer_added'})

@bp.route('/api/v1/devices/<device_id>/viewers/<viewer_id>', methods=['DELETE'])
def remove_viewer(device_id, viewer_id):
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'id':viewer_id,'status':'revoked'})

@bp.route('/api/v1/devices/<device_id>/commission', methods=['POST'])
def commission(device_id):
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    data = request.get_json(force=True) or {}
    if not data.get('profile'):
        return api_error('validation_error','profile required',400)
    from flask import current_app
    dev = current_app.stores['devices'].get(device_id)
    if dev:
        dev['install_state']='commissioned'
    return jsonify({'id':device_id,'status':'commissioned'})

@bp.route('/api/v1/devices/<device_id>/events', methods=['GET'])
def device_events(device_id):
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'items':[],'next_cursor':None,'snapshot_version':1})

@bp.route('/api/v1/devices/<device_id>/commands', methods=['GET'])
def device_commands(device_id):
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'items':[],'next_cursor':None})

@bp.route('/api/v1/devices/<device_id>/recommendations', methods=['GET'])
def recommendations(device_id):
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify([{'id':str(uuid.uuid4()),'recommendation_text':'Shift usage to 22:00-06:00 to save ₦800/mo.','estimated_savings_naira':800}])

@bp.route('/api/v1/recommendations/<recommendation_id>/dismiss', methods=['POST'])
def dismiss_rec(recommendation_id):
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'id':recommendation_id,'status':'dismissed'})

@bp.route('/api/v1/meters/link', methods=['POST'])
def link_meter():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    data = request.get_json(force=True) or {}
    meter = data.get('meter_number','')
    if not meter: return api_error('validation_error','meter_number required',400)
    # simulate live check
    if meter.startswith('999'):
        return jsonify({'linked_meter_id':None,'status':'link_failed','reason':'meter_unreachable'})
    return jsonify({'linked_meter_id':str(uuid.uuid4()),'status':'link_confirmed_live'})

@bp.route('/api/v1/meters/<linked_meter_id>/manual-reading', methods=['POST'])
def manual_reading(linked_meter_id):
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'status':'manual_reading_recorded'})

@bp.route('/api/v1/devices/<device_id>/provenance', methods=['GET'])
def provenance(device_id):
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'device_id':device_id,'history':[]})
