from datetime import datetime,timezone,timedelta
from decimal import Decimal
import hashlib,json,secrets,uuid
from flask import Blueprint,request,jsonify,g,current_app
from .db import transaction,one,rows,query,scalar,DomainError,device,building,audit,json_text,uuid_string
from .live_auth import authenticated,staff
from .providers import validate_meter,config,electricity_services
from .idempotency import idempotent
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

def projection(c):
    devices=[]
    for d in owned_device_ids(c):
        dev=device(c,g.actor,d['id']);r=one(c,"SELECT r.* FROM readings r WHERE r.device_id=:id AND(:role<>'tenant' OR EXISTS(SELECT 1 FROM occupancies o WHERE o.room_id=:room AND o.tenant_id=:uid AND o.end_at IS NULL AND r.occurred_at_ms>=extract(epoch FROM o.start_at)*1000)) ORDER BY r.occurred_at_ms DESC NULLS LAST,r.received_at DESC LIMIT 1",id=d['id'],role=g.actor['role'],room=dev['room_id'],uid=g.actor['id']);wallet=one(c,'SELECT * FROM wallets WHERE device_id=:id',id=d['id']);at=datetime.fromtimestamp(r['occurred_at_ms']/1000,timezone.utc) if r and r['occurred_at_ms'] is not None else None
        fresh=at and 0<=(datetime.now(timezone.utc)-at).total_seconds()<180
        pending=one(c,"SELECT command_id FROM commands WHERE device_id=:id AND status IN('pending','pending_delivery') ORDER BY created_at DESC LIMIT 1",id=d['id'])
        devices.append({'id':str(dev['id']),'role':dev['profile'],'capabilities':dev['capabilities'],'supply_state':dev['supply_state'] if dev['supply_clock_quality']=='trusted' and dev['supply_observed_at_ms'] is not None and 0<=datetime.now(timezone.utc).timestamp()*1000-dev['supply_observed_at_ms']<180000 else 'unknown','connectivity':'online' if dev['last_seen_at'] and (datetime.now(timezone.utc)-dev['last_seen_at']).total_seconds()<180 else 'stale' if dev['last_seen_at'] else 'unknown','relay':{'observed':dev['relay_observed'],'observed_at':dev['relay_observed_at'],'pending_command_id':pending['command_id'] if pending else None,'off_reasons':[x['reason'] for x in rows(c,"SELECT reason FROM off_reasons WHERE device_id=:id AND active AND(expires_at IS NULL OR expires_at>now())",id=d['id'])]},'measurement':{'value':float(Decimal(r['real_power_mw'])/1000) if r and r['real_power_mw'] is not None else None,'unit':'W','observed_at':at,'quality':r['quality'] if r else 'unavailable','coverage':None},'wallet':{'id':wallet['id'],'available':wallet['available_kobo'],'reserved':wallet['reserved_kobo'],'available_mwh':wallet['available_mwh'],'unit':'kobo','ledger_version':wallet['ledger_version'],'updated_at':wallet['updated_at'],'payment_token':wallet['payment_token']} if wallet else None})
    usage=[]
    if devices:
        periods=rows(c,"""SELECT r.occurred_at_ms,u.consumed_mwh FROM usage_postings u JOIN readings r ON r.id=u.reading_id
          WHERE r.device_id=:id AND u.accounting_quality='measured'
          AND(:role<>'tenant' OR EXISTS(SELECT 1 FROM occupancies o JOIN devices d ON d.room_id=o.room_id
            WHERE d.id=r.device_id AND o.tenant_id=:uid AND o.end_at IS NULL AND u.interval_start_ms>=extract(epoch FROM o.start_at)*1000))
          ORDER BY r.occurred_at_ms DESC LIMIT 24""",id=devices[0]['id'],role=g.actor['role'],uid=g.actor['id'])
        usage=[{'time':datetime.fromtimestamp(p['occurred_at_ms']/1000,timezone(timedelta(hours=1))).strftime('%d %b %H:%M'),'kwh':p['consumed_mwh']/1000000} for p in reversed(periods)]
    return {'snapshot_version':int(scalar(c,"SELECT coalesce(max(id),0) FROM audit_log WHERE actor_id=:uid",uid=g.actor['id']) or 0),'generated_at':datetime.now(timezone.utc),'usage_history':usage,'authorized_context':{'user_id':g.actor['id'],'role':g.actor['role']},'devices':devices,'allowed_actions':['view_dashboard','recharge'] if devices else ['view_dashboard']}

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
    with transaction() as c:return page(rows(c,'SELECT * FROM buildings WHERE landlord_id=:uid ORDER BY created_at,id LIMIT :limit',uid=g.actor['id'],limit=limit()))

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
        if request.method=='GET':return page(rows(c,"SELECT r.*,(SELECT id FROM devices WHERE room_id=r.id LIMIT 1) AS device_id,o.tenant_id,p.full_name AS tenant_name FROM rooms r LEFT JOIN occupancies o ON o.room_id=r.id AND o.end_at IS NULL LEFT JOIN profiles p ON p.id=o.tenant_id WHERE r.building_id=:id ORDER BY r.label",id=building_id))
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
        return jsonify({k:d[k] for k in('id','profile','capabilities','config_epoch','calibration_status','last_seen_at','install_state','firmware_version')})

