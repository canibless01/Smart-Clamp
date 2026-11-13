from datetime import datetime,timezone,timedelta
import base64,hashlib,secrets,re
from flask import Blueprint,request,jsonify,g,current_app
from cryptography.fernet import Fernet,InvalidToken
from .db import transaction,one,rows,query,scalar,device,DomainError,uuid_string,audit,json_text,outbox
from .live_auth import authenticated
from .idempotency import idempotent
from .providers import config
from .protocol import verify,sign,canonical
bp=Blueprint('live_devices',__name__)

def credential(c,did,epoch,direction):
    row=one(c,'SELECT encrypted_secret FROM private.device_credentials WHERE device_id=:id AND key_epoch=:epoch AND direction=:direction AND active AND revoked_at IS NULL',id=did,epoch=epoch,direction=direction)
    if not row:raise DomainError('device_unauthorized','Device credentials were not recognized.',401)
    try:key=Fernet(config('DEVICE_HMAC_ENCRYPTION_KEY').encode()).decrypt(row['encrypted_secret'].encode())
    except (InvalidToken,ValueError):raise DomainError('key_store_unavailable','The device credential store is unavailable.',503)
    if len(key)!=32:raise DomainError('key_store_invalid','The device key has an invalid length.',503)
    return key

def verified(c,envelope):
    did=uuid_string(envelope.get('device_id'));epoch=envelope.get('key_epoch')
    if type(epoch) is not int or epoch<1:raise DomainError('device_unauthorized','Device credentials are required.',401)
    key=credential(c,did,epoch,'telemetry')
    try:p=verify(envelope,key)
    except (ValueError,KeyError,TypeError):raise DomainError('device_signature_invalid','Device authentication failed.',401)
    d=one(c,'SELECT * FROM devices WHERE id=:id AND key_epoch=:epoch FOR UPDATE',id=did,epoch=epoch)
    if not d or p.get('config_epoch')!=d['config_epoch']:raise DomainError('configuration_mismatch','Device configuration must be synchronized.',409)
    return dict(d),p

def validate_identity(p):
    if not re.fullmatch('[0-9a-f]{32}',str(p.get('boot_id',''))) or type(p.get('seq')) is not int or p['seq']<1:raise DomainError('invalid_device_event','A boot identifier and positive sequence are required.')
    if type(p.get('uptime_ms',0)) is not int or p.get('uptime_ms',0)<0:raise DomainError('invalid_device_event','Uptime must be a nonnegative integer.')

def inbox(c,d,p):
    validate_identity(p);digest=hashlib.sha256(canonical(p)).hexdigest()
    prev=one(c,'SELECT * FROM device_inbox WHERE device_id=:id AND key_epoch=:epoch AND boot_id=:boot AND seq=:seq',id=d['id'],epoch=p['key_epoch'],boot=p['boot_id'],seq=p['seq'])
    ack={'device_id':str(d['id']),'key_epoch':p['key_epoch'],'boot_id':p['boot_id'],'seq':p['seq'],'payload_sha256':digest,'committed':True}
    if prev:
        if prev['payload_sha256']!=digest:raise DomainError('sequence_conflict','The same device sequence was used for different data.',409)
        return prev['id'],ack,True
    row=one(c,'INSERT INTO device_inbox(device_id,key_epoch,boot_id,seq,payload_sha256,payload_bytes,payload_hash) VALUES(:id,:epoch,:boot,:seq,:hash,CAST(:body AS jsonb),:hash) RETURNING id',id=d['id'],epoch=p['key_epoch'],boot=p['boot_id'],seq=p['seq'],hash=digest,body=json_text(p))
    query(c,'UPDATE devices SET last_seen_at=now() WHERE id=:id',id=d['id'])
    return row['id'],ack,False

