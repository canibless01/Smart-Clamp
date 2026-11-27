from datetime import datetime,timezone,timedelta
from decimal import Decimal
import hashlib,json,secrets,uuid
from flask import Blueprint,request,jsonify,g,current_app
from .db import transaction,one,rows,query,scalar,DomainError,device,building,audit,json_text,uuid_string,reading_since,resident_authority
from .live_auth import authenticated,staff
from .providers import validate_meter,config,electricity_services
from .idempotency import idempotent
from . import case_assignment
bp=Blueprint('live_resources',__name__)

def body():return request.get_json() or {}
def ident():return str(uuid.uuid4())
def page(items):return jsonify(items=items,next_cursor=None)
def limit():
    try:return min(100,max(1,int(request.args.get('limit',50))))
    except ValueError:raise DomainError('validation_error','A numeric page limit is required.')
def requested_text(d,key,maximum=4000):
    v=d.get(key)
    if not isinstance(v,str) or not v.strip() or len(v)>maximum:raise DomainError('validation_error',f'{key} is required and must contain at most {maximum} characters.')
    return v.strip()

def owned_device_ids(c):
    return rows(c,"""SELECT d.id FROM devices d WHERE d.owner_id=:uid OR EXISTS(SELECT 1 FROM occupancies o WHERE o.room_id=d.room_id AND o.tenant_id=:uid AND o.end_at IS NULL) OR EXISTS(SELECT 1 FROM buildings b LEFT JOIN rooms r ON r.building_id=b.id WHERE b.landlord_id=:uid AND(b.id=d.building_id OR r.id=d.room_id)) OR EXISTS(SELECT 1 FROM device_viewers v WHERE v.device_id=d.id AND v.viewer_user_id=:uid AND v.revoked_at IS NULL AND(v.expires_at IS NULL OR v.expires_at>now()))""",uid=g.actor['id'])

def financial_device_ids(c):
    # A read-only device viewer is not a wallet/ledger/bill account holder.
    return rows(c,"SELECT d.id FROM devices d WHERE (d.owner_id=:uid AND NOT EXISTS(SELECT 1 FROM occupancies o WHERE o.room_id=d.room_id AND o.end_at IS NULL AND o.tenant_id<>:uid)) OR EXISTS(SELECT 1 FROM occupancies o WHERE o.room_id=d.room_id AND o.tenant_id=:uid AND o.end_at IS NULL)",uid=g.actor['id'])

def projection(c):
    from .live_devices import control_eligibility
    devices=[];financial_ids={str(row['id']) for row in financial_device_ids(c)}
    for d in owned_device_ids(c):
        dev=device(c,g.actor,d['id']);r=one(c,"SELECT r.* FROM readings r WHERE r.device_id=:id AND(CAST(:since AS timestamptz) IS NULL OR r.occurred_at_ms>=extract(epoch FROM CAST(:since AS timestamptz))*1000) ORDER BY r.occurred_at_ms DESC NULLS LAST,r.received_at DESC LIMIT 1",id=d['id'],role=g.actor['role'],room=dev['room_id'],uid=g.actor['id'],since=reading_since(c,g.actor,dev));wallet=one(c,'SELECT * FROM wallets WHERE device_id=:id',id=d['id']) if str(d['id']) in financial_ids else None;at=datetime.fromtimestamp(r['occurred_at_ms']/1000,timezone.utc) if r and r['occurred_at_ms'] is not None else None
        fresh=at and 0<=(datetime.now(timezone.utc)-at).total_seconds()<180
        pending=one(c,"SELECT command_id FROM commands WHERE device_id=:id AND status IN('pending','pending_delivery') AND expires_at>now() ORDER BY created_at DESC LIMIT 1",id=d['id'])
        devices.append({'id':str(dev['id']),'role':dev['profile'],'capabilities':dev['capabilities'],'supply_state':dev['supply_state'] if dev['supply_clock_quality']=='trusted' and dev['supply_observed_at_ms'] is not None and 0<=datetime.now(timezone.utc).timestamp()*1000-dev['supply_observed_at_ms']<180000 else 'unknown','connectivity':'online' if dev['last_seen_at'] and (datetime.now(timezone.utc)-dev['last_seen_at']).total_seconds()<180 else 'stale' if dev['last_seen_at'] else 'unknown','relay':{'observed':dev['relay_observed'],'observed_at':dev['relay_observed_at'],'pending_command_id':pending['command_id'] if pending else None,'off_reasons':[x['reason'] for x in rows(c,"SELECT reason FROM off_reasons WHERE device_id=:id AND active AND(expires_at IS NULL OR expires_at>now())",id=d['id'])]},'measurement':{'value':float(Decimal(r['real_power_mw'])/1000) if r and r['real_power_mw'] is not None else None,'unit':'W','observed_at':at,'quality':r['quality'] if r else 'unavailable','coverage':None},'wallet':{'id':wallet['id'],'available':wallet['available_kobo'],'reserved':wallet['reserved_kobo'],'available_mwh':wallet['available_mwh'],'unit':'kobo','ledger_version':wallet['ledger_version'],'updated_at':wallet['updated_at'],'payment_token':wallet['payment_token']} if wallet else None})
        authority=resident_authority(c,g.actor,dev)
        devices[-1]['access']={'can_issue_report':authority,'can_control':g.actor['role'] in ('tenant','homeowner') and authority,'can_view_finances':bool(wallet)}
        latest=one(c,"SELECT c.command_id AS id,c.on_state AS requested,CASE WHEN c.status IN('pending','pending_delivery') AND c.expires_at<=now() THEN 'expired' ELSE c.status END AS status,c.expires_at,r.result,r.observed_on,r.observed_at_ms,r.reason_code FROM commands c LEFT JOIN command_receipts r ON r.command_id=c.command_id WHERE c.device_id=:id ORDER BY c.created_at DESC LIMIT 1",id=d['id'])
        devices[-1]['relay']['latest_command']=dict(latest) if latest else None
        voltage=r['voltage_mv'] if r else None
        manifest=one(c,'SELECT version,channels,calibration_version FROM device_channel_manifests WHERE device_id=:id',id=d['id'])
        devices[-1]['channel_manifest']=dict(manifest) if manifest else None
        from .business_rules import advisory_band
        voltage_band=advisory_band(c,dev,'voltage')
        band={'low_v':voltage_band[0]/1000,'high_v':voltage_band[1]/1000} if voltage_band else None
        if voltage_band:low,high=voltage_band
        voltage_status='unknown'
        if fresh and r['quality']=='valid' and r['clock_quality']=='trusted' and voltage is not None:
            if devices[-1]['supply_state']=='absent':voltage_status='no_supply'
            elif band:voltage_status='low' if voltage<low else 'high' if voltage>high else 'within_band'
            else:voltage_status='limits_unconfigured'
        current_limits=advisory_band(c,dev,'current')
        current_band=[value/1000 for value in current_limits] if current_limits else None
        current_status='unknown'
        if current_band and fresh and r['quality']=='valid' and r['clock_quality']=='trusted' and r['current_ma'] is not None:
            current_status='low' if r['current_ma']/1000<current_band[0] else 'high' if r['current_ma']/1000>current_band[1] else 'within_band'
        devices[-1]['electrical']={'voltage_v':voltage/1000 if voltage is not None else None,'current_a':r['current_ma']/1000 if r and r['current_ma'] is not None else None,'observed_at':at,'quality':r['quality'] if r else 'unavailable','clock_quality':r['clock_quality'] if r else 'unknown','voltage_status':voltage_status,'warning_band':band,'advisory_only':True,'current_warning_band':current_band,'current_status':current_status}
        allowed,code,message,_=control_eligibility(c,g.actor,dev)
        devices[-1]['controls']={'can_request':allowed,'unavailable_code':code,'unavailable_reason':message}
    usage=[];electrical_history=[]
    if devices:
        samples=rows(c,"""SELECT r.occurred_at_ms,r.voltage_mv,r.current_ma,r.real_power_mw,r.quality,r.clock_quality FROM readings r
          WHERE r.device_id=:id AND(CAST(:since AS timestamptz) IS NULL OR r.occurred_at_ms>=extract(epoch FROM CAST(:since AS timestamptz))*1000)
          ORDER BY r.occurred_at_ms DESC NULLS LAST,r.received_at DESC LIMIT 120""",id=devices[0]['id'],room=one(c,'SELECT room_id FROM devices WHERE id=:id',id=devices[0]['id'])['room_id'],role=g.actor['role'],uid=g.actor['id'],since=reading_since(c,g.actor,device(c,g.actor,devices[0]['id'])))
        for sample in reversed(samples):
            valid=sample['quality']=='valid' and sample['clock_quality']=='trusted'
            electrical_history.append({'at':sample['occurred_at_ms'],'voltage':sample['voltage_mv']/1000 if valid and sample['voltage_mv'] is not None else None,'current':sample['current_ma']/1000 if valid and sample['current_ma'] is not None else None,'power':sample['real_power_mw']/1000 if valid and sample['real_power_mw'] is not None else None})
        periods=rows(c,"""SELECT r.occurred_at_ms,u.consumed_mwh FROM usage_postings u JOIN readings r ON r.id=u.reading_id
          WHERE r.device_id=:id AND u.accounting_quality='measured'
          AND(CAST(:since AS timestamptz) IS NULL OR u.interval_start_ms>=extract(epoch FROM CAST(:since AS timestamptz))*1000)
          ORDER BY r.occurred_at_ms DESC LIMIT 24""",id=devices[0]['id'],role=g.actor['role'],uid=g.actor['id'],since=reading_since(c,g.actor,device(c,g.actor,devices[0]['id'])))
        usage=[{'time':datetime.fromtimestamp(p['occurred_at_ms']/1000,timezone(timedelta(hours=1))).strftime('%d %b %H:%M'),'kwh':p['consumed_mwh']/1000000} for p in reversed(periods)]
    actions=['view_dashboard','recharge'] if any(item['wallet'] for item in devices) else ['view_dashboard']
    if any(d['controls']['can_request'] for d in devices):actions.append('relay_toggle')
    return {'snapshot_version':int(scalar(c,"SELECT coalesce(max(id),0) FROM audit_log WHERE actor_id=:uid",uid=g.actor['id']) or 0),'generated_at':datetime.now(timezone.utc),'usage_history':usage,'electrical_history':electrical_history,'authorized_context':{'user_id':g.actor['id'],'role':g.actor['role']},'devices':devices,'allowed_actions':actions}

