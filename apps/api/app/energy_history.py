"""Append-only closed-window evidence; a residual is never a financial liability."""
import hashlib,json
from datetime import datetime,timezone
from flask import Blueprint,g,request,jsonify
from .db import transaction,building,one,rows,json_text,audit,DomainError
from .live_auth import authenticated
from .idempotency import idempotent
from .business_rules import resolve
from .energy_reconciliation import measurement
bp=Blueprint('energy_history',__name__)

def fingerprint(value):return hashlib.sha256(json_text(value).encode()).hexdigest()
def context(b):return {'building_id':str(b['id']),'region':b['region'],'organization_id':str(b['organization_id']) if b['organization_id'] else None}

def trend(windows,required):
    if required is None:return {'status':'not_configured','consecutive_review_windows':0,'required':None}
    count=0;previous=None
    for item in windows:
        if item['status']!='review':break
        if previous and(item['period_end_ms']!=previous['period_start_ms'] or item['policy_sha256']!=previous['policy_sha256'] or item['topology_version']!=previous['topology_version']):break
        count+=1;previous=item
    return {'status':'persistent_review' if count>=required else 'latest_within_tolerance' if windows and windows[0]['status']=='within_tolerance' else 'unknown' if windows and windows[0]['status']=='unknown' else 'awaiting_qualified_windows','consecutive_review_windows':count,'required':required}

def latest(c,bid,minutes):
    # A late reassessment retains its predecessor but cannot count the same interval twice.
    return rows(c,"""SELECT * FROM(SELECT DISTINCT ON(period_end_ms) id,period_start_ms,period_end_ms,topology_version,policy_sha256,snapshot_sha256,status,difference_mwh,created_at,snapshot
      FROM energy_comparison_windows WHERE building_id=:bid AND minutes=:minutes
      ORDER BY period_end_ms DESC,created_at DESC,id DESC) chosen ORDER BY period_end_ms DESC LIMIT 100""",bid=bid,minutes=minutes)

def record_window(c,b,minutes,end,actor_id=None,mode='manual',schedule_version=None):
    snapshot=measurement(c,b,end-minutes*60000,end)
    snapshot.update(recording_mode=mode,schedule_version=schedule_version)
    snapshot=json.loads(json_text(snapshot));policy=fingerprint(snapshot['rules']);digest=fingerprint(snapshot)
    params=dict(bid=str(b['id']),minutes=minutes,start=end-minutes*60000,end=end,version=b['topology_version'],policy=policy,digest=digest,status=snapshot['status'],difference=snapshot['difference_mwh'],snapshot=json_text(snapshot),uid=actor_id,mode=mode)
    row=one(c,"""INSERT INTO energy_comparison_windows(building_id,minutes,period_start_ms,period_end_ms,topology_version,policy_sha256,snapshot_sha256,status,difference_mwh,snapshot,created_by,recording_mode)
      VALUES(:bid,:minutes,:start,:end,:version,:policy,:digest,:status,:difference,CAST(:snapshot AS jsonb),:uid,:mode)
      ON CONFLICT(building_id,minutes,period_end_ms,topology_version,policy_sha256,snapshot_sha256) DO NOTHING RETURNING id""",**params)
    created=bool(row)
    if created:audit(c,actor_id,'energy_comparison_recorded',row['id'],{'building_id':str(b['id']),'snapshot_sha256':digest,'status':snapshot['status'],'financial_effect':False,'recording_mode':mode,'schedule_version':schedule_version})
    else:row=one(c,'SELECT id FROM energy_comparison_windows WHERE building_id=:bid AND minutes=:minutes AND period_end_ms=:end AND topology_version=:version AND policy_sha256=:policy AND snapshot_sha256=:digest',**params)
    from .energy_review import reconcile
    reconcile(c,b,minutes)
    return row,created

@bp.route('/api/v1/buildings/<building_id>/energy-reconciliation/history',methods=['GET','POST'])
@authenticated
@idempotent
def history(building_id):
    data=request.get_json() or {} if request.method=='POST' else request.args
    if request.method=='POST' and set(data)-{'minutes'}:raise DomainError('validation_error','Only the comparison period belongs in this request.')
    raw=data.get('minutes',15)
    if request.method=='POST' and type(raw) is not int:raise DomainError('validation_error','Choose a whole comparison period.')
    try:minutes=int(raw)
    except (TypeError,ValueError):raise DomainError('validation_error','Choose 15, 60 or 1440 minutes.')
    if minutes not in (15,60,1440):raise DomainError('validation_error','Choose 15, 60 or 1440 minutes.')
    with transaction() as c:
        b=building(c,g.actor,building_id);ctx=context(b)
        delay=resolve(c,'reconciliation.collection_delay_ms',ctx);required=resolve(c,'reconciliation.consecutive_windows',ctx)
        recorded=None
        if request.method=='POST':
            if delay['value'] is None:raise DomainError('comparison_policy_unconfigured','Approve a collection delay before recording closed-window evidence.',409)
            # Topology writers use this same building lock: snapshot and version stay together.
            b=one(c,'SELECT * FROM buildings WHERE id=:id FOR UPDATE',id=building_id)
            span=minutes*60000;end=((int(datetime.now(timezone.utc).timestamp()*1000)-delay['value'])//span)*span
            row,created=record_window(c,b,minutes,end,g.actor['id'])
            recorded=row if created else None
        windows=latest(c,building_id,minutes)
    return jsonify(items=windows,trend=trend(windows,required['value']),can_record=delay['value'] is not None,
        recorded_id=str(recorded['id']) if recorded else None,minutes=minutes,
        limitations=['Each interval counts once; reassessments retain earlier evidence without counting it again.',
          'Unknown coverage, missing intervals, changed topology or comparison policy break consecutive review windows.',
          'A persistent difference asks for investigation and does not prove theft or authorise a charge/disconnection.',
          'Recording can be requested explicitly or enabled for this building; worker processing, physical wiring qualification and financial settlement remain separate.'])

@bp.get('/api/v1/buildings/<building_id>/energy-reconciliation/history/<record_id>')
@authenticated
def evidence(building_id,record_id):
    import base64
    from .db import uuid_string
    with transaction() as c:
        building(c,g.actor,building_id)
        item=one(c,'SELECT * FROM energy_comparison_windows WHERE id=:id AND building_id=:bid',id=uuid_string(record_id),bid=building_id)
        if not item:raise DomainError('not_found','Comparison evidence not found.',404)
        canonical=json_text(item['snapshot']).encode()
        if hashlib.sha256(canonical).hexdigest()!=item['snapshot_sha256']:raise DomainError('evidence_checksum_mismatch','The stored comparison needs integrity review before export.',409)
        assessments=rows(c,'SELECT id,created_at,snapshot_sha256 FROM energy_comparison_windows WHERE building_id=:bid AND minutes=:minutes AND period_end_ms=:end ORDER BY created_at DESC,id DESC LIMIT 101',bid=building_id,minutes=item['minutes'],end=item['period_end_ms'])
        audit(c,g.actor['id'],'energy_comparison_exported',record_id)
    return jsonify(record_id=record_id,environment=item['snapshot'].get('environment','unrecorded'),canonical_base64=base64.b64encode(canonical).decode(),sha256=item['snapshot_sha256'],
        integrity='database_snapshot_checksum',signature=None,assessments=assessments[:100],assessments_truncated=len(assessments)>100,
        limitations=['The checksum identifies database evidence, not an independent public-key signature or electrical certification.','Source payload hashes refer to device-authenticated inbox evidence. A residual does not prove theft.'])
