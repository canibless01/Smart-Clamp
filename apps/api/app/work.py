"""Durable outbox processing. Provider failures remain failures, never simulated fulfillment."""
from datetime import datetime,timezone,timedelta
from decimal import Decimal,InvalidOperation
import hashlib,re
from flask import current_app
from .db import transaction,one,rows,query,scalar,DomainError,json_text,outbox,audit
from .providers import vtpass,config

def notify(c,uid,key,message,dedupe,episode=None):
    if uid:query(c,"INSERT INTO notifications(recipient_id,template_key,channel,status,payload,dedupe_key,episode_id) VALUES(:uid,:key,'in_app','delivered',CAST(:payload AS jsonb),:dedupe,:episode) ON CONFLICT(dedupe_key) DO NOTHING",uid=uid,key=key,payload=json_text({'message':message}),dedupe=dedupe,episode=episode)

def release_credit(c,payment_id,source='provider_confirmed'):
    p=one(c,'SELECT * FROM payments WHERE id=:id FOR UPDATE',id=payment_id)
    if not p or p['payment_state']!='verified':raise DomainError('payment_not_verified','A verified payment is required.',409)
    if p['credit_state']=='available':return
    q=one(c,'SELECT * FROM quotes WHERE id=:id',id=p['quote_id']);w=one(c,'SELECT * FROM wallets WHERE id=:id FOR UPDATE',id=q['wallet_id'])
    if not w:raise DomainError('wallet_missing','The destination wallet requires reconciliation.',409)
    if w['reserved_mwh']<p['units_mwh'] or w['reserved_kobo']<q['wallet_value_kobo']:raise DomainError('reservation_mismatch','The wallet reservation requires reconciliation.',409)
    tx=one(c,"INSERT INTO ledger_transactions(wallet_id,kind,provider_reference,created_by) VALUES(:wallet,'recharge',:ref,:uid) RETURNING id",wallet=w['id'],ref='credit:'+str(p['id']),uid=p['payer_id'])
    for account,direction in[('vended_energy','debit'),('customer_available_energy','credit')]:query(c,'INSERT INTO ledger_entries(transaction_id,wallet_id,account,direction,energy_mwh) VALUES(:tx,:wallet,:account,:direction,:amount)',tx=tx['id'],wallet=w['id'],account=account,direction=direction,amount=p['units_mwh'])
    for account,direction in [('reserved_customer_liability','debit'),('available_customer_liability','credit')]:query(c,'INSERT INTO ledger_entries(transaction_id,wallet_id,account,direction,amount_kobo) VALUES(:tx,:wallet,:account,:direction,:amount)',tx=tx['id'],wallet=w['id'],account=account,direction=direction,amount=q['wallet_value_kobo'])
    query(c,'UPDATE wallets SET available_mwh=available_mwh+:units,reserved_mwh=reserved_mwh-:units,available_kobo=available_kobo+:cash,reserved_kobo=reserved_kobo-:cash,ledger_version=ledger_version+1,updated_at=now() WHERE id=:id',id=w['id'],units=p['units_mwh'],cash=q['wallet_value_kobo'])
    query(c,"UPDATE payments SET credit_state='available',vending_state='confirmed',credited_at=now(),version=version+1,updated_at=now() WHERE id=:id",id=p['id'])
    # Clear exactly one reason. Protection/manual/budget/etc. are preserved.
    if w['device_id']:query(c,"UPDATE off_reasons SET active=false WHERE device_id=:id AND reason='wallet_zero'",id=w['device_id'])
    audit(c,p['payer_id'],'credit_released',p['id'],{'source':source});notify(c,p['payer_id'],'payment.confirmed','Your electricity credit is available. Other device restrictions may still apply.','credit:'+str(p['id']))