@bp.get('/api/v1/dashboard/tenant')
@bp.get('/api/v1/dashboard/homeowner')
@bp.get('/api/v1/dashboard/landlord')
@authenticated
def dashboard():
    expected=request.path.rsplit('/',1)[-1]
    if g.actor['role']!=expected:raise DomainError('forbidden','This dashboard is not available for your role.',403)
    with transaction() as c:return jsonify(projection(c))

@bp.get('/api/v1/buildings')
@authenticated
def buildings_list():
    with transaction() as c:
        result=[]
        for b in rows(c,'SELECT * FROM buildings WHERE landlord_id=:uid ORDER BY created_at,id LIMIT :limit',uid=g.actor['id'],limit=limit()):
            readings=rows(c,"""SELECT room.id,r.real_power_mw,r.occurred_at_ms,r.quality,r.clock_quality FROM rooms room
              LEFT JOIN LATERAL(SELECT id FROM devices WHERE room_id=room.id ORDER BY id LIMIT 1)d ON true
              LEFT JOIN LATERAL(SELECT real_power_mw,occurred_at_ms,quality,clock_quality FROM readings WHERE device_id=d.id ORDER BY occurred_at_ms DESC NULLS LAST,received_at DESC LIMIT 1)r ON true
              WHERE room.building_id=:id""",id=b['id'])
            now_ms=datetime.now(timezone.utc).timestamp()*1000
            fresh=[r for r in readings if r['real_power_mw'] is not None and r['occurred_at_ms'] is not None and 0<=now_ms-r['occurred_at_ms']<180000 and r['quality']=='valid' and r['clock_quality']=='trusted']
            result.append({**dict(b),'monitoring':{'room_count':len(readings),'current_room_count':len(fresh),'room_total_w':sum(r['real_power_mw'] for r in fresh)/1000 if readings and len(fresh)==len(readings) else None}})
        return page(result)

@bp.post('/api/v1/buildings')
@authenticated
@idempotent
def buildings_create():
    staff('landlord');d=body();name=requested_text(d,'name',150);address=requested_text(d,'address',1000)
    if d.get('meter_type')!='with_meter':raise DomainError('not_available','Unmetered-building billing requires an approved settlement policy.',422)
    with transaction() as c:
        bid=ident();query(c,'INSERT INTO buildings(id,landlord_id,name,address,meter_type) VALUES(:id,:uid,:name,:address,:meter)',id=bid,uid=g.actor['id'],name=name,address=address,meter=d['meter_type']);audit(c,g.actor['id'],'building_created',bid)
    return jsonify(building_id=bid),201

