from flask import Blueprint, request, jsonify
from .. import api_error
import re, uuid

bp = Blueprint('public', __name__)

# Fake provider: validate meter numbers with Luhn-like check, mask identity
@bp.route('/api/v1/meters/validate', methods=['POST'])
def meters_validate():
    data = request.get_json(force=True) or {}
    meter = data.get('meter_number','')
    utility_type = data.get('utility_type','electricity')
    # validation
    if not meter or not re.match(r'^\d{6,20}$', meter):
        return api_error('validation_error','meter_number must be 6-20 digits',400)
    # simulate provider unavailability for specific prefix
    if meter.startswith('999'):
        return api_error('provider_unavailable','Meter provider temporarily unavailable',503)
    # simulate not found
    if meter.startswith('000'):
        return jsonify({'valid':False,'customer_name':None,'address':None,'disco_name':None,'provider_name':None,'utility_type':utility_type})
    # valid: mask
    masked_name = 'A**** B****'
    masked_addr = '***, Akure (masked)'
    return jsonify({
        'valid': True,
        'customer_name': masked_name,
        'address': masked_addr,
        'disco_name': 'BEDC',
        'provider_name': 'SmartClamp sandbox',
        'utility_type': utility_type
    })

@bp.route('/api/v1/public/devices/<token>', methods=['GET'])
def public_device(token):
    # Minimal published projection — no PII
    return jsonify({
        'public_token': token,
        'observed_at': '2026-11-09T12:00:00Z',
        'usage_watts': 1240,
        'bill_amount_kobo': 240000,
        'device_status': 'on',
        'quality': 'verified',
        'payment_destination_token': 'dest_'+token[:8]
    })

@bp.route('/api/v1/organizations/by-subdomain/<subdomain>', methods=['GET'])
def org_branding(subdomain):
    return jsonify({'name':'SmartClamp','logo_url':None,'primary_color_hex':'#102A43'})

@bp.route('/api/v1/verification-reports/<report_token>', methods=['GET'])
def verification_report(report_token):
    return jsonify({'verified':True,'report_token':report_token,'signature_valid':True})