def process_vending(payment_id):
    with transaction() as c:
        p=one(c,'SELECT * FROM payments WHERE id=:id FOR UPDATE',id=payment_id)
        if not p or p['payment_state']!='verified':raise DomainError('payment_unverified','Payment is not verified.',409)
        if p['credit_state']=='available' or p['vending_state']=='token_pending_entry':return
        q=one(c,'SELECT * FROM quotes WHERE id=:id',id=p['quote_id'])
        m=one(c,'SELECT m.meter_number,m.disco_name FROM wallets w JOIN devices d ON d.id=w.device_id JOIN linked_meters m ON m.id=d.linked_meter_id WHERE w.id=:id',id=q['wallet_id'])
        payer=one(c,'SELECT phone FROM profiles WHERE id=:id',id=p['payer_id'])
        if not m or not payer:raise DomainError('vending_destination_missing','The meter destination requires reconciliation.',409)
        prior=one(c,'SELECT * FROM vending_attempts WHERE payment_id=:id ORDER BY created_at DESC LIMIT 1',id=payment_id)
        if prior:
            ref=prior['provider_reference'];requery=True
        else:
            ref=p['created_at'].strftime('%Y%m%d%H%M')+str(p['id']).replace('-','')[:20];requery=False
            query(c,"INSERT INTO vending_attempts(payment_id,provider,provider_reference,destination,units_mwh,status) VALUES(:id,'vtpass',:ref,:meter,:units,'pending')",id=payment_id,ref=ref,meter=m['meter_number'],units=p['units_mwh'])
    # Provider request identity is durable before HTTP. An uncertain retry REQUERIES the same identity.
    if requery:result=vtpass('requery',{'request_id':ref})
    else:result=vtpass('pay',{'request_id':ref,'serviceID':m['disco_name'],'billersCode':m['meter_number'],'variation_code':'prepaid','amount':str(Decimal(q['wallet_value_kobo'])/100),'phone':payer['phone'].lstrip('+')})
    content=result.get('content') or {};tx=content.get('transactions') or {};delivered=str(result.get('code'))=='000' and tx.get('status')=='delivered'
    with transaction() as c:
        query(c,'SELECT id FROM payments WHERE id=:id FOR UPDATE',id=payment_id)
        if not delivered:
            query(c,"UPDATE vending_attempts SET status='unknown',response_payload=CAST(:payload AS jsonb) WHERE payment_id=:id AND provider_reference=:ref",id=payment_id,ref=ref,payload=json_text(result));query(c,"UPDATE payments SET vending_state='unknown',version=version+1,updated_at=now() WHERE id=:id",id=payment_id);notify(c,p['payer_id'],'vending.delayed','Your payment was received. The meter top-up is still being reconciled; please do not pay again.','vending-delayed:'+str(payment_id))
        else:
            token=result.get('purchased_code') or content.get('token') or tx.get('token')
            # Preserve exact provider token. Its entry into a physical meter is a separate user step.
            query(c,"UPDATE vending_attempts SET status='confirmed',token=:token,response_payload=CAST(:payload AS jsonb) WHERE payment_id=:id AND provider_reference=:ref",id=payment_id,ref=ref,token=str(token) if token else None,payload=json_text(result))
            if token:
                query(c,"UPDATE payments SET vending_state='token_pending_entry',version=version+1,updated_at=now() WHERE id=:id",id=payment_id);notify(c,p['payer_id'],'vending.token_ready','Your meter token is ready. Enter it on the meter, then confirm the meter accepted it.','vending-token:'+str(payment_id))
            else:release_credit(c,payment_id)
    if not delivered:raise DomainError('vending_pending','The provider has not confirmed fulfillment.',503)