@bp.route('/api/v1/buildings/<building_id>/rooms',methods=['GET','POST'])
@authenticated
def rooms_route(building_id):
    with transaction() as c:
        building(c,g.actor,building_id)
        if request.method=='GET':
            items=rows(c,"""SELECT room.*,d.id AS device_id,o.tenant_id,p.full_name AS tenant_name,
              d.supply_state,d.supply_observed_at_ms,d.supply_clock_quality,
              reading.real_power_mw,reading.voltage_mv,reading.current_ma,reading.occurred_at_ms,reading.quality,reading.clock_quality,
              (SELECT sum(u.consumed_mwh) FROM usage_postings u JOIN readings source ON source.id=u.reading_id WHERE source.device_id=d.id AND u.accounting_quality='measured'
                AND u.interval_start_ms>=extract(epoch FROM(date_trunc('day',now() AT TIME ZONE 'Africa/Lagos') AT TIME ZONE 'Africa/Lagos'))*1000) AS today_mwh
              FROM rooms room LEFT JOIN occupancies o ON o.room_id=room.id AND o.end_at IS NULL LEFT JOIN profiles p ON p.id=o.tenant_id
              LEFT JOIN LATERAL(SELECT * FROM devices WHERE room_id=room.id ORDER BY id LIMIT 1)d ON true
              LEFT JOIN LATERAL(SELECT * FROM readings WHERE device_id=d.id ORDER BY occurred_at_ms DESC NULLS LAST,received_at DESC LIMIT 1)reading ON true
              WHERE room.building_id=:id ORDER BY room.label""",id=building_id)
            result=[];now_ms=datetime.now(timezone.utc).timestamp()*1000
            for row in items:
                fresh=row['occurred_at_ms'] is not None and 0<=now_ms-row['occurred_at_ms']<180000 and row['quality']=='valid' and row['clock_quality']=='trusted'
                supply=row['supply_state'] if row['supply_observed_at_ms'] is not None and 0<=now_ms-row['supply_observed_at_ms']<180000 and row['supply_clock_quality']=='trusted' else 'unknown'
                result.append({**{k:row[k] for k in('id','building_id','label','created_at','device_id','tenant_id','tenant_name')},'monitoring':{'supply_state':supply,'power_w':row['real_power_mw']/1000 if row['real_power_mw'] is not None else None,'voltage_v':row['voltage_mv']/1000 if row['voltage_mv'] is not None else None,'current_a':row['current_ma']/1000 if row['current_ma'] is not None else None,'recorded_today_kwh':float(row['today_mwh'])/1000000 if row['today_mwh'] is not None else None,'fresh':fresh,'observed_at':datetime.fromtimestamp(row['occurred_at_ms']/1000,timezone.utc) if row['occurred_at_ms'] is not None else None}})
            return page(result)
        d=body();rid=ident();query(c,'INSERT INTO rooms(id,building_id,label) VALUES(:id,:bid,:label)',id=rid,bid=building_id,label=requested_text(d,'label',150));audit(c,g.actor['id'],'room_created',rid)
    return jsonify(room_id=rid),201

@bp.post('/api/v1/rooms/<room_id>/invitations')
@authenticated
@idempotent
def invitations(room_id):
    with transaction() as c:
        room=one(c,'SELECT * FROM rooms WHERE id=:id',id=uuid_string(room_id))
        if not room:raise DomainError('not_found','Room not found.',404)
        building(c,g.actor,room['building_id']);token=secrets.token_urlsafe(32)
        inv=one(c,"INSERT INTO invitations(room_id,token,invited_by,expires_at) VALUES(:rid,:token,:uid,now()+interval '7 days') RETURNING id,expires_at",rid=room_id,token=token,uid=g.actor['id'])
        return jsonify({**dict(inv),'invite_link':'/join?token='+token}),201

@bp.post('/api/v1/invitations/accept')
@bp.post('/api/v1/rooms/<room_id>/join')
@authenticated
@idempotent
def accept_invitation(room_id=None):
    with transaction() as c:
        inv=one(c,'SELECT * FROM invitations WHERE token=:token AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at>now() FOR UPDATE',token=body().get('token',''))
        if not inv or(room_id and str(inv['room_id'])!=room_id):raise DomainError('not_found','This invitation is invalid or expired.',404)
        if g.actor['role']!='tenant':raise DomainError('forbidden','A tenant account is required.',403)
        query(c,'SELECT id FROM rooms WHERE id=:id FOR UPDATE',id=inv['room_id'])
        from .automation import clear_for_transfer
        clear_for_transfer(c,inv['room_id'])
        query(c,'UPDATE device_viewers SET revoked_at=now() WHERE device_id IN(SELECT id FROM devices WHERE room_id=:id)',id=inv['room_id'])
        query(c,'INSERT INTO occupancies(room_id,tenant_id) VALUES(:rid,:uid)',rid=inv['room_id'],uid=g.actor['id']);query(c,'UPDATE invitations SET accepted_at=now(),accepted_by=:uid WHERE id=:id',uid=g.actor['id'],id=inv['id']);audit(c,g.actor['id'],'invitation_accepted',inv['room_id'])
    return jsonify(status='joined',room_id=inv['room_id'])

@bp.delete('/api/v1/invitations/<invitation_id>')
@authenticated
def revoke_invitation(invitation_id):
    with transaction() as c:
        r=query(c,'UPDATE invitations SET revoked_at=now() WHERE id=:id AND invited_by=:uid AND accepted_at IS NULL',id=uuid_string(invitation_id),uid=g.actor['id'])
        if not r.rowcount:raise DomainError('not_found','Invitation not found.',404)
    return jsonify(status='revoked')

@bp.get('/api/v1/rooms/<room_id>/occupancies')
@authenticated
def occupancy_history(room_id):
    with transaction() as c:
        room=one(c,'SELECT * FROM rooms WHERE id=:id',id=uuid_string(room_id))
        if not room:raise DomainError('not_found','Room not found.',404)
        building(c,g.actor,room['building_id']);return page(rows(c,'SELECT * FROM occupancies WHERE room_id=:id ORDER BY start_at DESC',id=room_id))

@bp.post('/api/v1/rooms/<room_id>/transfer')
@authenticated
@idempotent
def transfer(room_id):
    with transaction() as c:
        room=one(c,'SELECT * FROM rooms WHERE id=:id FOR UPDATE',id=uuid_string(room_id))
        if not room:raise DomainError('not_found','Room not found.',404)
        building(c,g.actor,room['building_id'])
        from .automation import clear_for_transfer
        clear_for_transfer(c,room_id)
        device_ids=rows(c,'SELECT id FROM devices WHERE room_id=:room ORDER BY id FOR UPDATE',room=room_id)
        pending=scalar(c,"SELECT count(*) FROM outbox WHERE aggregate_id=ANY(CAST(:ids AS uuid[])) AND event_type='reading_committed' AND status<>'done'",ids=[item['id'] for item in device_ids]) if device_ids else 0
        if pending:raise DomainError('usage_settlement_pending','Process the room’s outstanding measurements before settling and transferring occupancy.',409)
        owing=scalar(c,'SELECT count(*) FROM wallets w JOIN devices d ON d.id=w.device_id WHERE d.room_id=:id AND (w.available_mwh>0 OR w.reserved_mwh>0 OR w.unpaid_mwh>0 OR w.available_kobo>0)',id=room_id)
        if owing:raise DomainError('settlement_required','Settle the outgoing resident’s balance before transferring this room.',409)
        tenant=one(c,"SELECT id FROM profiles WHERE id=:id AND role='tenant'",id=uuid_string(body().get('tenant_id')))
        if not tenant:raise DomainError('not_found','Tenant not found.',404)
        query(c,'UPDATE occupancies SET end_at=now() WHERE room_id=:id AND end_at IS NULL',id=room_id);query(c,'INSERT INTO occupancies(room_id,tenant_id) VALUES(:id,:uid)',id=room_id,uid=tenant['id']);query(c,'UPDATE device_viewers SET revoked_at=now() WHERE device_id IN(SELECT id FROM devices WHERE room_id=:id)',id=room_id);audit(c,g.actor['id'],'room_transferred',room_id)
    return jsonify(status='transferred')