@bp.post('/api/v1/device/events')
def events():
    with transaction() as c:
        d,p=verified(c,request.get_json() or {});kind=p.get('kind')
        if kind not in('telemetry','heartbeat','supply_lost','supply_returned','protection','tamper','config'):raise DomainError('unsupported_device_event','This event kind is not supported.')
        iid,ack,duplicate=inbox(c,d,p)
        if duplicate:return jsonify(ack)
        if kind=='telemetry':
            m=p.get('metrics') or {}
            if d['install_state']!='commissioned' or d['calibration_status']!='qualified':raise DomainError('device_not_commissioned','The device must be calibrated and commissioned before measurements are accepted.',409)
            if p.get('role')!=d['profile'] or p.get('clock_quality') not in('trusted','estimated','unknown') or p.get('quality') not in('valid','gap','uncalibrated','sensor_fault'):raise DomainError('invalid_device_event','Measurement role or quality is invalid.')
            for k,v in m.items():
                if k not in('voltage_mv','current_ma','real_power_mw','import_mwh','export_mwh') or type(v) is not int or(k!='real_power_mw' and v<0):raise DomainError('invalid_measurement','Measurement units must be supported integers.')
            at=p.get('occurred_at_ms')
            if at is not None and(type(at) is not int or at<0 or at>int(datetime.now(timezone.utc).timestamp()*1000)+60000):raise DomainError('invalid_measurement_time','Measurement time is invalid.')
            r=one(c,'INSERT INTO readings(device_id,inbox_id,occurred_at_ms,uptime_ms,clock_quality,config_epoch,quality,voltage_mv,current_ma,real_power_mw,import_mwh,export_mwh,is_backfilled) VALUES(:id,:inbox,:at,:uptime,:clock,:config,:quality,:voltage,:current,:power,:imported,:exported,:backfilled) RETURNING id',id=d['id'],inbox=iid,at=at,uptime=p.get('uptime_ms',0),clock=p['clock_quality'],config=p['config_epoch'],quality=p['quality'],voltage=m.get('voltage_mv'),current=m.get('current_ma'),power=m.get('real_power_mw'),imported=m.get('import_mwh'),exported=m.get('export_mwh'),backfilled=at is not None and datetime.now(timezone.utc).timestamp()*1000-at>180000)
            outbox(c,'reading_committed',d['id'],{'reading_id':str(r['id'])})
        elif kind in('supply_lost','supply_returned'):
            at=p.get('occurred_at_ms');clock=p.get('clock_quality','unknown')
            if clock not in('trusted','estimated','unknown') or(at is not None and(type(at) is not int or at<0 or at>int(datetime.now(timezone.utc).timestamp()*1000)+60000)):raise DomainError('invalid_measurement_time','Supply observation time or clock quality is invalid.')
            newer=at is not None and(d['supply_observed_at_ms'] is None or at>d['supply_observed_at_ms'])
            if newer:
                state=('absent' if kind=='supply_lost' else 'present') if clock=='trusted' else 'unknown'
                query(c,'UPDATE devices SET supply_state=:state,supply_observed_at_ms=:at,supply_clock_quality=:clock WHERE id=:id',state=state,at=at,clock=clock,id=d['id'])
            outbox(c,kind,d['id'],{'device_id':str(d['id']),'inbox_id':str(iid),'occurred_at_ms':at,'clock_quality':clock,'updates_current':newer})
        elif kind in('protection','tamper'):
            at=p.get('occurred_at_ms')
            if at is not None and(type(at) is not int or at<0 or at>int(datetime.now(timezone.utc).timestamp()*1000)+60000):raise DomainError('invalid_measurement_time','Event time is invalid.')
            active=p.get('active',True)
            if type(active) is not bool:raise DomainError('invalid_device_event','Signal state must be an explicit boolean.')
            if kind=='protection' and not active:
                m=p.get('metrics') or {};stable=p.get('stable_duration_ms')
                if type(stable) is not int or stable<300000 or type(m.get('voltage_mv')) is not int or not 180000<=m['voltage_mv']<=250000 or p.get('clock_quality')!='trusted':raise DomainError('protection_not_stable','Protection clearance requires a trusted, stable voltage observation.',409)
            query(c,'INSERT INTO device_signals(device_id,inbox_id,kind,occurred_at_ms,clock_quality,active) VALUES(:did,:iid,:kind,:at,:clock,:active)',did=d['id'],iid=iid,kind=kind,at=at,clock=p.get('clock_quality','unknown'),active=active)
            if kind=='protection':
                query(c,"INSERT INTO off_reasons(device_id,reason,scope,active) VALUES(:id,'protection','device',:active) ON CONFLICT(device_id,reason,scope) DO UPDATE SET active=:active",id=d['id'],active=active)
                if active:query(c,"UPDATE commands SET status='revoked' WHERE device_id=:id AND on_state AND status IN('pending','pending_delivery')",id=d['id'])
            outbox(c,kind,d['id'],{'device_id':str(d['id']),'inbox_id':str(iid),'active':active})
    return jsonify(ack)

