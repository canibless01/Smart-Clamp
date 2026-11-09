from flask import Blueprint, request, jsonify
from .. import require_auth, api_error
import uuid, re

bp = Blueprint('misc', __name__)

@bp.route('/api/v1/disputes', methods=['GET','POST'])
def disputes():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    if request.method=='GET':
        return jsonify({'items':[],'next_cursor':None})
    data = request.get_json(force=True) or {}
    if not data.get('bill_id'): return api_error('validation_error','bill_id required',400)
    return jsonify({'id':str(uuid.uuid4()),'status':'created','version':1}),201

@bp.route('/api/v1/disputes/<dispute_id>/messages', methods=['POST'])
def dispute_msg(dispute_id):
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'id':str(uuid.uuid4()),'status':'message_created','version':1}),201

@bp.route('/api/v1/disputes/<dispute_id>/resolve', methods=['POST'])
def dispute_resolve(dispute_id):
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'id':dispute_id,'status':'resolved'})

@bp.route('/api/v1/disputes/<dispute_id>/meeting-view', methods=['GET'])
def meeting_view(dispute_id):
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'usage_graph_data':[],'bill_breakdown':{'flat_rate':True,'amount_naira':5000.0}})

@bp.route('/api/v1/support/tickets', methods=['GET','POST'])
def support():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    if request.method=='GET':
        return jsonify({'items':[],'next_cursor':None})
    data = request.get_json(force=True) or {}
    if not data.get('category'): return api_error('validation_error','category required',400)
    return jsonify({'id':str(uuid.uuid4()),'status':'ticket_created','version':1}),201

@bp.route('/api/v1/support/tickets/<ticket_id>', methods=['GET'])
def ticket_detail(ticket_id):
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'id':ticket_id,'status':'open'})

@bp.route('/api/v1/support/tickets/<ticket_id>/messages', methods=['POST'])
def ticket_msg(ticket_id):
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'id':str(uuid.uuid4()),'status':'message_created'}),201

@bp.route('/api/v1/portal/jobs', methods=['GET'])
def portal_jobs():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'items':[],'next_cursor':None})

@bp.route('/api/v1/portal/referrals', methods=['GET'])
def referrals():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'items':[],'next_cursor':None})

@bp.route('/api/v1/portal/payouts', methods=['GET'])
def payouts():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'items':[],'next_cursor':None})

@bp.route('/api/v1/verification-reports', methods=['POST'])
def create_report():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    token = str(uuid.uuid4()).replace('-','')
    return jsonify({'microsite_url':f'https://smartclamp.ng/verification-reports/{token}'})

@bp.route('/api/v1/verification-reports/<report_id>/revoke', methods=['POST'])
def revoke_report(report_id):
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'id':report_id,'status':'revoked'})

@bp.route('/api/v1/exports', methods=['POST'])
def create_export():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    data = request.get_json(force=True) or {}
    if not data.get('scope_id'): return api_error('validation_error','scope_id required',400)
    return jsonify({'id':str(uuid.uuid4()),'status':'queued','version':1}),202

@bp.route('/api/v1/exports/<export_id>', methods=['GET'])
def get_export(export_id):
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'id':export_id,'status':'ready'})

@bp.route('/api/v1/uploads', methods=['POST'])
def create_upload():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    data = request.get_json(force=True) or {}
    if not data.get('case_id'): return api_error('validation_error','case_id required',400)
    return jsonify({'id':str(uuid.uuid4()),'status':'upload_granted','upload_url':'https://private.storage/upload'})

@bp.route('/api/v1/uploads/<upload_id>/complete', methods=['POST'])
def complete_upload(upload_id):
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'id':upload_id,'status':'verified'})

@bp.route('/api/v1/orders', methods=['GET','POST'])
def orders():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    if request.method=='GET':
        return jsonify({'items':[],'next_cursor':None})
    data = request.get_json(force=True) or {}
    if not data.get('profile'): return api_error('validation_error','profile required',400)
    return jsonify({'id':str(uuid.uuid4()),'status':'order_created'}),200

@bp.route('/api/v1/orders/<order_id>', methods=['GET'])
def get_order(order_id):
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'id':order_id,'status':'waiting_hardware'})

@bp.route('/api/v1/orders/<order_id>/actions', methods=['POST'])
def order_action(order_id):
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'id':order_id,'status':'action_processed'})

@bp.route('/api/v1/organizations', methods=['POST'])
def create_org():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    if auth['role']!='internal_superadmin': return api_error('forbidden','Superadmin only',403)
    data = request.get_json(force=True) or {}
    if not data.get('name') or not data.get('subdomain'): return api_error('validation_error','name/subdomain required',400)
    return jsonify({'organization_id':str(uuid.uuid4())})

# Device legacy reading route deprecated — return 410
@bp.route('/api/v1/devices/<device_id>/readings', methods=['POST'])
def legacy_readings(device_id):
    return api_error('gone','Legacy endpoint deprecated; use /device/events',410)

@bp.route('/api/v1/devices/<device_id>/readings', methods=['GET'])
def legacy_readings_get(device_id):
    return api_error('gone','Legacy endpoint deprecated',410)