@bp.get('/api/v1/devices/<device_id>')
@authenticated
def details(device_id):
    with transaction() as c:
        d=device(c,g.actor,device_id)
        from .prepaid import state
        return jsonify({**{k:d[k] for k in('id','profile','capabilities','config_epoch','calibration_status','last_seen_at','install_state','firmware_version')},'prepaid_policy':state(c,d) if any(str(item['id'])==str(d['id']) for item in financial_device_ids(c)) else None,'can_manage_automation':bool(g.actor['role'] in ('tenant','homeowner') and 'relay' in d['capabilities'] and (str(d['owner_id'])==g.actor['id'] or one(c,'SELECT id FROM occupancies WHERE room_id=:room AND tenant_id=:uid AND end_at IS NULL',room=d['room_id'],uid=g.actor['id'])) and not one(c,'SELECT tenant_id FROM occupancies WHERE room_id=:room AND end_at IS NULL AND tenant_id<>:uid',room=d['room_id'],uid=g.actor['id'])),'can_manage_viewers':bool((not one(c,'SELECT tenant_id FROM occupancies WHERE room_id=:room AND end_at IS NULL AND tenant_id<>:uid',room=d['room_id'],uid=g.actor['id'])) and (str(d['owner_id'])==str(g.actor['id']) or one(c,'SELECT id FROM occupancies WHERE room_id=:room AND tenant_id=:uid AND end_at IS NULL',room=d['room_id'],uid=g.actor['id'])))})

@bp.get('/api/v1/devices/<device_id>/events')
@authenticated
def history(device_id):
    with transaction() as c:
        d=device(c,g.actor,device_id)
        # A current tenant sees only its active occupancy interval, even if the device predates it.
        return page(rows(c,"""SELECT r.id,r.occurred_at_ms,r.quality,r.clock_quality,r.voltage_mv,r.current_ma,r.real_power_mw,r.import_mwh,r.export_mwh FROM readings r WHERE r.device_id=:id AND(CAST(:since AS timestamptz) IS NULL OR r.occurred_at_ms>=extract(epoch FROM CAST(:since AS timestamptz))*1000) ORDER BY r.occurred_at_ms DESC NULLS LAST LIMIT :limit""",id=device_id,role=g.actor['role'],room=d['room_id'],uid=g.actor['id'],since=reading_since(c,g.actor,d),limit=limit()))

@bp.get('/api/v1/feature-flags/active')
@authenticated
def flags():
    with transaction() as c:
        flags=rows(c,'SELECT key FROM feature_flags WHERE enabled_globally AND (:tier=ANY(enabled_for_tiers) OR enabled_for_tiers IS NULL)',tier=g.actor['subscription_tier'])
    return jsonify(active_flags=[f['key'] for f in flags])

@bp.post('/api/v1/meters/validate')
def meter_validate():
    d=body()
    if d.get('utility_type','electricity')!='electricity':raise DomainError('unsupported_utility','This utility provider has not been configured.',503)
    return jsonify(validate_meter(d.get('meter_number',''),d.get('service_id')))

@bp.post('/api/v1/meters/link')
@authenticated
def link_meter():
    d=body();number=str(d.get('meter_number',''));validated=validate_meter(number,d.get('service_id'))
    if not validated['valid']:raise DomainError('meter_not_found','The meter provider could not validate this account.',422)
    with transaction() as c:
        record=one(c,"INSERT INTO linked_meters(owner_id,meter_number,disco_name,provider,validated_at,status) VALUES(:uid,:number,:disco,'vtpass',now(),'pending') ON CONFLICT(owner_id,disco_name,meter_number) DO UPDATE SET validated_at=now() RETURNING *",uid=g.actor['id'],number=number,disco=validated['disco_name'])
        # A meter-payment destination does not require a SmartClamp or pretend to
        # expose meter balance/history. A current approved tariff is still required.
        query(c,'INSERT INTO wallets(linked_meter_id) VALUES(:id) ON CONFLICT(linked_meter_id) DO NOTHING',id=record['id'])
    return jsonify({**dict(record),'connection_status':'Account validated; live optical readings require a supported installed reader.'}),201

@bp.post('/api/v1/meters/<linked_meter_id>/manual-reading')
@authenticated
def manual_reading(linked_meter_id):
    d=body()
    try:value=Decimal(str(d['reading_kwh']));at=datetime.fromisoformat(d['recorded_at'].replace('Z','+00:00'))
    except Exception:raise DomainError('validation_error','A non-negative reading and timestamp are required.')
    if not value.is_finite() or value<0 or at.tzinfo is None or at>datetime.now(timezone.utc):raise DomainError('validation_error','Reading or timestamp is invalid.')
    with transaction() as c:
        if not one(c,'SELECT id FROM linked_meters WHERE id=:id AND owner_id=:uid',id=uuid_string(linked_meter_id),uid=g.actor['id']):raise DomainError('not_found','Meter not found.',404)
        row=one(c,'INSERT INTO manual_readings(linked_meter_id,entered_by,reading_kwh,recorded_at) VALUES(:id,:uid,:v,:at) RETURNING id',id=linked_meter_id,uid=g.actor['id'],v=value,at=at)
    return jsonify(id=row['id'],status='recorded',source='manual'),201

def manage_viewers(c,device_id):
    d=device(c,g.actor,device_id,write=True)
    # Match occupancy-transfer lock order so a concurrent grant cannot survive move-in/out.
    if d['room_id']:query(c,'SELECT id FROM rooms WHERE id=:id FOR UPDATE',id=d['room_id'])
    query(c,'SELECT id FROM devices WHERE id=:id FOR UPDATE',id=d['id'])
    occupant=one(c,'SELECT tenant_id FROM occupancies WHERE room_id=:room AND end_at IS NULL ORDER BY start_at DESC LIMIT 1',room=d['room_id'])
    if occupant and str(occupant['tenant_id'])!=str(g.actor['id']):
        raise DomainError('resident_authority_required','The current resident manages shared access to this room.',403)
    return d

