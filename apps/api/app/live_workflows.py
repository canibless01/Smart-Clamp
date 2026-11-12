"""Account linking and staff workspaces backed by committed records."""
import hashlib,secrets
from flask import Blueprint,g,request,jsonify
from .db import transaction,query,one,rows,scalar,audit,DomainError,uuid_string,building
from .live_auth import authenticated,staff
from .idempotency import idempotent
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
        query(c,'UPDATE devices SET owner_id=:uid,room_id=:room,building_id=:bid WHERE id=:id',id=dev['id'],uid=g.actor['id'],room=room_id,bid=bid)
        query(c,'UPDATE device_claims SET used_by=:uid,used_at=now() WHERE id=:id',id=code['id'],uid=g.actor['id'])
        audit(c,g.actor['id'],'device_claimed',dev['id'])
    return jsonify(device_id=dev['id'],install_state=dev['install_state'],status='linked',message='Account linked. Measurements require completed installation and calibration.'),201

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
        jobs=rows(c,'SELECT id,kind,status,priority,device_id,assignee_id,opened_at,completed_at FROM jobs ORDER BY opened_at DESC LIMIT 100')
        audit(c,g.actor['id'],'ops_summary_viewed')
    return jsonify(fleet=dict(counts),job_counts=jobcounts,jobs=jobs,unavailable_metrics=['MRR','CAC','runway','churn','confirmed_theft'])

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

@bp.get('/api/v1/public/capabilities')
def capabilities():
    # Curated names only; never publish flag targeting or private configuration.
    with transaction() as c:
        enabled=bool(scalar(c,"SELECT enabled_globally FROM feature_flags WHERE key='water_management'"))
    return jsonify(water_management=enabled)

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
