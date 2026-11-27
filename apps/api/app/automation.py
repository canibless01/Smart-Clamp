"""Versioned, operation-bound automation configuration. ACK is not relay feedback."""
import hashlib,re,uuid
from datetime import datetime,timezone
from flask import Blueprint,g,request,jsonify,current_app
from .db import transaction,device,one,query,rows,uuid_string,json_text,audit,DomainError
from .live_auth import authenticated
from .live_devices import credential,verified,inbox
from .idempotency import idempotent
from .protocol import canonical,sign
bp=Blueprint('automation',__name__)
DEFAULT={'daily_mwh':0,'monthly_mwh':0,'extra_daily_mwh':0,'extra_day':0,'schedule_enabled':False,'allowed_windows':[]}

def configuration(value):
    if not isinstance(value,dict) or set(value)!=set(DEFAULT):raise DomainError('invalid_automation','Supply the complete budget and schedule settings.')
    for key in ('daily_mwh','monthly_mwh','extra_daily_mwh','extra_day'):
        if type(value[key]) is not int or not 0<=value[key]<=1000000000000:raise DomainError('invalid_automation','Limits must be bounded nonnegative whole mWh.')
    if value['extra_daily_mwh'] and not value['daily_mwh']:raise DomainError('invalid_automation','An extra daily allowance requires a daily budget.')
    if value['extra_daily_mwh'] and value['extra_day']!=int((datetime.now(timezone.utc).timestamp()+3600)//86400):raise DomainError('invalid_automation','Extra daily allowance must be for the current Lagos day.')
    if type(value['schedule_enabled']) is not bool or not isinstance(value['allowed_windows'],list) or len(value['allowed_windows'])>8:raise DomainError('invalid_automation','Choose at most eight allowed-supply windows.')
    last=0
    for window in value['allowed_windows']:
        if not isinstance(window,dict) or set(window)!={'start','end'} or type(window['start']) is not int or type(window['end']) is not int or not 0<=window['start']<window['end']<=10080 or window['start']<last:raise DomainError('invalid_automation','Weekly windows must be sorted, non-overlapping and use Monday-based minutes.')
        last=window['end']
    if value['schedule_enabled'] and not value['allowed_windows']:raise DomainError('invalid_automation','Add an allowed window or disable the schedule.')
    return value

def qualified(d):
    return bool(d['automation_policy_qualified'] and d['persistent_counter_qualified'] and 'relay' in d['capabilities'] and d['install_state']=='commissioned' and d['calibration_status']=='qualified')

def resident(c,device_id):
    d=device(c,g.actor,device_id,write=True)
    if d['room_id']:query(c,'SELECT id FROM rooms WHERE id=:id FOR UPDATE',id=d['room_id'])
    query(c,'SELECT id FROM devices WHERE id=:id FOR UPDATE',id=d['id'])
    d=device(c,g.actor,device_id,write=True)
    occupant=one(c,'SELECT tenant_id FROM occupancies WHERE room_id=:room AND end_at IS NULL',room=d['room_id'])
    if g.actor['role'] not in ('tenant','homeowner') or occupant and str(occupant['tenant_id'])!=g.actor['id']:raise DomainError('resident_authority_required','Only the resident/homeowner manages this device’s automation.',403)
    return d

def latest(c,did):
    return one(c,'SELECT * FROM device_automation_policies WHERE device_id=:id ORDER BY seq DESC LIMIT 1',id=did)

def receipt_state(c,policy):
    return one(c,'SELECT result,reason_code,observed_at_ms,clock_quality,created_at FROM device_automation_receipts WHERE policy_id=:id ORDER BY observed_at_ms DESC NULLS LAST,created_at DESC LIMIT 1',id=policy['id']) if policy else None

def clear_for_transfer(c,room_id):
    # A prior resident's persistent offline policy must be explicitly disabled and acknowledged.
    for d in rows(c,'SELECT id FROM devices WHERE room_id=:room',room=room_id):
        policy=latest(c,d['id'])
        if not policy:continue
        cfg=policy['body']['settings'];receipt=receipt_state(c,policy)
        if cfg['daily_mwh'] or cfg['monthly_mwh'] or cfg['schedule_enabled'] or not receipt or receipt['result']!='accepted':raise DomainError('automation_clearance_required','Disable this room’s automation and wait for its signed device acknowledgement before changing occupancy.',409)

@bp.route('/api/v1/devices/<device_id>/automation',methods=['GET','POST'])
@authenticated
@idempotent
def settings(device_id):
    with transaction() as c:
        d=resident(c,device_id);previous=latest(c,d['id']);receipt=receipt_state(c,previous)
        ready=qualified(d);pro=g.actor['subscription_tier']=='pro';enabled=str(current_app.config.get('AUTOMATION_ENABLED','false')).lower()=='true'
        if request.method=='GET':return jsonify(id=str(previous['id']) if previous else None,version=previous['seq'] if previous else 0,settings=previous['body']['settings'] if previous else DEFAULT,
            status=receipt['result'] if receipt else 'awaiting_device' if previous else 'not_configured',receipt=dict(receipt) if receipt else None,
            can_configure=ready and pro and enabled,can_disable=ready and bool(previous),unavailable_reason=None if ready and pro and enabled else 'A qualified persistent counter, offline automation firmware and commissioned relay are required.' if not ready else 'Automation is not enabled for this rollout.' if not enabled else 'An eligible Pro plan is required for active automation.',
            physical_switching_confirmed=False,timezone='Africa/Lagos',manual_off_rule='Manual OFF remains until the resident changes it; schedules never clear protection, wallet or other restrictions.')
        data=request.get_json() or {};cfg=configuration(data.get('settings'));version=data.get('expected_version')
        if type(version) is not int or version<0:raise DomainError('invalid_automation','Supply the current settings version.')
        if not ready:raise DomainError('automation_unqualified','The installed firmware/counter/relay must be qualified before automation can be configured.',422)
        active=bool(cfg['daily_mwh'] or cfg['monthly_mwh'] or cfg['schedule_enabled'])
        if active and not enabled:raise DomainError('automation_rollout_disabled','Automation is not enabled for this rollout.',503)
        if active and not pro:raise DomainError('entitlement_required','An eligible Pro plan is required for active automation.',403)
        if version!=(previous['seq'] if previous else 0):raise DomainError('version_conflict','Settings changed. Refresh and review the current version.',409)
        operation={'device_id':str(d['id']),'expected_version':version,'settings':cfg};digest=hashlib.sha256(canonical(operation)).hexdigest()
        grant=one(c,'SELECT id FROM step_up_challenges WHERE id=:id AND user_id=:uid AND verified_at IS NOT NULL AND used_at IS NULL AND expires_at>now() AND operation_hash=:hash AND CAST(:device AS uuid)=ANY(scope_ids) FOR UPDATE',id=uuid_string(data.get('authorization_ref')),uid=g.actor['id'],hash=digest,device=d['id'])
        if not grant:raise DomainError('step_up_required','Confirm these specific budget and schedule settings.',403)
        reading=one(c,"SELECT import_mwh,occurred_at_ms FROM readings WHERE device_id=:id AND config_epoch=:epoch AND quality='valid' AND clock_quality='trusted' AND import_mwh IS NOT NULL ORDER BY occurred_at_ms DESC LIMIT 1",id=d['id'],epoch=d['config_epoch'])
        epochs_match=previous and str(previous['requested_by'])==g.actor['id'] and previous['body']['config_epoch']==d['config_epoch'] and previous['body']['counter_epoch']==d['meter_counter_epoch']
        if not epochs_match and(not reading or not 0<=datetime.now(timezone.utc).timestamp()*1000-reading['occurred_at_ms']<180000):raise DomainError('counter_observation_required','A current qualified counter observation is required to anchor the first budget.',409)
        body={'kind':'automation_policy','schema_version':1,'device_id':str(d['id']),'key_epoch':d['key_epoch'],'config_epoch':d['config_epoch'],'counter_epoch':d['meter_counter_epoch'],
              'policy_id':str(uuid.uuid4()),'policy_seq':version+1,'anchor_mwh':previous['body']['anchor_mwh'] if epochs_match else reading['import_mwh'],
              'timezone_offset_s':3600,'settings':cfg,'manual_off_rule':'preserve','requested_by':g.actor['id']}
        hash_=hashlib.sha256(canonical(body)).hexdigest()
        query(c,'INSERT INTO device_automation_policies(id,device_id,seq,requested_by,body,body_sha256) VALUES(:id,:device,:seq,:uid,CAST(:body AS jsonb),:hash)',id=body['policy_id'],device=d['id'],seq=version+1,uid=g.actor['id'],body=json_text(body),hash=hash_)
        query(c,'UPDATE step_up_challenges SET used_at=now() WHERE id=:id',id=grant['id']);audit(c,g.actor['id'],'automation_policy_requested',body['policy_id'],{'device_id':str(d['id']),'version':version+1})
    return jsonify(id=body['policy_id'],version=version+1,status='awaiting_device',physical_switching_confirmed=False),202

def offer(c,d,p):
    if not qualified(d):return None
    policy=latest(c,d['id'])
    if not policy:return None
    cfg=policy['body']['settings']
    if (cfg['daily_mwh'] or cfg['monthly_mwh'] or cfg['schedule_enabled']) and str(current_app.config.get('AUTOMATION_ENABLED','false')).lower()!='true':return None
    occupant=one(c,'SELECT tenant_id FROM occupancies WHERE room_id=:room AND end_at IS NULL',room=d['room_id'])
    subject=str(occupant['tenant_id']) if occupant else str(d['owner_id'])
    if subject!=str(policy['requested_by']) or policy['body']['key_epoch']!=d['key_epoch'] or policy['body']['config_epoch']!=d['config_epoch'] or policy['body']['counter_epoch']!=d['meter_counter_epoch']:return None
    payload={**policy['body'],'body_sha256':policy['body_sha256'],'request_boot_id':p['boot_id'],'request_seq':p['seq'],'expires_at_s':int(datetime.now(timezone.utc).timestamp())+120}
    return sign(payload,credential(c,d['id'],d['key_epoch'],'command'))

@bp.post('/api/v1/device/automation/receipts')
def policy_receipt():
    with transaction() as c:
        d,p=verified(c,request.get_json() or {})
        if p.get('kind')!='automation_policy_receipt' or p.get('result') not in ('accepted','rejected'):raise DomainError('invalid_automation_receipt','A signed policy receipt is required.')
        iid,ack,duplicate=inbox(c,d,p)
        if duplicate:return jsonify(ack)
        policy=one(c,'SELECT * FROM device_automation_policies WHERE id=:id AND device_id=:device AND seq=:seq',id=uuid_string(p.get('policy_id')),device=d['id'],seq=p.get('policy_seq'))
        if not policy or p.get('body_sha256')!=policy['body_sha256']:raise DomainError('policy_mismatch','The receipt does not match an issued automation policy.',409)
        reason=p.get('reason_code');at=p.get('occurred_at_ms');clock=p.get('clock_quality','unknown')
        if not isinstance(reason,str) or not re.fullmatch('[a-z0-9_]{1,80}',reason) or clock not in ('trusted','estimated','unknown') or(at is not None and(type(at) is not int or at<int(policy['created_at'].timestamp()*1000) or at>int(datetime.now(timezone.utc).timestamp()*1000)+60000)):raise DomainError('invalid_automation_receipt','Receipt source time or reason code is invalid.')
        if p['result']=='accepted' and(not qualified(d) or clock!='trusted' or at is None):raise DomainError('automation_unqualified','Accepting configuration requires qualified firmware and trusted device time.',409)
        query(c,'INSERT INTO device_automation_receipts(policy_id,inbox_id,result,reason_code,observed_at_ms,clock_quality) VALUES(:policy,:inbox,:result,:reason,:at,:clock)',policy=policy['id'],inbox=iid,result=p['result'],reason=reason,at=at if clock=='trusted' else None,clock=clock)
        audit(c,None,'automation_policy_'+p['result'],policy['id'])
        from .work import notify
        notify(c,policy['requested_by'],'automation.updated','Device '+p['result']+' the budget/schedule configuration. Physical relay feedback remains separate.','automation:'+str(policy['id'])+':'+p['result'],channels=[],details={'device_id':str(d['id']),'observed_at_ms':at,'policy_id':str(policy['id'])})
    return jsonify(ack)