@bp.route('/api/v1/devices/<device_id>/viewers',methods=['GET','POST'])
@authenticated
def viewers(device_id):
    with transaction() as c:
        manage_viewers(c,device_id)
        if request.method=='GET':
            return page(rows(c,"SELECT v.id,v.viewer_user_id,p.full_name,v.created_at,v.expires_at,CASE WHEN v.expires_at<=now() THEN 'expired' ELSE 'active' END AS status FROM device_viewers v JOIN profiles p ON p.id=v.viewer_user_id WHERE v.device_id=:id AND v.revoked_at IS NULL ORDER BY v.created_at DESC",id=device_id))
        data=body();phone=data.get('viewer_phone');email=data.get('viewer_email')
        if bool(phone)==bool(email) or (phone is not None and (not isinstance(phone,str) or len(phone)>32)) or (email is not None and (not isinstance(email,str) or len(email)>254)):
            raise DomainError('validation_error','Enter one registered phone number or email address.')
        expiry=data.get('expires_in_hours',24)
        if expiry is not None and(type(expiry) is not int or not 1<=expiry<=8760):raise DomainError('validation_error','Guest access must last between 1 hour and 365 days, or choose ongoing access.')
        viewer=one(c,'SELECT id FROM profiles WHERE '+('phone=:contact' if phone else 'lower(email)=:contact'),contact=phone.strip() if phone else email.strip().lower())
        if not viewer:raise DomainError('not_found','The invited viewer needs an account.',404)
        if str(viewer['id'])==str(g.actor['id']):raise DomainError('validation_error','Choose another account to share with.')
        expires=datetime.now(timezone.utc)+timedelta(hours=expiry) if expiry is not None else None
        row=one(c,"INSERT INTO device_viewers(device_id,viewer_user_id,added_by,expires_at) VALUES(:id,:v,:uid,:expires) ON CONFLICT(device_id,viewer_user_id) DO UPDATE SET revoked_at=NULL,created_at=now(),added_by=excluded.added_by,expires_at=excluded.expires_at RETURNING id,expires_at",id=device_id,v=viewer['id'],uid=g.actor['id'],expires=expires)
        audit(c,g.actor['id'],'viewer_added',device_id,{'viewer_user_id':str(viewer['id']),'expires_at':expires.isoformat() if expires else None})
    return jsonify(id=row['id'],status='active',expires_at=row['expires_at']),201

@bp.delete('/api/v1/devices/<device_id>/viewers/<viewer_id>')
@authenticated
def revoke_viewer(device_id,viewer_id):
    with transaction() as c:
        manage_viewers(c,device_id)
        row=one(c,'UPDATE device_viewers SET revoked_at=now() WHERE id=:id AND device_id=:d AND revoked_at IS NULL RETURNING viewer_user_id',id=uuid_string(viewer_id),d=device_id)
        if not row:raise DomainError('not_found','Shared access not found.',404)
        audit(c,g.actor['id'],'viewer_revoked',device_id,{'viewer_user_id':str(row['viewer_user_id'])})
    return jsonify(status='revoked')

@bp.get('/api/v1/alerts')
@authenticated
def alerts():
    with transaction() as c:return page(rows(c,"SELECT n.id,n.episode_id,n.template_key,n.channel,n.status,n.payload,n.created_at,i.acknowledged_at,i.snoozed_until FROM notifications n LEFT JOIN notification_interactions i ON i.notification_id=n.id AND i.recipient_id=:uid WHERE n.recipient_id=:uid ORDER BY n.created_at DESC LIMIT :n",uid=g.actor['id'],n=limit()))

@bp.post('/api/v1/alerts/<alert_id>/acknowledge')
@authenticated
def acknowledge(alert_id):
    with transaction() as c:
        found=one(c,"SELECT id FROM notifications WHERE id=:id AND recipient_id=:uid AND channel='in_app'",id=uuid_string(alert_id),uid=g.actor['id'])
        if not found:raise DomainError('not_found','Notification not found.',404)
        query(c,"INSERT INTO notification_interactions(notification_id,recipient_id,acknowledged_at) VALUES(:id,:uid,now()) ON CONFLICT(notification_id) DO UPDATE SET acknowledged_at=coalesce(notification_interactions.acknowledged_at,now()),snoozed_until=NULL,updated_at=now()",id=alert_id,uid=g.actor['id'])
        audit(c,g.actor['id'],'notification_acknowledged',alert_id)
    return jsonify(status='acknowledged')

@bp.post('/api/v1/alerts/<alert_id>/snooze')
@authenticated
def snooze_alert(alert_id):
    minutes=body().get('minutes',15)
    if type(minutes) is not int or not 1<=minutes<=1440:raise DomainError('validation_error','Snooze must be between one minute and one day.')
    with transaction() as c:
        if not one(c,"SELECT id FROM notifications WHERE id=:id AND recipient_id=:uid AND channel='in_app'",id=uuid_string(alert_id),uid=g.actor['id']):raise DomainError('not_found','Notification not found.',404)
        until=datetime.now(timezone.utc)+timedelta(minutes=minutes)
        query(c,"INSERT INTO notification_interactions(notification_id,recipient_id,snoozed_until) VALUES(:id,:uid,:until) ON CONFLICT(notification_id) DO UPDATE SET snoozed_until=excluded.snoozed_until,updated_at=now()",id=alert_id,uid=g.actor['id'],until=until)
        audit(c,g.actor['id'],'notification_snoozed',alert_id)
    return jsonify(status='snoozed',snoozed_until=until)

@bp.route('/api/v1/support/tickets',methods=['GET','POST'])
@authenticated
@idempotent
def support():
    with transaction() as c:
        if request.method=='GET':
            try:offset=int(request.args.get('offset',0))
            except ValueError:raise DomainError('validation_error','Use a numeric queue offset.')
            if not 0<=offset<=100000:raise DomainError('validation_error','Queue offset is outside the supported range.')
            n=limit();items=rows(c,'SELECT * FROM support_tickets WHERE reporter_id=:uid OR :support ORDER BY opened_at DESC,id DESC LIMIT :n OFFSET :offset',uid=g.actor['id'],support=g.actor['role'] in ('internal_support','internal_superadmin'),n=n+1,offset=offset)
            return jsonify(items=items[:n],next_cursor=str(offset+n) if len(items)>n else None)
        d=body();category=d.get('category')
        if category not in('payment','device','billing','installation','account','other'):raise DomainError('validation_error','Select a supported category.')
        if d.get('device_id'):device(c,g.actor,d['device_id'])
        r=one(c,'INSERT INTO support_tickets(reporter_id,category,subject,message,scope_device_id) VALUES(:uid,:cat,:subject,:message,:device) RETURNING id,status',uid=g.actor['id'],cat=category,subject=requested_text(d,'subject',200),message=requested_text(d,'message'),device=d.get('device_id'));audit(c,g.actor['id'],'support_ticket_created',r['id'])
        return jsonify(dict(r)),201

def ticket_access(c,ticket_id):
    row=one(c,'SELECT * FROM support_tickets WHERE id=:id AND(reporter_id=:uid OR :support) FOR UPDATE',id=uuid_string(ticket_id),uid=g.actor['id'],support=g.actor['role'] in ('internal_support','internal_superadmin'))
    if not row:raise DomainError('not_found','Support request not found.',404)
    return row

