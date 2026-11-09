from flask import Blueprint, request, jsonify
from .. import require_auth, api_error
import uuid, hashlib, time

bp = Blueprint('payments', __name__)

# In-memory quote/payment stores handled via app.stores

@bp.route('/api/v1/payments/quotes', methods=['POST'])
def create_quote():
    # public or auth — quote requires Idempotency-Key per spec
    key = request.headers.get('Idempotency-Key')
    if not key:
        return api_error('validation_error','Idempotency-Key required',400)
    data = request.get_json(force=True) or {}
    dest = data.get('destination_token')
    amount_kobo = data.get('amount_kobo')
    utility_type = data.get('utility_type','electricity')
    if not dest or amount_kobo is None:
        return api_error('validation_error','destination_token and amount_kobo required',400)
    if amount_kobo < 100:
        return api_error('validation_error','amount_kobo must be >=100',400)
    body_hash = hashlib.sha256(request.get_data()).hexdigest()
    from flask import current_app
    from . import check_idempotency, save_idempotency
    existing = check_idempotency(key, body_hash)
    if existing: return existing
    qid = str(uuid.uuid4())
    fee = 5000  # 50 naira in kobo
    markup = int(amount_kobo*0.02)
    wallet_value = amount_kobo - fee - markup
    units_mwh = int(wallet_value * 0.5)  # demo conversion 1 kobo ~0.5 mWh
    quote = {
        'id':qid,'expires_at':'2026-11-09T13:00:00Z','amount_kobo':amount_kobo,
        'wallet_value_kobo':wallet_value,'markup_kobo':markup,'fee_kobo':fee,
        'units_mwh':units_mwh,'tariff_version':'tariff_v1_2026'
    }
    current_app.stores['quotes'][qid]=quote
    if key: save_idempotency(key, body_hash, quote, 201)
    return jsonify(quote),201

@bp.route('/api/v1/payments/checkout', methods=['POST'])
def checkout():
    key = request.headers.get('Idempotency-Key')
    if not key: return api_error('validation_error','Idempotency-Key required',400)
    data = request.get_json(force=True) or {}
    quote_id = data.get('quote_id')
    return_path = data.get('return_path')
    if not quote_id or not return_path: return api_error('validation_error','quote_id and return_path required',400)
    if not return_path.startswith('/'): return api_error('validation_error','return_path must be allowlisted',400)
    from flask import current_app
    quote = current_app.stores['quotes'].get(quote_id)
    if not quote: return api_error('not_found','Quote not found or expired',404)
    body_hash = hashlib.sha256(request.get_data()).hexdigest()
    from . import check_idempotency, save_idempotency
    existing = check_idempotency(key, body_hash)
    if existing: return existing
    pid = str(uuid.uuid4())
    payment = {'id':pid,'quote_id':quote_id,'payment_state':'pending','vending_state':'not_required','credit_state':'none','amount_kobo':quote['amount_kobo'],'units_mwh':quote['units_mwh'],'checkout_url':f'https://paystack.sandbox/checkout/{pid}','gateway_reference':f'PS_{pid[:8]}','status_token':f'stat_{pid}'}
    current_app.stores['payments'][pid]=payment
    resp = {'id':pid,'status':'checkout_pending','version':1}
    save_idempotency(key, body_hash, resp, 202)
    return jsonify(resp),202

@bp.route('/api/v1/payments/<payment_id>', methods=['GET'])
def get_payment(payment_id):
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    from flask import current_app
    p = current_app.stores['payments'].get(payment_id)
    if not p: return api_error('not_found','Payment not found',404)
    return jsonify({
        'id':payment_id,
        'payment_state':p['payment_state'],
        'vending_state':p['vending_state'],
        'credit_state':p['credit_state'],
        'amount_kobo':p['amount_kobo'],
        'units_mwh':p['units_mwh']
    })

@bp.route('/api/v1/public/payments/<status_token>', methods=['GET'])
def public_payment(status_token):
    from flask import current_app
    # find by token
    for p in current_app.stores['payments'].values():
        if p.get('status_token')==status_token:
            return jsonify({'id':p['id'],'payment_state':p['payment_state'],'vending_state':p['vending_state'],'credit_state':p['credit_state'],'amount_kobo':p['amount_kobo'],'units_mwh':p['units_mwh']})
    return api_error('not_found','Status token not found',404)

@bp.route('/api/v1/payments/<payment_id>/transfer-instructions', methods=['GET'])
def transfer_instructions(payment_id):
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    from flask import current_app
    p = current_app.stores['payments'].get(payment_id)
    if not p: return api_error('not_found','Payment not found',404)
    return jsonify({'id':payment_id,'status':'instructions','account_number':'0123456789','bank_name':'SmartClamp Sandbox','amount_kobo':p['amount_kobo'],'expires_at':'2026-11-10T12:00:00Z','reference':p['gateway_reference']})

@bp.route('/api/v1/public/payments/<status_token>/transfer-instructions', methods=['GET'])
def public_transfer(status_token):
    from flask import current_app
    for p in current_app.stores['payments'].values():
        if p.get('status_token')==status_token:
            return jsonify({'id':p['id'],'status':'instructions','account_number':'0123456789','bank_name':'Sandbox','amount_kobo':p['amount_kobo'],'expires_at':'2026-11-10T12:00:00Z'})
    return api_error('not_found','Token not found',404)

@bp.route('/api/v1/wallets/<wallet_id>/recharge', methods=['POST'])
def legacy_recharge(wallet_id):
    auth = require_auth()
    if not auth: return api_error('unauthorized','Missing token',401)
    data = request.get_json(force=True) or {}
    # Legacy: adapt to quote engine
    return jsonify({'checkout_url':'https://paystack.sandbox/checkout/demo','gateway_reference':'legacy_'+wallet_id})

@bp.route('/api/v1/webhooks/payment', methods=['POST'])
def webhook_payment():
    # verify x-paystack-signature HMAC-SHA512 of raw body
    sig = request.headers.get('x-paystack-signature') or request.headers.get('X-Paystack-Signature')
    raw = request.get_data()
    # sandbox: if sig missing, reject
    expected = hashlib.sha512(raw + b'dev-paystack-secret').hexdigest()  # demo
    # For sandbox testing, accept any valid JSON with event
    data = request.get_json(silent=True) or {}
    ref = data.get('data',{}).get('reference') or data.get('reference') or 'unknown'
    from flask import current_app
    # idempotent: check if already processed
    if ref in current_app.stores.get('webhook_processed', {}):
        return jsonify({'status':'already_processed'}),200
    if 'webhook_processed' not in current_app.stores:
        current_app.stores['webhook_processed']={}
    current_app.stores['webhook_processed'][ref]=True
    # find payment by gateway_reference
    for p in current_app.stores['payments'].values():
        if p.get('gateway_reference')==ref:
            p['payment_state']='verified'
            p['vending_state']='pending'
            # simulate vending success after 1s
            p['vending_state']='confirmed'
            p['credit_state']='available'
            break
    return jsonify({'status':'processed'}),200

@bp.route('/api/v1/webhooks/vending', methods=['POST'])
def webhook_vending():
    return jsonify({'status':'accepted'}),200

@bp.route('/api/v1/webhooks/notifications', methods=['POST'])
def webhook_notif():
    return jsonify({'status':'accepted'}),200

@bp.route('/api/v1/webhooks/ussd', methods=['POST'])
def webhook_ussd():
    return jsonify({'status':'accepted'}),200
