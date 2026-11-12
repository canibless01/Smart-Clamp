from datetime import datetime,timezone,timedelta
from decimal import Decimal,ROUND_HALF_UP
import hashlib,hmac,re,secrets,uuid
from urllib.parse import urlparse,urlencode
from flask import Blueprint,request,jsonify,g,current_app
from .db import transaction,one,rows,query,DomainError,uuid_string,json_text,audit,outbox
from .live_auth import authenticated
from .idempotency import idempotent
from .providers import config,paystack
bp=Blueprint('live_payments',__name__)

def configured_payment():
    for key in('PAYSTACK_SECRET_KEY','VTPASS_API_KEY','VTPASS_SECRET_KEY','APP_ORIGIN','PAYMENT_FEE_BPS','PAYMENT_FIXED_FEE_KOBO','PLATFORM_MARKUP_BPS'):config(key)

def quote_lookup(c,qid):
    row=one(c,'SELECT * FROM quotes WHERE id=:id AND expires_at>now()',id=uuid_string(qid))
    if not row:raise DomainError('quote_expired','This quote has expired. Request a new quote.',409)
    return dict(row)

@bp.post('/api/v1/payments/quotes')
@idempotent
def quote():
    configured_payment();d=request.get_json() or {};amount=d.get('amount_kobo')
    if type(amount) is not int or amount<100 or amount>100000000:raise DomainError('validation_error','Enter an amount between ₦1 and ₦1,000,000.')
    if d.get('utility_type','electricity')!='electricity':raise DomainError('unsupported_utility','This utility is not configured.',503)
    with transaction() as c:
        w=one(c,"SELECT w.*,d.linked_meter_id AS destination_meter FROM wallets w JOIN devices d ON d.id=w.device_id WHERE w.payment_token=:token",token=d.get('destination_token',''))
        if not w or not w['destination_meter']:raise DomainError('payment_destination_unavailable','This device needs a configured meter and tariff before it can receive electricity payments.',422)
        rate=one(c,'SELECT * FROM tariffs WHERE version=:version AND effective_from<=now() AND(effective_to IS NULL OR effective_to>now())',version=w['tariff_version'])
        if not rate or rate['day_rate_kobo_per_kwh']<=0:raise DomainError('tariff_required','A current approved tariff is required before quoting electricity.',503)
        if rate['night_rate_kobo_per_kwh'] is not None:raise DomainError('tariff_requires_provider_quote','Time-banded vending must use a compatible provider quote before purchase.',503)
        fee_bps=int(config('PAYMENT_FEE_BPS'));fixed=int(config('PAYMENT_FIXED_FEE_KOBO'));markup_bps=int(config('PLATFORM_MARKUP_BPS'))
        if min(fee_bps,fixed,markup_bps)<0 or fee_bps+markup_bps>=10000:raise DomainError('invalid_fee_configuration','The payment fee configuration must be reviewed.',503)
        fee=int((Decimal(amount)*fee_bps/10000).quantize(Decimal('1'),rounding=ROUND_HALF_UP))+fixed
        markup=int((Decimal(amount)*markup_bps/10000).quantize(Decimal('1'),rounding=ROUND_HALF_UP));value=amount-fee-markup
        if value<=0:raise DomainError('amount_too_small','The amount must be greater than the itemized fees.')
        units=value*1000000//rate['day_rate_kobo_per_kwh']
        q=one(c,"INSERT INTO quotes(wallet_id,destination_token,amount_kobo,wallet_value_kobo,markup_kobo,fee_kobo,units_mwh,tariff_version,expires_at) VALUES(:wallet,:dest,:amount,:value,:markup,:fee,:units,:rate,now()+interval '15 minutes') RETURNING *",wallet=w['id'],dest=d['destination_token'],amount=amount,value=value,markup=markup,fee=fee,units=units,rate=rate['version'])
    return jsonify({k:q[k] for k in('id','expires_at','amount_kobo','wallet_value_kobo','markup_kobo','fee_kobo','units_mwh','tariff_version')}),201

def public_payment(p):
    return {k:p[k] for k in('id','payment_state','vending_state','credit_state','amount_kobo','units_mwh','version')}