@bp.get('/api/v1/devices/<device_id>/events')
@authenticated
def history(device_id):
    with transaction() as c:
        d=device(c,g.actor,device_id)
        # A current tenant sees only its active occupancy interval, even if the device predates it.
        return page(rows(c,"""SELECT r.id,r.occurred_at_ms,r.quality,r.clock_quality,r.voltage_mv,r.real_power_mw,r.import_mwh,r.export_mwh FROM readings r WHERE r.device_id=:id AND(:role<>'tenant' OR EXISTS(SELECT 1 FROM occupancies o WHERE o.room_id=:room AND o.tenant_id=:uid AND o.end_at IS NULL AND r.occurred_at_ms>=extract(epoch FROM o.start_at)*1000)) ORDER BY r.occurred_at_ms DESC NULLS LAST LIMIT :limit""",id=device_id,role=g.actor['role'],room=d['room_id'],uid=g.actor['id'],limit=limit()))

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
        record=one(c,"INSERT INTO linked_meters(owner_id,meter_number,disco_name,provider,validated_at,status) VALUES(:uid,:number,:disco,'vtpass',now(),'pending') ON CONFLICT(owner_id,meter_number) DO UPDATE SET validated_at=now() RETURNING *",uid=g.actor['id'],number=number,disco=validated['disco_name'])
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

@bp.route('/api/v1/devices/<device_id>/viewers',methods=['GET','POST'])
@authenticated
def viewers(device_id):
    with transaction() as c:
        device(c,g.actor,device_id,write=True)
        if request.method=='GET':return page(rows(c,'SELECT id,viewer_user_id,expires_at FROM device_viewers WHERE device_id=:id AND revoked_at IS NULL',id=device_id))
        viewer=one(c,'SELECT id FROM profiles WHERE phone=:phone',phone=body().get('viewer_phone',''))
        if not viewer:raise DomainError('not_found','The invited viewer needs an account.',404)
        row=one(c,"INSERT INTO device_viewers(device_id,viewer_user_id,added_by) VALUES(:id,:v,:uid) ON CONFLICT(device_id,viewer_user_id) DO UPDATE SET revoked_at=NULL RETURNING id",id=device_id,v=viewer['id'],uid=g.actor['id']);audit(c,g.actor['id'],'viewer_added',device_id)
    return jsonify(id=row['id'],status='invited'),201