@bp.post('/api/v1/device/poll')
def poll():
    with transaction() as c:
        d,p=verified(c,request.get_json() or {})
        if p.get('kind')!='poll':raise DomainError('invalid_device_event','A signed poll request is required.')
        iid,ack,duplicate=inbox(c,d,p)
        query(c,"UPDATE commands SET status='expired' WHERE device_id=:id AND expires_at<=now() AND status IN('pending','pending_delivery')",id=d['id'])
        commands=rows(c,"SELECT signed_envelope FROM commands WHERE device_id=:id AND key_epoch=:epoch AND config_epoch=:config AND policy_epoch=:policy AND expires_at>now() AND status IN('pending','pending_delivery') ORDER BY seq LIMIT 16",id=d['id'],epoch=d['key_epoch'],config=d['config_epoch'],policy=d['policy_epoch'])
        time_payload={'kind':'time','device_id':str(d['id']),'key_epoch':d['key_epoch'],'config_epoch':d['config_epoch'],'policy_epoch':d['policy_epoch'],'issued_at_s':int(datetime.now(timezone.utc).timestamp()),'request_boot_id':p['boot_id'],'request_seq':p['seq']}
        signed_time=sign(time_payload,credential(c,d['id'],d['key_epoch'],'command'))
        from .firmware import offer
        firmware=offer(c,d,p)
        from .prepaid import policy_offer
        prepaid=policy_offer(c,d,p)
    return jsonify(commands=[r['signed_envelope'] for r in commands],acks=[ack],signed_time=signed_time,firmware=firmware,prepaid_policy=prepaid)

@bp.post('/api/v1/device/receipts')
def receipt():
    with transaction() as c:
        d,p=verified(c,request.get_json() or {})
        if p.get('kind')!='command_receipt' or p.get('result') not in('applied','rejected','uncertain'):raise DomainError('invalid_receipt','A signed command receipt is required.')
        iid,ack,duplicate=inbox(c,d,p)
        if duplicate:return jsonify(ack)
        cmd=one(c,'SELECT * FROM commands WHERE command_id=:id AND device_id=:device AND seq=:seq FOR UPDATE',id=uuid_string(p.get('command_id')),device=d['id'],seq=p.get('command_seq'))
        if not cmd:raise DomainError('not_found','Command not found.',404)
        observed=p.get('observed_on')
        if observed is not None and type(observed) is not bool:raise DomainError('invalid_receipt','Observed state must be a boolean or null.')
        result=p['result']
        if result=='applied' and observed!=cmd['on_state']:result='uncertain'
        if result=='applied' and p.get('clock_quality')!='trusted':result='uncertain'
        at=p.get('observed_at_ms')
        if type(at) is not int or at<int(cmd['issued_at'].timestamp()*1000) or at>=int(cmd['expires_at'].timestamp()*1000) or at>int(datetime.now(timezone.utc).timestamp()*1000)+30000:raise DomainError('invalid_receipt_time','The physical observation must be within the command validity interval.')
        existing=one(c,'SELECT result,observed_on,observed_at_ms,reason_code FROM command_receipts WHERE command_id=:id',id=cmd['command_id'])
        if existing:
            if existing['result']!=result or existing['observed_on']!=observed or existing['observed_at_ms']!=at or existing['reason_code']!=p.get('reason_code'):raise DomainError('receipt_conflict','A different receipt already exists for this command.',409)
            return jsonify(ack)
        query(c,'INSERT INTO command_receipts(command_id,device_id,seq,result,observed_on,reason_code,observed_at_ms,payload_sha256) VALUES(:command,:device,:seq,:result,:observed,:reason,:at,:hash)',command=cmd['command_id'],device=d['id'],seq=p['command_seq'],result=result,observed=observed,reason=p.get('reason_code'),at=at,hash=ack['payload_sha256'])
        # Delivery can be delayed after a timely physical observation. Preserve the
        # receipt without allowing it to overwrite newer feedback or revive a revocation.
        if cmd['status']!='revoked':query(c,'UPDATE commands SET status=:state WHERE command_id=:id',state=result,id=cmd['command_id'])
        if observed is not None and p.get('clock_quality')=='trusted':query(c,'UPDATE devices SET relay_observed=:state,relay_observed_at=:at WHERE id=:id AND(relay_observed_at IS NULL OR relay_observed_at<:at)',state=observed,at=datetime.fromtimestamp(at/1000,timezone.utc),id=d['id'])
        audit(c,cmd['requester_id'],'command_'+result,cmd['command_id'])
    return jsonify(ack)