@bp.get('/api/v1/support/tickets/<ticket_id>')
@authenticated
def ticket_detail(ticket_id):
    with transaction() as c:
        r=ticket_access(c,ticket_id);reviewers=case_assignment.responders(c,('internal_support','internal_superadmin'));messages=rows(c,'SELECT author_id,message,created_at FROM support_messages WHERE ticket_id=:id ORDER BY created_at',id=ticket_id)
        review=one(c,'SELECT review.signal_id,review.job_id,j.status AS inspection_status,s.kind,s.active,s.occurred_at_ms,s.clock_quality,i.payload_sha256 AS signed_payload_sha256,i.key_epoch,i.seq FROM signal_reviews review JOIN device_signals s ON s.id=review.signal_id JOIN device_inbox i ON i.id=s.inbox_id LEFT JOIN jobs j ON j.id=review.job_id WHERE review.ticket_id=:id',id=ticket_id)
    return jsonify({**dict(r),'signal_review':dict(review) if review else None,'messages':messages,'can_manage':g.actor['role'] in ('internal_support','internal_superadmin'),'assigned_to_me':str(r['assigned_to'])==g.actor['id'],'responders':reviewers,'can_assign':g.actor['role']=='internal_superadmin'})

@bp.post('/api/v1/support/tickets/<ticket_id>/messages')
@authenticated
@idempotent
def ticket_message(ticket_id):
    with transaction() as c:
        ticket=ticket_access(c,ticket_id)
        if ticket['status']=='resolved':raise DomainError('ticket_resolved','Reopen this request before replying.',409)
        r=one(c,'INSERT INTO support_messages(ticket_id,author_id,message) VALUES(:id,:uid,:msg) RETURNING id,created_at',id=ticket_id,uid=g.actor['id'],msg=requested_text(body(),'message'));audit(c,g.actor['id'],'support_message_added',ticket_id)
        recipient=ticket['assigned_to'] if str(ticket['reporter_id'])==g.actor['id'] else ticket['reporter_id']
        if recipient and str(recipient)!=g.actor['id']:
            from .work import notify
            notify(c,str(recipient),'support.updated','A new reply is saved in your private support request. Open Support requests to review it.','support-message:'+str(r['id']))
    return jsonify(dict(r)),201

@bp.post('/api/v1/support/tickets/<ticket_id>/workflow')
@authenticated
@idempotent
def ticket_workflow(ticket_id):
    d=body();action=d.get('action');note=requested_text(d,'note')
    if type(d.get('version')) is not int:raise DomainError('validation_error','Supply the current request version.')
    with transaction() as c:
        ticket=ticket_access(c,ticket_id)
        if ticket['version']!=d['version']:raise DomainError('version_conflict','This request changed. Refresh before continuing.',409)
        operator=g.actor['role'] in ('internal_support','internal_superadmin')
        status=ticket['status'];assignee=ticket['assigned_to']
        if action=='reopen':
            if status!='resolved':raise DomainError('invalid_transition','Only resolved requests can be reopened.',409)
            if not operator and str(ticket['reporter_id'])!=g.actor['id']:raise DomainError('forbidden','Only the reporter or support staff can reopen this request.',403)
            status='reopened'
        else:
            staff('internal_support','internal_superadmin')
            if action in ('assign','release'):
                if status=='resolved':raise DomainError('invalid_transition','Reopen this request before changing its assignee.',409)
                assignee=case_assignment.change(c,action,assignee,d.get('assignee_id'),('internal_support','internal_superadmin'))
                status='open' if action=='release' else 'triaged' if status=='open' else status
            elif action=='claim':
                if status=='resolved':raise DomainError('invalid_transition','Reopen this request before claiming it.',409)
                if assignee and str(assignee)!=g.actor['id']:raise DomainError('already_assigned','Another support colleague owns this request.',409)
                assignee=g.actor['id'];status='triaged' if status=='open' else status
            elif action in ('waiting_customer','waiting_provider','resolve'):
                if not assignee or str(assignee)!=g.actor['id']:raise DomainError('claim_required','Claim this request before changing its status.',409)
                if status=='resolved':raise DomainError('invalid_transition','This request is already resolved.',409)
                status='resolved' if action=='resolve' else action
            else:raise DomainError('validation_error','Choose a supported workflow action.')
        result=one(c,"""UPDATE support_tickets SET status=:status,assigned_to=:assignee,version=version+1,
          resolved_at=CASE WHEN :status='resolved' THEN now() ELSE NULL END WHERE id=:id RETURNING id,status,version""",
          id=ticket_id,status=status,assignee=assignee)
        query(c,'INSERT INTO support_messages(ticket_id,author_id,message) VALUES(:id,:uid,:message)',id=ticket_id,uid=g.actor['id'],message=note)
        audit(c,g.actor['id'],'support_workflow_changed',ticket_id,{'action':action,'from':ticket['status'],'to':status,'version':result['version'],'previous_assignee':str(ticket['assigned_to']) if ticket['assigned_to'] else None,'assignee':str(assignee) if assignee else None})
        if action in ('assign','release'):case_assignment.notify_change(c,'support',ticket_id,result['version'],ticket['assigned_to'],assignee)
        recipient=ticket['assigned_to'] if str(ticket['reporter_id'])==g.actor['id'] else ticket['reporter_id']
        if recipient and str(recipient)!=g.actor['id']:
            from .work import notify
            notify(c,str(recipient),'support.updated','Your private support request has an update. Open Support requests to review it.','support-workflow:'+ticket_id+':'+str(result['version']))
    return jsonify(dict(result))

@bp.route('/api/v1/orders',methods=['GET','POST'])
@authenticated
@idempotent
def orders():
    with transaction() as c:
        if request.method=='GET':return page(rows(c,'SELECT * FROM orders WHERE user_id=:uid ORDER BY created_at DESC LIMIT :n',uid=g.actor['id'],n=limit()))
        d=body()
        if d.get('profile') not in('pole_gateway','pole_device','house_full','building_hub','ir_reader'):raise DomainError('validation_error','Choose a supported device profile.')
        r=one(c,'INSERT INTO orders(user_id,profile,service_address,contact_phone,notes) VALUES(:uid,:profile,:address,:phone,:notes) RETURNING *',uid=g.actor['id'],profile=d['profile'],address=requested_text(d,'service_address',1000),phone=requested_text(d,'contact_phone',30),notes=d.get('notes'))
        return jsonify(dict(r)),201

@bp.get('/api/v1/orders/<order_id>')
@authenticated
def order_detail(order_id):
    with transaction() as c:
        r=one(c,'SELECT * FROM orders WHERE id=:id AND user_id=:uid',id=uuid_string(order_id),uid=g.actor['id'])
        if not r:raise DomainError('not_found','Order not found.',404)
        return jsonify(dict(r))

@bp.post('/api/v1/orders/<order_id>/actions')
@authenticated
def order_action(order_id):
    d=body()
    if d.get('action')!='cancel_request':raise DomainError('operator_confirmation_required','An installation date or quote must be confirmed by the team.',422)
    with transaction() as c:
        r=one(c,"UPDATE orders SET status='cancelled',version=version+1,updated_at=now() WHERE id=:id AND user_id=:uid AND version=:version AND status='requested' RETURNING id,status,version",id=uuid_string(order_id),uid=g.actor['id'],version=d.get('expected_version'))
        if not r:raise DomainError('conflict','Order has changed or cannot be cancelled.',409)
    return jsonify(dict(r))