@bp.delete('/api/v1/devices/<device_id>/viewers/<viewer_id>')
@authenticated
def revoke_viewer(device_id,viewer_id):
    with transaction() as c:
        device(c,g.actor,device_id,write=True);query(c,'UPDATE device_viewers SET revoked_at=now() WHERE id=:id AND device_id=:d',id=uuid_string(viewer_id),d=device_id);audit(c,g.actor['id'],'viewer_revoked',device_id)
    return jsonify(status='revoked')

@bp.get('/api/v1/alerts')
@authenticated
def alerts():
    with transaction() as c:return page(rows(c,'SELECT id,episode_id,template_key,status,payload,created_at FROM notifications WHERE recipient_id=:uid ORDER BY created_at DESC LIMIT :n',uid=g.actor['id'],n=limit()))

@bp.post('/api/v1/alerts/<alert_id>/acknowledge')
@authenticated
def acknowledge(alert_id):
    with transaction() as c:
        r=query(c,"UPDATE notifications SET status='delivered' WHERE id=:id AND recipient_id=:uid",id=uuid_string(alert_id),uid=g.actor['id'])
        if not r.rowcount:raise DomainError('not_found','Notification not found.',404)
        audit(c,g.actor['id'],'notification_acknowledged',alert_id)
    return jsonify(status='acknowledged')

@bp.route('/api/v1/support/tickets',methods=['GET','POST'])
@authenticated
@idempotent
def support():
    with transaction() as c:
        if request.method=='GET':return page(rows(c,'SELECT * FROM support_tickets WHERE reporter_id=:uid OR assigned_to=:uid ORDER BY opened_at DESC LIMIT :n',uid=g.actor['id'],n=limit()))
        d=body();category=d.get('category')
        if category not in('payment','device','billing','installation','account','other'):raise DomainError('validation_error','Select a supported category.')
        if d.get('device_id'):device(c,g.actor,d['device_id'])
        r=one(c,'INSERT INTO support_tickets(reporter_id,category,subject,message,scope_device_id) VALUES(:uid,:cat,:subject,:message,:device) RETURNING id,status',uid=g.actor['id'],cat=category,subject=requested_text(d,'subject',200),message=requested_text(d,'message'),device=d.get('device_id'));audit(c,g.actor['id'],'support_ticket_created',r['id'])
        return jsonify(dict(r)),201

def ticket_access(c,ticket_id):
    row=one(c,'SELECT * FROM support_tickets WHERE id=:id AND(reporter_id=:uid OR assigned_to=:uid)',id=uuid_string(ticket_id),uid=g.actor['id'])
    if not row:raise DomainError('not_found','Support request not found.',404)
    return row

@bp.get('/api/v1/support/tickets/<ticket_id>')
@authenticated
def ticket_detail(ticket_id):
    with transaction() as c:
        r=ticket_access(c,ticket_id);messages=rows(c,'SELECT author_id,message,created_at FROM support_messages WHERE ticket_id=:id ORDER BY created_at',id=ticket_id)
    return jsonify({**dict(r),'messages':messages})

@bp.post('/api/v1/support/tickets/<ticket_id>/messages')
@authenticated
@idempotent
def ticket_message(ticket_id):
    with transaction() as c:
        ticket_access(c,ticket_id);r=one(c,'INSERT INTO support_messages(ticket_id,author_id,message) VALUES(:id,:uid,:msg) RETURNING id,created_at',id=ticket_id,uid=g.actor['id'],msg=requested_text(body(),'message'));audit(c,g.actor['id'],'support_message_added',ticket_id)
    return jsonify(dict(r)),201

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
        ids=[d['id'] for d in owned_device_ids(c)]
        result=rows(c,'SELECT id,device_id,available_kobo,reserved_kobo,available_mwh,reserved_mwh,ledger_version,updated_at,payment_token FROM wallets WHERE device_id=ANY(CAST(:ids AS uuid[])) ORDER BY id',ids=ids)
        return page(result)