@bp.post('/api/v1/payments/checkout')
@authenticated
def checkout():
    configured_payment();d=request.get_json() or {};email=d.get('payer_email','');path=d.get('return_path','/payments/return')
    if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',email):raise DomainError('receipt_email_required','Enter a real email address for your payment receipt.')
    if not isinstance(path,str) or not path.startswith('/') or path.startswith('//') or '\\' in path or any(ch in path for ch in('\r','\n')):raise DomainError('invalid_return_path','The payment return path is invalid.')
    origin=config('APP_ORIGIN').rstrip('/')
    if urlparse(origin).scheme!='https' and not current_app.testing:raise DomainError('invalid_site_origin','A secure site origin is required.',503)
    # The quote ID is the immutable external idempotency identity. Commit it BEFORE the HTTP call.
    with transaction() as c:
        q=quote_lookup(c,d.get('quote_id'))
        query(c,'SELECT pg_advisory_xact_lock(hashtextextended(:key,0))',key='checkout:'+str(q['id']))
        previous=one(c,'SELECT * FROM payments WHERE quote_id=:id FOR UPDATE',id=q['id'])
        if previous:
            if str(previous['payer_id'])!=g.actor['id']:raise DomainError('not_found','Payment not found.',404)
            return jsonify({**public_payment(previous),'checkout_url':previous['checkout_url'],'status_token':previous['status_token'],'status':'checkout_pending' if previous['checkout_url'] else 'outcome_unknown'}),202
        pid=str(uuid.uuid4());reference='SC_'+uuid.UUID(str(q['id'])).hex
        token=secrets.token_urlsafe(32)
        query(c,"INSERT INTO payments(id,quote_id,payer_id,provider_reference,gateway_ref,status_token,payment_state,vending_state,amount_kobo,units_mwh) VALUES(:id,:quote,:uid,:ref,:ref,:token,'pending','pending',:amount,:units)",id=pid,quote=q['id'],uid=g.actor['id'],ref=reference,token=token,amount=q['amount_kobo'],units=q['units_mwh'])
    callback=origin+path+('?' if '?' not in path else '&')+urlencode({'payment_id':pid,'status_token':token})
    try:
        result=paystack('transaction/initialize','POST',{'email':email,'amount':q['amount_kobo'],'currency':'NGN','reference':reference,'callback_url':callback,'metadata':{'payment_id':pid}})
        data=result.get('data') or {};url=data.get('authorization_url')
        if result.get('status') is not True or data.get('reference')!=reference or not url or urlparse(url).scheme!='https' or urlparse(url).hostname!='checkout.paystack.com':raise DomainError('provider_response_invalid','The payment provider returned an invalid checkout response.',503)
    except DomainError:
        with transaction() as c:query(c,"UPDATE payments SET payment_state='unknown',version=version+1,updated_at=now() WHERE id=:id AND payment_state='pending'",id=pid)
        return jsonify(id=pid,status='outcome_unknown',status_token=token,message='The payment initialization outcome is unknown. Check this payment before attempting another.'),202
    with transaction() as c:query(c,'UPDATE payments SET checkout_url=:url,provider_response=CAST(:provider AS jsonb),version=version+1,updated_at=now() WHERE id=:id',id=pid,url=url,provider=json_text({'reference':reference}));audit(c,g.actor['id'],'checkout_initialized',pid)
    return jsonify(id=pid,status='checkout_pending',checkout_url=url,status_token=token),202

@bp.get('/api/v1/payments/<payment_id>')
@authenticated
def payment_status(payment_id):
    with transaction() as c:
        p=one(c,'SELECT * FROM payments WHERE id=:id AND payer_id=:uid',id=uuid_string(payment_id),uid=g.actor['id'])
        if not p:raise DomainError('not_found','Payment not found.',404)
        return jsonify(public_payment(p))

@bp.get('/api/v1/public/payments/<status_token>')
def payment_public(status_token):
    with transaction() as c:
        p=one(c,'SELECT * FROM payments WHERE status_token=:token',token=status_token)
        if not p:raise DomainError('not_found','Payment not found.',404)
        # Token delivery is limited to its opaque receipt holder, no owner identity.
        attempt=one(c,"SELECT token,status FROM vending_attempts WHERE payment_id=:id ORDER BY created_at DESC LIMIT 1",id=p['id'])
        return jsonify({**public_payment(p),'meter_token':attempt['token'] if attempt and p['vending_state']=='token_pending_entry' else None})