@bp.get('/api/v1/transactions')
@authenticated
def transactions():
    with transaction() as c:return page(rows(c,'SELECT id,amount_kobo,payment_state,vending_state,credit_state,created_at FROM payments WHERE payer_id=:uid ORDER BY created_at DESC LIMIT :n',uid=g.actor['id'],n=limit()))

@bp.get('/api/v1/wallets')
@authenticated
def wallets():
    with transaction() as c:
        ids=[d['id'] for d in financial_device_ids(c)]
        result=rows(c,"""SELECT w.id,w.device_id,w.linked_meter_id,w.available_kobo,w.reserved_kobo,w.available_mwh,w.reserved_mwh,w.ledger_version,w.updated_at,w.payment_token,
            CASE WHEN w.linked_meter_id IS NULL THEN 'device_credit' ELSE 'meter_purchases' END AS balance_kind,
            CASE WHEN m.id IS NOT NULL THEN right(m.meter_number,4) END AS meter_hint
            FROM wallets w LEFT JOIN linked_meters m ON m.id=w.linked_meter_id
            WHERE w.device_id=ANY(CAST(:ids AS uuid[])) OR m.owner_id=:uid ORDER BY w.id""",ids=ids,uid=g.actor['id'])
        return page(result)

@bp.get('/api/v1/wallets/<wallet_id>/ledger')
@authenticated
def ledger(wallet_id):
    with transaction() as c:
        w=one(c,'SELECT * FROM wallets WHERE id=:id',id=uuid_string(wallet_id))
        if not w:raise DomainError('not_found','Wallet not found.',404)
        if w['device_id']:device(c,g.actor,w['device_id'],write=True)
        elif not one(c,'SELECT id FROM linked_meters WHERE id=:id AND owner_id=:uid',id=w['linked_meter_id'],uid=g.actor['id']):raise DomainError('not_found','Wallet not found.',404)
        return page(rows(c,'SELECT t.kind,t.created_at,e.account,e.direction,e.amount_kobo,e.energy_mwh FROM ledger_transactions t JOIN ledger_entries e ON e.transaction_id=t.id WHERE t.wallet_id=:id ORDER BY t.created_at DESC LIMIT :n',id=wallet_id,n=limit()))

@bp.get('/api/v1/bills')
@authenticated
def bills():
    with transaction() as c:
        ids=[d['id'] for d in financial_device_ids(c)]
        return page(rows(c,"SELECT * FROM bills WHERE(subject_type='device' AND subject_id=ANY(CAST(:ids AS uuid[])) AND(:role<>'tenant' OR EXISTS(SELECT 1 FROM occupancies o JOIN devices d ON d.room_id=o.room_id WHERE d.id=bills.subject_id AND o.tenant_id=:uid AND o.start_at<=bills.period_start::timestamptz AND(o.end_at IS NULL OR o.end_at>=bills.period_end::timestamptz)))) OR(subject_type='building' AND subject_id IN(SELECT id FROM buildings WHERE landlord_id=:uid)) ORDER BY created_at DESC LIMIT :n",ids=ids,uid=g.actor['id'],role=g.actor['role'],n=limit()))

DISPUTE_REVIEWERS=('internal_finance','internal_superadmin')

def dispute_access(c,dispute_id):
    r=one(c,'SELECT * FROM disputes WHERE id=:id AND(raised_by=:uid OR :reviewer) FOR UPDATE',id=uuid_string(dispute_id),uid=g.actor['id'],reviewer=g.actor['role'] in DISPUTE_REVIEWERS)
    if not r:raise DomainError('not_found','Dispute not found.',404)
    return r

@bp.get('/api/v1/disputes')
@authenticated
def disputes():
    try:offset=int(request.args.get('offset',0))
    except ValueError:raise DomainError('validation_error','Use a numeric queue offset.')
    if not 0<=offset<=100000:raise DomainError('validation_error','Queue offset is outside the supported range.')
    with transaction() as c:
        n=limit();items=rows(c,'SELECT id,bill_id,status,note,created_at,resolved_at,assigned_to,version FROM disputes WHERE raised_by=:uid OR :reviewer ORDER BY created_at DESC,id DESC LIMIT :n OFFSET :offset',uid=g.actor['id'],reviewer=g.actor['role'] in DISPUTE_REVIEWERS,n=n+1,offset=offset)
        return jsonify(items=items[:n],next_cursor=str(offset+n) if len(items)>n else None,can_review=g.actor['role'] in DISPUTE_REVIEWERS)

@bp.post('/api/v1/disputes')
@authenticated
@idempotent
def dispute_create():
    d=body();note=requested_text(d,'note')
    with transaction() as c:
        bill=one(c,'SELECT * FROM bills WHERE id=:id',id=uuid_string(d.get('bill_id')))
        if not bill:raise DomainError('not_found','Bill not found.',404)
        if bill['subject_type']=='device':
            device(c,g.actor,bill['subject_id'])
            if g.actor['role']=='tenant' and not one(c,"""SELECT o.id FROM occupancies o JOIN devices dev ON dev.room_id=o.room_id
              WHERE dev.id=:id AND o.tenant_id=:uid AND o.start_at<=CAST(:start AS timestamptz) AND(o.end_at IS NULL OR o.end_at>=CAST(:end AS timestamptz))""",id=bill['subject_id'],uid=g.actor['id'],start=bill['period_start'],end=bill['period_end']):
                raise DomainError('not_found','Bill not found for your occupancy period.',404)
        elif bill['subject_type']=='building':building(c,g.actor,bill['subject_id'])
        else:raise DomainError('not_found','Bill not found.',404)
        query(c,'SELECT pg_advisory_xact_lock(hashtext(:scope))',scope='dispute:'+str(bill['id'])+':'+g.actor['id'])
        if one(c,"SELECT id FROM disputes WHERE bill_id=:bill AND raised_by=:uid AND status NOT IN('resolved','closed_no_adjustment')",bill=bill['id'],uid=g.actor['id']):raise DomainError('dispute_open','You already have an active dispute for this bill.',409)
        snapshot=json_text(dict(bill));r=one(c,'INSERT INTO disputes(bill_id,period_start,period_end,raised_by,note,evidence_snapshot_hash,evidence_snapshot) VALUES(:bill,:start,:end,:uid,:note,:hash,CAST(:snapshot AS jsonb)) RETURNING id,status',bill=bill['id'],start=bill['period_start'],end=bill['period_end'],uid=g.actor['id'],note=note,hash=hashlib.sha256(snapshot.encode()).hexdigest(),snapshot=snapshot);audit(c,g.actor['id'],'dispute_opened',r['id'])
    return jsonify(dict(r)),201