@bp.get('/api/v1/wallets/<wallet_id>/ledger')
@authenticated
def ledger(wallet_id):
    with transaction() as c:
        w=one(c,'SELECT * FROM wallets WHERE id=:id',id=uuid_string(wallet_id))
        if not w or not w['device_id']:raise DomainError('not_found','Wallet not found.',404)
        device(c,g.actor,w['device_id']);return page(rows(c,'SELECT t.kind,t.created_at,e.account,e.direction,e.amount_kobo,e.energy_mwh FROM ledger_transactions t JOIN ledger_entries e ON e.transaction_id=t.id WHERE t.wallet_id=:id ORDER BY t.created_at DESC LIMIT :n',id=wallet_id,n=limit()))

@bp.get('/api/v1/bills')
@authenticated
def bills():
    with transaction() as c:
        ids=[d['id'] for d in owned_device_ids(c)]
        return page(rows(c,"SELECT * FROM bills WHERE(subject_type='device' AND subject_id=ANY(CAST(:ids AS uuid[]))) OR(subject_type='building' AND subject_id IN(SELECT id FROM buildings WHERE landlord_id=:uid)) ORDER BY created_at DESC LIMIT :n",ids=ids,uid=g.actor['id'],n=limit()))

@bp.get('/api/v1/disputes')
@authenticated
def disputes():
    with transaction() as c:return page(rows(c,'SELECT id,bill_id,status,note,created_at,resolved_at FROM disputes WHERE raised_by=:uid OR assigned_to=:uid ORDER BY created_at DESC LIMIT :n',uid=g.actor['id'],n=limit()))

@bp.post('/api/v1/disputes')
@authenticated
@idempotent
def dispute_create():
    d=body()
    with transaction() as c:
        bill=one(c,'SELECT * FROM bills WHERE id=:id',id=uuid_string(d.get('bill_id')))
        if not bill:raise DomainError('not_found','Bill not found.',404)
        if bill['subject_type']=='device':device(c,g.actor,bill['subject_id'])
        elif bill['subject_type']=='building':building(c,g.actor,bill['subject_id'])
        else:raise DomainError('not_found','Bill not found.',404)
        snapshot=json_text(dict(bill));r=one(c,'INSERT INTO disputes(bill_id,period_start,period_end,raised_by,note,evidence_snapshot_hash,evidence_snapshot) VALUES(:bill,:start,:end,:uid,:note,:hash,CAST(:snapshot AS jsonb)) RETURNING id,status',bill=bill['id'],start=bill['period_start'],end=bill['period_end'],uid=g.actor['id'],note=d.get('note',''),hash=hashlib.sha256(snapshot.encode()).hexdigest(),snapshot=snapshot);audit(c,g.actor['id'],'dispute_opened',r['id'])
    return jsonify(dict(r)),201

@bp.get('/api/v1/disputes/<dispute_id>/meeting-view')
@authenticated
def meeting(dispute_id):
    with transaction() as c:
        r=one(c,'SELECT id,status,evidence_snapshot,note,created_at FROM disputes WHERE id=:id AND(raised_by=:uid OR assigned_to=:uid)',id=uuid_string(dispute_id),uid=g.actor['id'])
        if not r:raise DomainError('not_found','Dispute not found.',404)
        return jsonify(dict(r))

@bp.post('/api/v1/disputes/<dispute_id>/messages')
@authenticated
@idempotent
def dispute_message(dispute_id):
    with transaction() as c:
        if not one(c,'SELECT id FROM disputes WHERE id=:id AND(raised_by=:uid OR assigned_to=:uid)',id=uuid_string(dispute_id),uid=g.actor['id']):raise DomainError('not_found','Dispute not found.',404)
        r=one(c,"INSERT INTO dispute_messages(dispute_id,author_id,message) VALUES(:id,:uid,:message) RETURNING id,created_at",id=dispute_id,uid=g.actor['id'],message=requested_text(body(),'message'))
    return jsonify(dict(r)),201

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
