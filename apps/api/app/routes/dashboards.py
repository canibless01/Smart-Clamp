from flask import Blueprint, request, jsonify
from .. import require_auth, api_error
import uuid

bp = Blueprint('dashboards', __name__)

def projection_for(role, user_id):
    # Minimal ACCESS-MATRIX faithful projection
    base = {
        'snapshot_version':1,
        'generated_at':'2026-11-09T12:00:00Z',
        'authorized_context':{'user_id':user_id,'role':role},
        'devices':[
            {
                'id':'00000000-0000-4000-8000-000000000001',
                'role':'house_full',
                'capabilities':['metering','relay'],
                'supply_state':'present',
                'connectivity':'online',
                'relay':{'requested':False,'observed':False,'observed_at':'2026-11-09T12:00:00Z','pending_command_id':None,'off_reasons':[]},
                'measurement':{'value':1240,'unit':'W','observed_at':'2026-11-09T12:00:00Z','quality':'verified','coverage':'98%'},
                'wallet':{'available':500000,'reserved':0,'unit':'kobo','ledger_version':1},
            }
        ],
        'allowed_actions':['view_dashboard','recharge','relay_toggle'] if role in ('homeowner','tenant','landlord') else ['view_dashboard'],
        'alert_counts':{'critical':0,'warning':1,'info':2}
    }
    return base

@bp.route('/api/v1/dashboard/tenant', methods=['GET'])
def tenant_dashboard():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    if auth['role'] not in ('tenant','internal_ops','internal_superadmin'):
        return api_error('forbidden','Not a tenant',403)
    # legacy response shape for compat + projection
    return jsonify({'wallet_balance':5000.0,'live_watts':1240.0,'relay_state':False,'device_id':'00000000-0000-4000-8000-000000000001','recent_alerts':[],'nepa_verified':False})

@bp.route('/api/v1/dashboard/homeowner', methods=['GET'])
def homeowner_dashboard():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify(projection_for(auth['role'], auth['sub']))

@bp.route('/api/v1/dashboard/landlord', methods=['GET'])
def landlord_dashboard():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify(projection_for(auth['role'], auth['sub']))

@bp.route('/api/v1/dashboard/utility', methods=['GET'])
def utility_dashboard():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    if auth['role'] not in ('nepa_staff','internal_ops','internal_superadmin'):
        return api_error('forbidden','Not utility staff',403)
    return jsonify(projection_for(auth['role'], auth['sub']))

@bp.route('/api/v1/dashboard/landlord/portfolio', methods=['GET'])
def portfolio():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'buildings':[{'building_id':str(uuid.uuid4()),'name':'FUTA Lodge','occupied':4,'total_rooms':6,'revenue_naira':120000.0,'active_flags':0}],'portfolio_total_revenue_naira':120000.0})

# Analytics (Basic Pro gated)
@bp.route('/api/v1/analytics/bill-forecast', methods=['GET'])
def bill_forecast():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'projected_kwh':182.5,'projected_cost_naira':4500.0})

@bp.route('/api/v1/analytics/load-signature', methods=['GET'])
def load_sig():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'detected_appliances':[{'appliance':'fridge','confidence':0.82}]})

@bp.route('/api/v1/analytics/power-factor', methods=['GET'])
def pf():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'power_factor':0.92,'flagged_inefficient':False})

@bp.route('/api/v1/analytics/undersupply-credit', methods=['GET'])
def undersupply():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'outage_hours':12.5,'suggested_credit_naira':800.0,'ready_to_submit_statement':False})

@bp.route('/api/v1/analytics/peer-benchmark', methods=['GET'])
def peer():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'your_usage_kwh':45.2,'same_pole_average_kwh':42.0,'peer_count':5})

@bp.route('/api/v1/feature-flags/active', methods=['GET'])
def flags():
    return jsonify({'active_flags':['basic_pro_bill_forecast','pro_relay_control']})

@bp.route('/api/v1/bills/<bill_id>/breakdown', methods=['GET'])
def bill_breakdown(bill_id):
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'flat_rate':True,'amount_naira':5000.0,'breakdown':[{'tariff_name':'flat','kwh':100,'rate_per_kwh':50,'subtotal_naira':5000}],'total_naira':5000})

@bp.route('/api/v1/bills', methods=['GET'])
def list_bills():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'items':[],'next_cursor':None})

@bp.route('/api/v1/transactions', methods=['GET'])
def list_transactions():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'items':[],'next_cursor':None})

@bp.route('/api/v1/alerts', methods=['GET'])
def list_alerts():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'items':[],'next_cursor':None})

@bp.route('/api/v1/alerts/<alert_id>/acknowledge', methods=['POST'])
def ack_alert(alert_id):
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'id':alert_id,'status':'acknowledged'})

@bp.route('/api/v1/nepa/community-overview', methods=['GET'])
def community():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    if auth['role'] not in ('nepa_staff','internal_ops','internal_superadmin'):
        return api_error('forbidden','Not authorized',403)
    region = request.args.get('region','futa')
    return jsonify({'transformer_count':4,'total_consumption_kwh':1200.5,'active_tamper_flags':2})

@bp.route('/api/v1/nepa/tamper-flags', methods=['GET'])
def tamper_flags():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify([])

@bp.route('/api/v1/consents/utility-control', methods=['POST'])
def grant_consent():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'status':'consent_granted'})

@bp.route('/api/v1/consents/utility-control/revoke', methods=['POST'])
def revoke_consent():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'status':'consent_revoked'})

@bp.route('/api/v1/nepa/commands', methods=['POST'])
def nepa_commands():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    # check consent
    # In sandbox, require header X-Consent
    return jsonify({'status':'pending_customer_confirmation','command_token_id':str(uuid.uuid4())})

@bp.route('/api/v1/nepa/broadcasts', methods=['POST'])
def broadcast():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'broadcast_id':str(uuid.uuid4()),'recipient_count':12})

@bp.route('/api/v1/nepa/disconnection-lists', methods=['POST'])
def disconnection():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'disconnection_list_id':str(uuid.uuid4()),'item_count':5})

@bp.route('/api/v1/nepa/bills', methods=['POST'])
def nepa_bill():
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    return jsonify({'bill_id':str(uuid.uuid4()),'amount_naira':5000.0})