@bp.get('/api/v1/disputes/<dispute_id>/meeting-view')
@authenticated
def meeting(dispute_id):
    with transaction() as c:
        r=dispute_access(c,dispute_id)
        return jsonify({**{k:r[k] for k in ('id','status','note','created_at','resolved_at','version','assigned_to','evidence_snapshot','evidence_snapshot_hash')},
          'can_review':g.actor['role'] in DISPUTE_REVIEWERS,'assigned_to_me':str(r['assigned_to'])==g.actor['id'],'can_assign':g.actor['role']=='internal_superadmin','responders':case_assignment.responders(c,DISPUTE_REVIEWERS),
          'messages':rows(c,'SELECT author_id,message,created_at FROM dispute_messages WHERE dispute_id=:id ORDER BY created_at,id',id=dispute_id),
          'decisions':rows(c,'SELECT decision,note,created_at FROM dispute_resolutions WHERE dispute_id=:id ORDER BY created_at,id',id=dispute_id)})

def dispute_notify(c,r,key):
    recipient=r['assigned_to'] if str(r['raised_by'])==g.actor['id'] else r['raised_by']
    if recipient and str(recipient)!=g.actor['id']:
        from .work import notify
        notify(c,str(recipient),'dispute.updated','Your private billing dispute has an update. Open Disputes to review it.',key)

@bp.post('/api/v1/disputes/<dispute_id>/messages')
@authenticated
@idempotent
def dispute_message(dispute_id):
    with transaction() as c:
        case=dispute_access(c,dispute_id)
        if case['status'] in ('resolved','closed_no_adjustment'):raise DomainError('dispute_closed','Reopen this dispute before replying.',409)
        r=one(c,"INSERT INTO dispute_messages(dispute_id,author_id,message) VALUES(:id,:uid,:message) RETURNING id,created_at",id=dispute_id,uid=g.actor['id'],message=requested_text(body(),'message'))
        audit(c,g.actor['id'],'dispute_message_added',dispute_id);dispute_notify(c,case,'dispute-message:'+str(r['id']))
    return jsonify(dict(r)),201

@bp.post('/api/v1/disputes/<dispute_id>/workflow')
@authenticated
@idempotent
def dispute_workflow(dispute_id):
    d=body();note=requested_text(d,'note');action=d.get('action')
    if type(d.get('version')) is not int:raise DomainError('validation_error','Supply the current dispute version.')
    with transaction() as c:
        case=dispute_access(c,dispute_id)
        if case['version']!=d['version']:raise DomainError('version_conflict','This dispute changed. Refresh before continuing.',409)
        status=case['status'];assignee=case['assigned_to']
        if action=='reopen':
            if status!='closed_no_adjustment':raise DomainError('invalid_transition','Only a case closed without adjustment can be reopened here.',409)
            query(c,'SELECT pg_advisory_xact_lock(hashtext(:scope))',scope='dispute:'+str(case['bill_id'])+':'+str(case['raised_by']))
            if one(c,"SELECT id FROM disputes WHERE bill_id=:bill AND raised_by=:uid AND id<>:id AND status NOT IN('resolved','closed_no_adjustment')",bill=case['bill_id'],uid=case['raised_by'],id=dispute_id):raise DomainError('dispute_open','A newer active dispute already covers this bill.',409)
            status='open'
        elif action=='escalate':
            if status not in ('open','responded'):raise DomainError('invalid_transition','Only an active, un-escalated case can be escalated.',409)
            status='escalated'
        else:
            staff(*DISPUTE_REVIEWERS)
            if status in ('resolved','closed_no_adjustment'):raise DomainError('dispute_closed','Reopen this dispute before reviewing it.',409)
            if action in ('assign','release'):
                assignee=case_assignment.change(c,action,assignee,d.get('assignee_id'),DISPUTE_REVIEWERS)
            elif action=='claim':
                if assignee and str(assignee)!=g.actor['id']:raise DomainError('already_assigned','Another reviewer owns this dispute.',409)
                assignee=g.actor['id']
            elif action in ('respond','close_no_adjustment'):
                if not assignee or str(assignee)!=g.actor['id']:raise DomainError('claim_required','Claim this dispute before recording a decision.',409)
                status='responded' if action=='respond' else 'closed_no_adjustment'
            else:raise DomainError('validation_error','Choose a supported review action.')
        result=one(c,"""UPDATE disputes SET status=:status,assigned_to=:assignee,version=version+1,
          resolved_at=CASE WHEN :status='closed_no_adjustment' THEN now() ELSE NULL END WHERE id=:id RETURNING id,status,version""",id=dispute_id,status=status,assignee=assignee)
        query(c,'INSERT INTO dispute_messages(dispute_id,author_id,message) VALUES(:id,:uid,:note)',id=dispute_id,uid=g.actor['id'],note=note)
        if action in ('escalate','close_no_adjustment'):query(c,'INSERT INTO dispute_resolutions(dispute_id,decision,decided_by,note) VALUES(:id,:action,:uid,:note)',id=dispute_id,action=action,uid=g.actor['id'],note=note)
        audit(c,g.actor['id'],'dispute_workflow_changed',dispute_id,{'action':action,'from':case['status'],'to':status,'version':result['version'],'previous_assignee':str(case['assigned_to']) if case['assigned_to'] else None,'assignee':str(assignee) if assignee else None})
        if action in ('assign','release'):case_assignment.notify_change(c,'dispute',dispute_id,result['version'],case['assigned_to'],assignee)
        dispute_notify(c,case,'dispute-workflow:'+dispute_id+':'+str(result['version']))
    return jsonify(dict(result))

@bp.get('/api/v1/portal/jobs')
@bp.get('/api/v1/portal/referrals')
@bp.get('/api/v1/portal/payouts')
@authenticated
def portal():
    with transaction() as c:
        if request.path.endswith('/jobs'):
            staff('installer','internal_ops','internal_superadmin');return page(rows(c,'SELECT id,device_id,building_id,status,priority,opened_at FROM jobs WHERE assignee_id=:uid ORDER BY opened_at DESC LIMIT :n',uid=g.actor['id'],n=limit()))
        if request.path.endswith('/payouts'):return page(rows(c,'SELECT id,trigger_type,amount_kobo,status,schedule_at,disbursed_at FROM payouts WHERE earner_id=:uid ORDER BY created_at DESC LIMIT :n',uid=g.actor['id'],n=limit()))
        raise DomainError('referrals_unavailable','Referral attribution has not been configured.',503)

@bp.get('/api/v1/organizations/by-subdomain/<subdomain>')
def organization(subdomain):
    with transaction() as c:
        r=one(c,'SELECT name,primary_color_hex,logo_url FROM organizations WHERE subdomain=:subdomain',subdomain=subdomain)
        if not r:raise DomainError('not_found','Organization not found.',404)
        return jsonify(dict(r))

@bp.get('/api/v1/ops/fleet-health')
@bp.get('/api/v1/ops/fleet-health-basic')
@authenticated
def fleet():
    staff('internal_ops','internal_engineering','internal_superadmin')
    with transaction() as c:
        audit(c,g.actor['id'],'fleet_viewed');return page(rows(c,'SELECT id,profile,install_state,calibration_status,last_seen_at,firmware_version FROM devices ORDER BY last_seen_at NULLS FIRST LIMIT :n',n=limit()))


@bp.get('/api/v1/public/electricity-providers')
def electricity_providers():
    return jsonify(items=electricity_services())