def process_reading(c,reading_id):
    r=one(c,'SELECT r.*,i.boot_id FROM readings r JOIN device_inbox i ON i.id=r.inbox_id WHERE r.id=:id',id=reading_id)
    if not r:return
    checkpoint=one(c,'SELECT * FROM devices WHERE id=:id FOR UPDATE',id=r['device_id'])
    if one(c,'SELECT reading_id FROM usage_postings WHERE reading_id=:id',id=reading_id):return
    previous=one(c,"SELECT r.*,i.boot_id FROM readings r JOIN device_inbox i ON i.id=r.inbox_id WHERE r.device_id=:id AND r.id<>:rid AND r.occurred_at_ms<:at ORDER BY r.occurred_at_ms DESC LIMIT 1",id=r['device_id'],rid=r['id'],at=r['occurred_at_ms']) if r['occurred_at_ms'] is not None else None
    consumed=0
    eligible=r['quality']=='valid' and r['clock_quality']=='trusted' and r['import_mwh'] is not None and previous and previous['quality']=='valid' and previous['clock_quality']=='trusted' and previous['import_mwh'] is not None and previous['boot_id']==r['boot_id'] and r['import_mwh']>=previous['import_mwh']
    newer=r['occurred_at_ms'] is not None and (checkpoint['accounted_at_ms'] is None or r['occurred_at_ms']>checkpoint['accounted_at_ms'])
    eligible=eligible and newer and checkpoint['accounted_boot_id']==r['boot_id'] and checkpoint['accounted_counter_mwh'] is not None and r['import_mwh']>=checkpoint['accounted_counter_mwh']
    if eligible:consumed=r['import_mwh']-checkpoint['accounted_counter_mwh']
    if newer and r['quality']=='valid' and r['clock_quality']=='trusted' and r['import_mwh'] is not None:
        if checkpoint['accounted_boot_id']!=r['boot_id'] or checkpoint['accounted_counter_mwh'] is None or r['import_mwh']>=checkpoint['accounted_counter_mwh']:
            query(c,'UPDATE devices SET accounted_at_ms=:at,accounted_counter_mwh=:counter,accounted_boot_id=:boot WHERE id=:id',id=r['device_id'],at=r['occurred_at_ms'],counter=r['import_mwh'],boot=r['boot_id'])
    w=one(c,'SELECT * FROM wallets WHERE device_id=:id FOR UPDATE',id=r['device_id']);funded=min(consumed,w['available_mwh']) if w else 0
    query(c,'INSERT INTO usage_postings(reading_id,wallet_id,consumed_mwh,funded_mwh,interval_start_ms,accounting_quality) VALUES(:rid,:wallet,:used,:funded,:start,:quality)',rid=r['id'],wallet=w['id'] if w else None,used=consumed,funded=funded,start=checkpoint['accounted_at_ms'] if eligible else None,quality='measured' if eligible else 'unavailable')
    if w and consumed:
        rate=one(c,'SELECT day_rate_kobo_per_kwh FROM tariffs WHERE version=:version',version=w['tariff_version'])
        cost=min(w['available_kobo'],funded*rate['day_rate_kobo_per_kwh']//1000000) if rate else 0
        query(c,'UPDATE wallets SET available_mwh=available_mwh-:funded,unpaid_mwh=unpaid_mwh+:debt,available_kobo=available_kobo-:cost,ledger_version=ledger_version+1,updated_at=now() WHERE id=:id',id=w['id'],funded=funded,debt=consumed-funded,cost=cost)
        if funded:
            tx=one(c,"INSERT INTO ledger_transactions(wallet_id,kind,provider_reference) VALUES(:wallet,'consumption',:ref) RETURNING id",wallet=w['id'],ref='reading:'+str(r['id']))
            for account,direction in[('customer_available_energy','debit'),('measured_consumption','credit')]:query(c,'INSERT INTO ledger_entries(transaction_id,wallet_id,account,direction,energy_mwh) VALUES(:tx,:wallet,:account,:direction,:amount)',tx=tx['id'],wallet=w['id'],account=account,direction=direction,amount=funded)
            if cost:
                for account,direction in [('available_customer_liability','debit'),('metered_energy_consumed','credit')]:query(c,'INSERT INTO ledger_entries(transaction_id,wallet_id,account,direction,amount_kobo) VALUES(:tx,:wallet,:account,:direction,:amount)',tx=tx['id'],wallet=w['id'],account=account,direction=direction,amount=cost)
        if consumed>=w['available_mwh']:
            query(c,"INSERT INTO off_reasons(device_id,reason,scope) VALUES(:id,'wallet_zero','prepaid') ON CONFLICT(device_id,reason,scope) DO UPDATE SET active=true",id=r['device_id'])
    prev=one(c,'SELECT chain_hash FROM usage_event_chain WHERE device_id=:id ORDER BY id DESC LIMIT 1',id=r['device_id']);prev_hash=prev['chain_hash'] if prev else ''
    digest=hashlib.sha256((prev_hash+'|'+str(r['id'])+'|'+json_text({'import_mwh':r['import_mwh'],'occurred_at_ms':r['occurred_at_ms']})).encode()).hexdigest()
    query(c,'INSERT INTO usage_event_chain(reading_id,device_id,chain_hash,prev_hash) VALUES(:rid,:did,:hash,:prev) ON CONFLICT(reading_id) DO NOTHING',rid=r['id'],did=r['device_id'],hash=digest,prev=prev_hash or None)

def process_episode(c,job):
    payload=job['payload'];did=payload['device_id'];lost=job['event_type']=='supply_lost'
    if payload.get('updates_current') is False:return
    device=one(c,'SELECT owner_id FROM devices WHERE id=:id FOR UPDATE',id=did)
    if lost:
        if one(c,"SELECT id FROM episodes WHERE cause='supply_lost' AND status='open' AND topology_scope->>'device_id'=:id",id=did):return
        row=one(c,"INSERT INTO episodes(cause,source,confidence,topology_scope,start_at,dedupe_key) VALUES('supply_lost','device',:confidence,CAST(:scope AS jsonb),:at,:dedupe) ON CONFLICT(dedupe_key) DO UPDATE SET dedupe_key=excluded.dedupe_key RETURNING id",confidence=1 if payload.get('clock_quality')=='trusted' else 0,scope=json_text({'device_id':did}),at=datetime.fromtimestamp(payload['occurred_at_ms']/1000,timezone.utc) if payload.get('occurred_at_ms') else datetime.now(timezone.utc),dedupe='supply:'+payload['inbox_id'])
        notify(c,device['owner_id'],'supply.lost','Your device recorded a supply interruption. The observation time and connection may be uncertain.','supply-lost:'+str(row['id']),row['id'])
    else:
        episodes=rows(c,"UPDATE episodes SET end_at=:at,status='resolved' WHERE cause='supply_lost' AND status='open' AND topology_scope->>'device_id'=:id AND start_at<=:at RETURNING id",id=did,at=datetime.fromtimestamp(payload['occurred_at_ms']/1000,timezone.utc) if payload.get('occurred_at_ms') and payload.get('clock_quality')=='trusted' else datetime.now(timezone.utc))
        for e in episodes:notify(c,device['owner_id'],'supply.restored','Your device reported supply returning. Other protection restrictions may still apply.','supply-returned:'+str(e['id']),e['id'])

def run_once():
    with transaction() as c:
        job=one(c,"UPDATE outbox SET status='claimed',claimed_at=now(),lease_until=now()+interval '60 seconds',attempts=attempts+1 WHERE id=(SELECT id FROM outbox WHERE ((status IN('pending','failed') AND next_attempt_at<=now()) OR(status='claimed' AND lease_until<now())) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *")
    if not job:return False
    try:
        if job['event_type']=='payment_verified':process_vending(job['payload']['payment_id'])
        else:
            with transaction() as c:
                if job['event_type']=='reading_committed':process_reading(c,job['payload']['reading_id'])
                elif job['event_type'] in('supply_lost','supply_returned'):process_episode(c,job)
                elif job['event_type'] in('protection','tamper'):
                    d=one(c,'SELECT owner_id FROM devices WHERE id=:id',id=job['payload']['device_id'])
                    message='Your device reported stable voltage and cleared its protection restriction. Other restrictions may still apply.' if job['event_type']=='protection' and job['payload'].get('active') is False else 'Your device reported a '+job['event_type']+' signal that needs review. Physical switching is not confirmed by this signal.'
                    notify(c,d['owner_id'],job['event_type'],message,str(job['id']))
                else:raise DomainError('unsupported_event','This event requires an implemented processor.',503)
        with transaction() as c:query(c,"UPDATE outbox SET status='done',lease_until=NULL,last_error=NULL WHERE id=:id",id=job['id'])
    except Exception as e:
        code=e.code if isinstance(e,DomainError) else type(e).__name__
        with transaction() as c:query(c,"UPDATE outbox SET status=CASE WHEN created_at<now()-interval '24 hours' THEN 'dead_letter' ELSE 'failed' END,lease_until=NULL,last_error=:error,next_attempt_at=now()+make_interval(secs=>:delay) WHERE id=:id",id=job['id'],error=code,delay=min(900,5*2**min(job['attempts'],8)))
    return True
