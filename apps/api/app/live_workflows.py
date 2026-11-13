"""Account linking and staff workspaces backed by committed records."""
import hashlib,secrets
from flask import Blueprint,g,request,jsonify
from .db import transaction,query,one,rows,scalar,audit,DomainError,uuid_string,building
from .live_auth import authenticated,staff
from .idempotency import idempotent
from .work import notify
bp=Blueprint('live_workflows',__name__)

@bp.post('/api/v1/ops/devices/<device_id>/claim-code')
@authenticated
@idempotent
def create_claim(device_id):
    staff('internal_ops','internal_superadmin')
    token=secrets.token_urlsafe(32)
    with transaction() as c:
        d=one(c,'SELECT owner_id FROM devices WHERE id=:id FOR UPDATE',id=uuid_string(device_id))
        if not d:raise DomainError('not_found','Device not found.',404)
        if d['owner_id']:raise DomainError('already_claimed','An owned device requires an approved ownership transfer.',409)
        query(c,'UPDATE device_claims SET expires_at=now() WHERE device_id=:id AND used_at IS NULL',id=device_id)
        r=one(c,"INSERT INTO device_claims(device_id,token_sha256,expires_at,created_by) VALUES(:id,:hash,now()+interval '7 days',:uid) RETURNING expires_at",id=device_id,hash=hashlib.sha256(token.encode()).hexdigest(),uid=g.actor['id'])
        audit(c,g.actor['id'],'claim_code_issued',device_id)
    return jsonify(claim_code=token,expires_at=r['expires_at']),201

@bp.post('/api/v1/devices/claim')
@authenticated
@idempotent
def claim():
    staff('homeowner','landlord');d=request.get_json() or {};code=d.get('claim_code')
    if not isinstance(code,str) or not 32<=len(code)<=128:raise DomainError('validation_error','Enter the claim code supplied with your device.')
    with transaction() as c:
        code=one(c,'SELECT * FROM device_claims WHERE token_sha256=:hash AND expires_at>now() AND used_at IS NULL FOR UPDATE',hash=hashlib.sha256(code.encode()).hexdigest())
        if not code:raise DomainError('claim_invalid','This claim code is invalid, expired or already used.',404)
        dev=one(c,'SELECT * FROM devices WHERE id=:id FOR UPDATE',id=code['device_id'])
        if dev['owner_id']:raise DomainError('already_claimed','This device is already linked to an owner.',409)
        room_id=d.get('room_id');bid=None
        if room_id:
            staff('landlord');room=one(c,'SELECT building_id FROM rooms WHERE id=:id',id=uuid_string(room_id))
            if not room:raise DomainError('not_found','Room not found.',404)
            building(c,g.actor,room['building_id']);bid=room['building_id']
            if dev['profile']!='house_full':raise DomainError('room_device_required','Only a House Full device can be assigned to a room.',422)
            if one(c,'SELECT id FROM devices WHERE room_id=:id',id=room_id):raise DomainError('room_device_exists','This room already has a device. Use an approved replacement process.',409)
        query(c,'UPDATE devices SET owner_id=:uid,room_id=:room,building_id=:bid WHERE id=:id',id=dev['id'],uid=g.actor['id'],room=room_id,bid=bid)
        query(c,'UPDATE device_claims SET used_by=:uid,used_at=now() WHERE id=:id',id=code['id'],uid=g.actor['id'])
        if bid:
            destination=one(c,'SELECT * FROM building_payment_destinations WHERE building_id=:id',id=bid)
            if destination:
                if one(c,'SELECT p.id FROM payments p JOIN quotes q ON q.id=p.quote_id JOIN wallets w ON w.id=q.wallet_id WHERE w.device_id=:id LIMIT 1',id=dev['id']):raise DomainError('settlement_required','This device has payment history. An approved replacement/settlement is required before room reassociation.',409)
                query(c,'UPDATE devices SET linked_meter_id=:meter WHERE id=:id',meter=destination['linked_meter_id'],id=dev['id'])
                query(c,'INSERT INTO wallets(device_id,tariff_version) VALUES(:id,:rate) ON CONFLICT(device_id) DO UPDATE SET tariff_version=excluded.tariff_version',id=dev['id'],rate=destination['tariff_version'])
        audit(c,g.actor['id'],'device_claimed',dev['id'])
    return jsonify(device_id=dev['id'],install_state=dev['install_state'],status='linked',message='Account linked. Measurements require completed installation and calibration.'),201