def issue_command(c,actor,did,on,authorization_ref,reason='user_manual'):
    d=device(c,actor,did,write=True)
    if not scalar(c,"SELECT enabled_globally FROM feature_flags WHERE key='pro_relay_control'"):raise DomainError('control_rollout_disabled','Remote control is not enabled for launch.',503)
    if 'relay' not in d['capabilities'] or d['install_state']!='commissioned':raise DomainError('capability_unavailable','This device does not have commissioned relay control.',422)
    if actor['subscription_tier']!='pro' and d['profile']!='house_full':raise DomainError('entitlement_required','An eligible control plan is required.',403)
    clock=datetime.now(timezone.utc)
    if d['last_seen_at'] is None or(clock-d['last_seen_at']).total_seconds()>180:raise DomainError('device_stale','The device must reconnect before a new control request can be sent.',409)
    row=one(c,'SELECT id,next_command_seq,key_epoch,config_epoch,policy_epoch FROM devices WHERE id=:id FOR UPDATE',id=did)
    if on:
        blocked=rows(c,"SELECT reason FROM off_reasons WHERE device_id=:id AND active AND reason<>'user_manual' AND(expires_at IS NULL OR expires_at>now())",id=did)
        if blocked:raise DomainError('power_restricted','Another active restriction must be cleared before restoring power.',409)
    seq=row['next_command_seq']+1;cid=secrets.token_hex(16);cid=str(__import__('uuid').UUID(cid));issued=int(clock.timestamp());expires=issued+120
    payload={'kind':'relay_command','device_id':str(did),'key_epoch':row['key_epoch'],'config_epoch':row['config_epoch'],'policy_epoch':row['policy_epoch'],'command_id':cid,'seq':seq,'issued_at_s':issued,'expires_at_s':expires,'on':on,'reason':reason,'authorization_ref':authorization_ref}
    envelope=sign(payload,credential(c,did,row['key_epoch'],'command'))
    query(c,'INSERT INTO commands(device_id,command_id,seq,key_epoch,config_epoch,policy_epoch,issued_at,expires_at,on_state,reason,authorization_ref,requester_id,signed_envelope) VALUES(:id,:cid,:seq,:key,:config,:policy,:issued,:expires,:on,:reason,:grant,:uid,CAST(:envelope AS jsonb))',id=did,cid=cid,seq=seq,key=row['key_epoch'],config=row['config_epoch'],policy=row['policy_epoch'],issued=datetime.fromtimestamp(issued,timezone.utc),expires=datetime.fromtimestamp(expires,timezone.utc),on=on,reason=reason,grant=authorization_ref,uid=actor['id'],envelope=json_text(envelope))
    query(c,'UPDATE devices SET next_command_seq=:seq WHERE id=:id',seq=seq,id=did)
    if reason=='user_manual':
        query(c,"INSERT INTO off_reasons(device_id,reason,active,scope,created_by) VALUES(:id,'user_manual',:active,'self',:uid) ON CONFLICT(device_id,reason,scope) DO UPDATE SET active=excluded.active",id=did,active=not on,uid=actor['id'])
    audit(c,actor['id'],'command_requested',cid,{'on':on,'reason':reason});return {'id':cid,'command_token_id':cid,'status':'pending','expires_at_s':expires}

@bp.post('/api/v1/devices/<device_id>/relay')
@authenticated
@idempotent
def relay(device_id):
    d=request.get_json() or {};target=d.get('state')
    if target not in('on','off'):raise DomainError('validation_error','Choose on or off.')
    operation_hash=hashlib.sha256(canonical({'device_id':device_id,'state':target})).hexdigest()
    with transaction() as c:
        grant=one(c,'SELECT * FROM step_up_challenges WHERE id=:id AND user_id=:uid AND verified_at IS NOT NULL AND used_at IS NULL AND expires_at>now() AND operation_hash=:hash AND CAST(:device AS uuid)=ANY(scope_ids) FOR UPDATE',id=uuid_string(d.get('authorization_ref')),uid=g.actor['id'],hash=operation_hash,device=device_id)
        if not grant:raise DomainError('step_up_required','Confirm this specific action before sending a command.',403)
        result=issue_command(c,g.actor,uuid_string(device_id),target=='on',str(grant['id']));query(c,'UPDATE step_up_challenges SET used_at=now() WHERE id=:id',id=grant['id'])
    return jsonify(result),202

@bp.get('/api/v1/devices/<device_id>/commands')
@authenticated
def commands(device_id):
    with transaction() as c:
        device(c,g.actor,device_id);items=rows(c,'SELECT command_id AS id,on_state AS requested,reason,status,created_at,expires_at FROM commands WHERE device_id=:id ORDER BY created_at DESC LIMIT 100',id=device_id)
    return jsonify(items=items,next_cursor=None)