@bp.post('/api/v1/webhooks/payment')
def webhook():
    secret=config('PAYSTACK_SECRET_KEY');raw=request.get_data();signature=request.headers.get('x-paystack-signature','')
    expected=hmac.new(secret.encode(),raw,hashlib.sha512).hexdigest()
    if not hmac.compare_digest(expected,signature):raise DomainError('webhook_unauthorized','Payment webhook authentication failed.',401)
    payload=request.get_json(silent=True) or {}
    if payload.get('event')!='charge.success':return jsonify(status='ignored_non_success_event')
    reference=payload.get('data',{}).get('reference')
    if not isinstance(reference,str):raise DomainError('invalid_webhook','A provider reference is required.')
    verified=paystack('transaction/verify/'+reference)
    data=verified.get('data') or {}
    if verified.get('status') is not True or data.get('status')!='success' or data.get('reference')!=reference:raise DomainError('payment_not_verified','The provider has not confirmed this payment.',409)
    digest=hashlib.sha256(raw).hexdigest()
    with transaction() as c:
        p=one(c,'SELECT * FROM payments WHERE provider_reference=:ref FOR UPDATE',ref=reference)
        if not p:raise DomainError('unknown_payment','No matching checkout exists for this reference.',404)
        if data.get('amount')!=p['amount_kobo'] or data.get('currency')!='NGN':raise DomainError('payment_mismatch','The confirmed amount or currency does not match the checkout.',409)
        prior=one(c,"SELECT body_hash FROM provider_events WHERE provider='paystack' AND reference=:ref AND kind='charge.success'",ref=reference)
        if prior:
            if prior['body_hash']!=digest:raise DomainError('webhook_conflict','A conflicting event already exists for this reference.',409)
            return jsonify(status='already_processed')
        query(c,"INSERT INTO provider_events(provider,reference,kind,body_hash,payload) VALUES('paystack',:ref,'charge.success',:hash,CAST(:payload AS jsonb))",ref=reference,hash=digest,payload=json_text(payload))
        if p['payment_state']!='verified':
            query(c,"UPDATE payments SET payment_state='verified',vending_state='pending',credit_state='reserved',version=version+1,updated_at=now() WHERE id=:id",id=p['id'])
            q=one(c,'SELECT * FROM quotes WHERE id=:id',id=p['quote_id']);query(c,'UPDATE wallets SET reserved_mwh=reserved_mwh+:units,reserved_kobo=reserved_kobo+:cash,ledger_version=ledger_version+1,updated_at=now() WHERE id=:id',id=q['wallet_id'],units=q['units_mwh'],cash=q['wallet_value_kobo'])
            tx=one(c,"INSERT INTO ledger_transactions(wallet_id,kind,provider_reference,created_by) VALUES(:wallet,'recharge',:ref,:uid) RETURNING id",wallet=q['wallet_id'],ref='money:'+reference,uid=p['payer_id'])
            for account,direction,amount in [('provider_cash','debit',p['amount_kobo']),('reserved_customer_liability','credit',q['wallet_value_kobo']),('platform_fee_revenue','credit',q['fee_kobo']),('platform_markup_revenue','credit',q['markup_kobo'])]:
                if amount:query(c,'INSERT INTO ledger_entries(transaction_id,wallet_id,account,direction,amount_kobo) VALUES(:tx,:wallet,:account,:direction,:amount)',tx=tx['id'],wallet=q['wallet_id'],account=account,direction=direction,amount=amount)
            outbox(c,'payment_verified',p['id'],{'payment_id':str(p['id'])});audit(c,p['payer_id'],'payment_verified',p['id'])
    return jsonify(status='recorded_pending_fulfillment')

@bp.post('/api/v1/payments/<payment_id>/confirm-meter-entry')
@authenticated
@idempotent
def confirm_entry(payment_id):
    from .work import release_credit
    with transaction() as c:
        p=one(c,'SELECT * FROM payments WHERE id=:id AND payer_id=:uid FOR UPDATE',id=uuid_string(payment_id),uid=g.actor['id'])
        if not p or p['vending_state']!='token_pending_entry':raise DomainError('not_found','A token awaiting entry was not found.',404)
        if (request.get_json() or {}).get('confirmed') is not True:raise DomainError('confirmation_required','Confirm that the meter accepted the supplied token.')
        release_credit(c,p['id'],source='payer_meter_entry_attestation');audit(c,g.actor['id'],'meter_entry_attested',p['id'])
    return jsonify(status='credited',source='payer_meter_entry_attestation')

@bp.route('/api/v1/payments/<payment_id>/transfer-instructions')
@bp.route('/api/v1/public/payments/<status_token>/transfer-instructions')
def transfer_instructions(payment_id=None,status_token=None):
    raise DomainError('bank_transfer_unavailable','Bank-transfer collection is not configured. Use the provider-hosted checkout.',503)

@bp.post('/api/v1/wallets/<wallet_id>/recharge')
@authenticated
def old_recharge(wallet_id):raise DomainError('quote_required','Use the itemized quote and checkout flow.',410)

@bp.post('/api/v1/webhooks/vending')
@bp.post('/api/v1/webhooks/notifications')
@bp.post('/api/v1/webhooks/ussd')
def unsupported_webhook():
    # Never acknowledge an unverified financial/notification callback.
    raise DomainError('provider_callback_unconfigured','This provider callback is not configured.',503)