@bp.post('/api/v1/ops/buildings/<building_id>/payment-destination')
@authenticated
@idempotent
def configure_building_destination(building_id):
    staff('internal_ops','internal_finance','internal_superadmin');d=request.get_json() or {}
    with transaction() as c:
        b=one(c,'SELECT * FROM buildings WHERE id=:id FOR UPDATE',id=uuid_string(building_id))
        if not b or b['meter_type']!='with_meter':raise DomainError('metered_building_required','Select an existing metered building.',422)
        if one(c,'SELECT building_id FROM building_payment_destinations WHERE building_id=:id',id=b['id']):raise DomainError('destination_already_configured','Changing a building destination requires an approved settlement and migration process.',409)
        meter=one(c,'SELECT * FROM linked_meters WHERE id=:id AND owner_id=:uid AND validated_at IS NOT NULL AND utility_type=\'electricity\'',id=uuid_string(d.get('linked_meter_id')),uid=b['landlord_id'])
        if not meter:raise DomainError('meter_not_validated','The landlord must validate the central meter account first.',422)
        rate=one(c,'SELECT * FROM tariffs WHERE version=:version AND provider=:provider AND effective_from<=now() AND(effective_to IS NULL OR effective_to>now())',version=d.get('tariff_version'),provider=meter['disco_name'])
        if not rate or rate['day_rate_kobo_per_kwh']<=0:raise DomainError('tariff_required','Choose a current approved tariff for this exact provider.',422)
        devices=rows(c,'SELECT id FROM devices WHERE room_id IN(SELECT id FROM rooms WHERE building_id=:id) ORDER BY id FOR UPDATE',id=b['id'])
        ids=[r['id'] for r in devices]
        if one(c,'SELECT id FROM wallets WHERE device_id=ANY(CAST(:ids AS uuid[])) AND(available_mwh>0 OR reserved_mwh>0 OR unpaid_mwh>0 OR available_kobo>0 OR reserved_kobo>0)',ids=ids):
            raise DomainError('settlement_required','Existing room funds must be settled before central-meter activation.',409)
        if one(c,'SELECT p.id FROM payments p JOIN quotes q ON q.id=p.quote_id JOIN wallets w ON w.id=q.wallet_id WHERE w.device_id=ANY(CAST(:ids AS uuid[])) LIMIT 1',ids=ids):raise DomainError('settlement_required','Existing room payment history requires an approved destination-migration review.',409)
        if one(c,'SELECT q.id FROM quotes q JOIN wallets w ON w.id=q.wallet_id WHERE w.device_id=ANY(CAST(:ids AS uuid[])) AND q.expires_at>now() LIMIT 1',ids=ids):raise DomainError('settlement_required','Wait for existing room quotes to expire before activating a different destination.',409)
        query(c,'INSERT INTO building_payment_destinations(building_id,linked_meter_id,tariff_version,configured_by) VALUES(:bid,:meter,:rate,:uid)',bid=b['id'],meter=meter['id'],rate=rate['version'],uid=g.actor['id'])
        for dev in devices:
            query(c,'UPDATE devices SET linked_meter_id=:meter WHERE id=:id',id=dev['id'],meter=meter['id'])
            query(c,'INSERT INTO wallets(device_id,tariff_version) VALUES(:id,:rate) ON CONFLICT(device_id) DO UPDATE SET tariff_version=excluded.tariff_version',id=dev['id'],rate=rate['version'])
        audit(c,g.actor['id'],'building_payment_destination_configured',b['id'],{'meter_id':str(meter['id']),'tariff_version':rate['version']})
    return jsonify(building_id=str(b['id']),status='configured',room_credit_is_individual=True),201

@bp.get('/api/v1/dashboard/utility')
@authenticated
def utility_dashboard():
    staff('nepa_staff')
    with transaction() as c:
        scopes=rows(c,"""SELECT DISTINCT s.device_id FROM utility_device_scopes s JOIN memberships m ON m.organization_id=s.organization_id
            WHERE m.user_id=:uid AND m.role='nepa_staff' AND m.revoked_at IS NULL AND s.revoked_at IS NULL""",uid=g.actor['id'])
        ids=[s['device_id'] for s in scopes]
        if not ids:raise DomainError('utility_scope_required','Your organization needs an active contracted device scope before utility data is visible.',403)
        devices=rows(c,"SELECT id,profile,last_seen_at,supply_state,install_state FROM devices WHERE id=ANY(CAST(:ids AS uuid[])) ORDER BY id",ids=ids)
        signals=rows(c,"SELECT id,device_id,kind,active,occurred_at_ms,clock_quality,received_at FROM device_signals WHERE device_id=ANY(CAST(:ids AS uuid[])) ORDER BY received_at DESC LIMIT 100",ids=ids)
        audit(c,g.actor['id'],'utility_dashboard_viewed',metadata={'device_count':len(ids)})
    return jsonify(devices=devices,signals=signals,scope_count=len(ids),customer_identity_included=False)

