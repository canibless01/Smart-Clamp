"""Signed, monotonically versioned allowances backed only by confirmed room purchases.
No policy receipt establishes physical relay cutoff or qualifies unknown hardware.
"""
import hashlib,re,uuid
from datetime import datetime,timezone
from flask import Blueprint,request,jsonify,g
from .db import transaction,one,query,scalar,device,uuid_string,DomainError,json_text,audit
from .protocol import canonical,sign
from .live_devices import credential,verified,inbox
bp=Blueprint('prepaid',__name__)


def eligible(d):
    return d['profile']=='house_full' and d['prepaid_enforced'] and d.get('prepaid_policy_qualified') and d.get('persistent_counter_qualified') and d.get('prepaid_anchor_mwh') is not None and d['install_state']=='commissioned' and d['calibration_status']=='qualified' and 'relay' in d['capabilities']


def policy_offer(c,d,p):
    if not eligible(d):return None
    wallet=one(c,'SELECT id,available_mwh FROM wallets WHERE device_id=:id FOR UPDATE',id=d['id'])
    if not wallet:return None
    # Absolute counter ceiling = qualified installation baseline + actual funded units.
    # It cannot increase merely because cloud usage processing was delayed or had gaps.
    funded=int(scalar(c,"""SELECT coalesce(sum(l.credited_mwh),0) FROM energy_credit_lots l
        JOIN payments p ON p.id=l.payment_id WHERE l.wallet_id=:id
        AND p.payment_state='verified' AND p.credit_state='available'""",id=wallet['id']))
    ceiling=d['prepaid_anchor_mwh']+funded
    if ceiling>9223372036854775807:raise DomainError('credit_policy_overflow','The allowance requires financial reconciliation.',409)
    content={'kind':'prepaid_policy','device_id':str(d['id']),'key_epoch':d['key_epoch'],'config_epoch':d['config_epoch'],
             'policy_epoch':d['policy_epoch'],'counter_epoch':d['meter_counter_epoch'],'baseline_mwh':d['prepaid_anchor_mwh'],
             'ceiling_mwh':ceiling,'funded_mwh':funded,'scope':'room_prepaid','physical_cutoff_confirmed':False}
    latest=one(c,'SELECT * FROM device_credit_policies WHERE device_id=:id ORDER BY seq DESC LIMIT 1',id=d['id'])
    semantic={k:v for k,v in (latest['body'] if latest else {}).items() if k not in ('policy_id','policy_seq')}
    if semantic!=content:
        seq=d['next_credit_policy_seq']+1;pid=str(uuid.uuid4());content.update(policy_id=pid,policy_seq=seq)
        digest=hashlib.sha256(canonical(content)).hexdigest()
        query(c,'INSERT INTO device_credit_policies(id,device_id,seq,body,body_sha256) VALUES(:id,:device,:seq,CAST(:body AS jsonb),:hash)',id=pid,device=d['id'],seq=seq,body=json_text(content),hash=digest)
        query(c,'UPDATE devices SET next_credit_policy_seq=:seq WHERE id=:id',id=d['id'],seq=seq)
    else:content=latest['body'];digest=latest['body_sha256']
    payload={**content,'body_sha256':digest,'request_boot_id':p['boot_id'],'request_seq':p['seq'],
             'expires_at_s':int(datetime.now(timezone.utc).timestamp())+120}
    return sign(payload,credential(c,d['id'],d['key_epoch'],'command'))


def state(c,d):
    latest=one(c,"""SELECT p.id,p.seq,p.body,p.created_at,r.result,r.reason_code,r.import_mwh,r.created_at AS acknowledged_at
        FROM device_credit_policies p LEFT JOIN device_credit_policy_receipts r ON r.policy_id=p.id
        WHERE p.device_id=:id ORDER BY p.seq DESC,r.observed_at_ms DESC NULLS LAST,r.created_at DESC LIMIT 1""",id=d['id'])
    return {'enabled':d['prepaid_enforced'],'qualified_for_sync':bool(eligible(d)),
            'status':(latest['result'] or 'awaiting_device') if latest else 'not_issued',
            'policy_seq':latest['seq'] if latest else None,'ceiling_mwh':latest['body']['ceiling_mwh'] if latest else None,
            'acknowledged_at':latest['acknowledged_at'] if latest else None,
            'reason_code':latest['reason_code'] if latest else None,'physical_cutoff_confirmed':False}


@bp.post('/api/v1/device/prepaid-policy/receipts')
def receipt():
    with transaction() as c:
        d,p=verified(c,request.get_json() or {})
        if p.get('kind')!='prepaid_policy_receipt' or p.get('result') not in ('accepted','rejected'):raise DomainError('invalid_policy_receipt','A signed prepaid policy receipt is required.')
        iid,ack,duplicate=inbox(c,d,p)
        if duplicate:return jsonify(ack)
        row=one(c,'SELECT * FROM device_credit_policies WHERE id=:id AND device_id=:device AND seq=:seq',id=uuid_string(p.get('policy_id')),device=d['id'],seq=p.get('policy_seq'))
        if not row or p.get('body_sha256')!=row['body_sha256']:raise DomainError('policy_mismatch','The receipt does not match an issued prepaid policy.',409)
        reason=p.get('reason_code');counter=p.get('import_mwh')
        if not isinstance(reason,str) or not re.fullmatch(r'[a-z0-9_]{1,80}',reason):raise DomainError('invalid_policy_receipt','A bounded reason code is required.')
        if counter is not None and(type(counter) is not int or counter<0):raise DomainError('invalid_policy_receipt','The persistent counter must be a nonnegative integer or null.')
        if p['result']=='accepted' and(not eligible(d) or counter is None or counter<row['body']['baseline_mwh'] or p.get('counter_epoch')!=d['meter_counter_epoch']):
            raise DomainError('counter_not_qualified','Accepting a prepaid policy requires a qualified persistent counter and matching epoch.',409)
        at=p.get('occurred_at_ms');clock=p.get('clock_quality','unknown')
        if clock not in ('trusted','estimated','unknown') or(at is not None and(type(at) is not int or at<0 or at>int(datetime.now(timezone.utc).timestamp()*1000)+60000)):
            raise DomainError('invalid_receipt_time','Policy receipt time or confidence is invalid.')
        if p['result']=='accepted' and(clock!='trusted' or at is None):raise DomainError('policy_clock_untrusted','Installing a new signed allowance requires request-bound trusted time.',409)
        query(c,'INSERT INTO device_credit_policy_receipts(policy_id,inbox_id,result,reason_code,import_mwh,observed_at_ms,clock_quality) VALUES(:id,:inbox,:result,:reason,:counter,:at,:clock)',id=row['id'],inbox=iid,result=p['result'],reason=reason,counter=counter,at=at if clock=='trusted' else None,clock=clock)
        audit(c,None,'prepaid_policy_'+p['result'],row['id'])
    return jsonify(ack)