@bp.get('/api/v1/ops/summary')
@authenticated
def ops_summary():
    staff('internal_ops','internal_engineering','internal_superadmin')
    with transaction() as c:
        counts=one(c,"""SELECT count(*) AS total_devices,count(*) FILTER(WHERE last_seen_at>=now()-interval '180 seconds') AS recently_connected,
         count(*) FILTER(WHERE last_seen_at<now()-interval '180 seconds') AS stale_devices,
         count(*) FILTER(WHERE last_seen_at IS NULL) AS never_connected FROM devices""")
        jobcounts=rows(c,'SELECT kind,status,count(*) AS count FROM jobs GROUP BY kind,status ORDER BY kind,status')
        jobs=rows(c,'SELECT id,kind,status,priority,device_id,assignee_id,opened_at,completed_at,version FROM jobs ORDER BY opened_at DESC LIMIT 100')
        deliveries=rows(c,"SELECT id,template_key,status,attempts,last_error,created_at FROM notifications WHERE channel='sms' AND status IN ('queued','failed','unknown') ORDER BY created_at DESC LIMIT 100")
        recovery=rows(c,"SELECT id,event_type,status,attempts,last_error,next_attempt_at,created_at,payload->>'payment_id' AS payment_id FROM outbox WHERE event_type IN ('payment_reconcile','payment_verified') AND status IN ('failed','dead_letter') ORDER BY created_at DESC LIMIT 100")
        audit(c,g.actor['id'],'ops_summary_viewed')
    return jsonify(fleet=dict(counts),job_counts=jobcounts,jobs=jobs,sms_delivery_issues=deliveries,payment_recovery_issues=recovery,unavailable_metrics=['MRR','CAC','runway','churn','confirmed_theft'])

@bp.post('/api/v1/ops/jobs')
@authenticated
@idempotent
def create_job():
    staff('internal_ops','internal_superadmin');d=request.get_json() or {}
    if d.get('kind') not in('installation','repair','inspection'):raise DomainError('validation_error','Select installation, repair or inspection.')
    if d.get('priority','normal') not in('normal','high','urgent'):raise DomainError('validation_error','Select a valid priority.')
    with transaction() as c:
        if not one(c,'SELECT id FROM devices WHERE id=:id',id=uuid_string(d.get('device_id'))):raise DomainError('not_found','Device not found.',404)
        r=one(c,'INSERT INTO jobs(device_id,kind,priority,created_by) VALUES(:did,:kind,:priority,:uid) RETURNING id,status',did=d['device_id'],kind=d['kind'],priority=d.get('priority','normal'),uid=g.actor['id'])
        audit(c,g.actor['id'],'job_created',r['id'],{'kind':d['kind']})
    return jsonify(dict(r)),201

# These actions record field work. They cannot commission hardware, grant capabilities,
# release a payable, edit money or create relay commands.
DISPATCH_ROLES=('internal_ops','internal_superadmin')
JOB_READ_ROLES=(*DISPATCH_ROLES,'internal_engineering')

def scoped_job(c,job_id,lock=False):
    r=one(c,'SELECT * FROM jobs WHERE id=:id'+(' FOR UPDATE' if lock else ''),id=uuid_string(job_id))
    if not r or not (g.actor['role'] in JOB_READ_ROLES or
            (g.actor['role']=='installer' and str(r['assignee_id'])==g.actor['id'])):
        raise DomainError('not_found','Work order not found.',404)
    return dict(r)

def job_actions(job):
    dispatch=g.actor['role'] in DISPATCH_ROLES
    assigned=g.actor['role']=='installer' and str(job['assignee_id'])==g.actor['id']
    status=job['status'];actions=[]
    if dispatch:
        if status in ('open','assigned','in_progress','diagnostic_failed','awaiting_online','commissioning_failed'):actions.append('assign')
        if status in ('diagnostic_failed','rma','closed','commissioning_failed'):actions.append('reopen')
        if status=='awaiting_online' and job['kind'] in ('repair','inspection'):actions.append('close')
    if assigned:
        if status=='assigned':actions.append('start')
        if status=='in_progress':actions.extend(('fail_diagnostics','submit','rma'))
    return actions

@bp.get('/api/v1/jobs/<job_id>')
@authenticated
def job_detail(job_id):
    with transaction() as c:
        job=scoped_job(c,job_id)
        events=rows(c,'SELECT id,action,from_status,to_status,assignee_id,note,version,created_at FROM job_events WHERE job_id=:id ORDER BY version',id=job['id'])
        # Installers need diagnostic status, not customer identity, finance or signing keys.
        dev=one(c,'SELECT id,profile,install_state,calibration_status,last_seen_at,firmware_version FROM devices WHERE id=:id',id=job['device_id'])
        audit(c,g.actor['id'],'job_viewed',job['id'])
    return jsonify(job=job,events=events,device=dict(dev) if dev else None,
                   allowed_actions=job_actions(job),commissioning_available=False)

@bp.post('/api/v1/jobs/<job_id>/actions')
@authenticated
@idempotent
def job_action(job_id):
    d=request.get_json() or {};note=d.get('note');version=d.get('expected_version')
    if type(version) is not int or version<1:raise DomainError('validation_error','A current work-order version is required.')
    if not isinstance(note,str) or not 10<=len(note.strip())<=4000:
        raise DomainError('validation_error','Record a field-work note between 10 and 4,000 characters.')
    action=d.get('action')
    with transaction() as c:
        job=scoped_job(c,job_id,lock=True)
        if version!=job['version']:raise DomainError('version_conflict','This work order changed. Refresh before submitting another action.',409)
        if action not in job_actions(job):raise DomainError('invalid_job_action','This action is not available for this work order and workspace.',409)
        assignee=job['assignee_id']
        target={'assign':'assigned','start':'in_progress','fail_diagnostics':'diagnostic_failed',
                'submit':'awaiting_online','rma':'rma','close':'closed','reopen':'open'}[action]
        if action=='assign':
            assignee=uuid_string(d.get('assignee_id'))
            if not one(c,"SELECT id FROM profiles WHERE id=:id AND role='installer'",id=assignee):
                raise DomainError('installer_required','Choose a provisioned installer account.',422)
        if action=='reopen':assignee=None
        row=one(c,"""UPDATE jobs SET status=:status,assignee_id=:assignee,version=version+1,updated_at=now(),
            completed_at=CASE WHEN :status='closed' THEN now() ELSE NULL END
            WHERE id=:id RETURNING *""",id=job['id'],status=target,assignee=assignee)
        event=one(c,"""INSERT INTO job_events(job_id,actor_id,action,from_status,to_status,assignee_id,note,version)
            VALUES(:id,:uid,:action,:before,:after,:assignee,:note,:version) RETURNING id""",
            id=job['id'],uid=g.actor['id'],action={'assign':'assigned','start':'started','fail_diagnostics':'diagnostic_failed',
            'submit':'submitted','rma':'rma','close':'closed','reopen':'reopened'}[action],before=job['status'],
            after=target,assignee=assignee,note=note.strip(),version=row['version'])
        audit(c,g.actor['id'],'job_'+action,job['id'],{'version':row['version'],'event_id':str(event['id'])})
        for uid in set(filter(None,(assignee,job['assignee_id'],job['created_by']))):
            notify(c,uid,'job.updated','A field work order is now '+target.replace('_',' ')+'. Review its recorded notes.',
                   'job:'+str(event['id'])+':'+str(uid))
    return jsonify(job=dict(row),allowed_actions=job_actions(dict(row)),commissioning_available=False)

@bp.get('/api/v1/public/capabilities')
def capabilities():
    # Curated names only; never publish flag targeting or private configuration.
    # A stale/manual database flag cannot implement an unavailable integration.
    return jsonify(water_management=False)

@bp.post('/api/v1/ops/features/water-management')
@authenticated
@idempotent
def water_flag():
    staff('internal_superadmin');enabled=(request.get_json() or {}).get('enabled')
    if type(enabled) is not bool:raise DomainError('validation_error','An explicit enabled boolean is required.')
    if enabled:raise DomainError('water_integration_unavailable','Water management cannot be enabled until its integration is implemented and qualified.',409)
    with transaction() as c:
        query(c,"INSERT INTO feature_flags(key,description,enabled_globally) VALUES('water_management','Water integration rollout',false) ON CONFLICT(key) DO UPDATE SET enabled_globally=false")
        audit(c,g.actor['id'],'water_management_disabled')
    return jsonify(enabled=False)
