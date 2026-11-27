"""Building difference investigations with scoped evidence and explicit human handoff."""
from datetime import datetime,timezone
from flask import Blueprint,g,request,jsonify
from .db import transaction,one,rows,query,audit,DomainError,uuid_string,building,json_text
from .live_auth import authenticated,staff
from .idempotency import idempotent
from .energy_history import latest,trend,context
from .business_rules import resolve
bp=Blueprint('energy_review',__name__)
# All original and latest sources must be scoped to ONE current organisation.
UTILITY_SCOPE="""EXISTS(SELECT 1 FROM memberships m WHERE m.user_id=:uid AND m.role='nepa_staff' AND m.revoked_at IS NULL
 AND jsonb_array_length(first.snapshot->'sources')>1 AND NOT EXISTS(
 SELECT 1 FROM jsonb_array_elements((first.snapshot->'sources')||(last.snapshot->'sources')) source
 WHERE NOT EXISTS(SELECT 1 FROM utility_device_scopes s WHERE s.organization_id=m.organization_id AND s.device_id=(source->>'device_id')::uuid AND s.revoked_at IS NULL)))"""
SELECT="""SELECT review.*,b.landlord_id,first.period_start_ms,first.period_end_ms,first.snapshot_sha256,first.difference_mwh,
 last.status AS latest_measurement_status,last.difference_mwh AS latest_difference_mwh,last.period_end_ms AS latest_period_end_ms,
 t.status AS support_status,t.reporter_id AS ticket_reporter_id,j.status AS inspection_status
 FROM energy_review_cases review JOIN buildings b ON b.id=review.building_id
 JOIN energy_comparison_windows first ON first.id=review.first_window_id JOIN energy_comparison_windows last ON last.id=review.latest_window_id
 LEFT JOIN support_tickets t ON t.id=review.ticket_id LEFT JOIN jobs j ON j.id=review.job_id"""

def reconcile(c,b,minutes):
    windows=latest(c,b['id'],minutes)
    if not windows:return
    newest=windows[0];required=resolve(c,'reconciliation.consecutive_windows',context(b),at=datetime.fromtimestamp(newest['period_end_ms']/1000,timezone.utc))['value']
    active=one(c,"SELECT * FROM energy_review_cases WHERE building_id=:id AND minutes=:minutes AND status<>'resolved' FOR UPDATE",id=b['id'],minutes=minutes)
    if active:
        if active['latest_window_id']!=newest['id']:query(c,'UPDATE energy_review_cases SET latest_window_id=:window,version=version+1,updated_at=now() WHERE id=:id',window=newest['id'],id=active['id'])
        return
    if trend(windows,required)['status']!='persistent_review':return
    prior=one(c,"SELECT w.period_end_ms FROM energy_review_cases review JOIN energy_comparison_windows w ON w.id=review.latest_window_id WHERE review.building_id=:id AND review.minutes=:minutes AND review.status='resolved' ORDER BY w.period_end_ms DESC LIMIT 1",id=b['id'],minutes=minutes)
    if prior and prior['period_end_ms']>=newest['period_end_ms']:return
    sources=newest['snapshot']['sources']
    if len(sources)<2 or sources[0].get('role')!='incoming':return
    case=one(c,'INSERT INTO energy_review_cases(building_id,minutes,parent_device_id,first_window_id,latest_window_id) VALUES(:bid,:minutes,:parent,:window,:window) RETURNING id',bid=b['id'],minutes=minutes,parent=sources[0]['device_id'],window=newest['id'])
    audit(c,None,'energy_review_opened',case['id'],{'building_id':str(b['id']),'window_id':str(newest['id']),'required_windows':required,'qualifying_windows':[{'id':str(window['id']),'snapshot_sha256':window['snapshot_sha256']} for window in windows[:required]],'financial_effect':False,'theft_verdict':False})
    from .work import notify
    notify(c,b['landlord_id'],'energy.review','Consecutive recorded energy differences need review. This is not proof of theft and no resident has been charged or disconnected.','energy-review:'+str(case['id'])+':owner',details={'energy_review_id':str(case['id']),'building_id':str(b['id'])})
    recipients=rows(c,"""SELECT DISTINCT p.id FROM profiles p WHERE p.role='nepa_staff' AND EXISTS(SELECT 1 FROM memberships m
      WHERE m.user_id=p.id AND m.role='nepa_staff' AND m.revoked_at IS NULL AND NOT EXISTS(
       SELECT 1 FROM jsonb_array_elements(CAST(:sources AS jsonb)) source WHERE NOT EXISTS(SELECT 1 FROM utility_device_scopes s WHERE s.organization_id=m.organization_id AND s.device_id=(source->>'device_id')::uuid AND s.revoked_at IS NULL)))""",sources=json_text(sources))
    for recipient in recipients:notify(c,recipient['id'],'energy.review','A scoped energy comparison needs investigation. A difference does not prove theft or authorise disconnection.','energy-review:'+str(case['id'])+':'+str(recipient['id']),channels=[],details={'energy_review_id':str(case['id'])})

def projection(row):
    owner=str(row['landlord_id'])==g.actor['id']
    return {**{key:row[key] for key in ('id','minutes','status','version','created_at','period_start_ms','period_end_ms','snapshot_sha256','difference_mwh','latest_measurement_status','latest_difference_mwh','latest_period_end_ms','support_status','inspection_status')},
            'building_id':row['building_id'] if owner else None,'can_manage':owner,'has_support_request':bool(row['ticket_id']) and (not owner or str(row['ticket_reporter_id'])==g.actor['id']),'prior_support_authority_changed':owner and bool(row['ticket_id']) and str(row['ticket_reporter_id'])!=g.actor['id'],'acknowledged_by_me':str(row['acknowledged_by'])==g.actor['id'],
            'ticket_id':row['ticket_id'] if str(row['ticket_reporter_id'])==g.actor['id'] else None,'job_requested':bool(row['job_id'])}

@bp.get('/api/v1/energy-reviews')
@authenticated
def list_reviews():
    bid=uuid_string(request.args['building_id']) if request.args.get('building_id') else None
    with transaction() as c:
        if bid:building(c,g.actor,bid)
        items=rows(c,SELECT+" WHERE(CAST(:bid AS uuid) IS NULL OR review.building_id=CAST(:bid AS uuid)) AND(b.landlord_id=:uid OR(:utility AND "+UTILITY_SCOPE+")) ORDER BY (review.status='resolved'),review.created_at DESC LIMIT 101",bid=bid,uid=g.actor['id'],utility=g.actor['role']=='nepa_staff')
    return jsonify(items=[projection(row) for row in items[:100]],truncated=len(items)>100,limitations=['Differences ask for investigation; they do not establish theft.','Utility visibility requires current scope for every original and latest source in one organisation.','Unknown or in-tolerance later measurements do not fabricate a completed human investigation.'])

@bp.post('/api/v1/energy-reviews/<review_id>/actions')
@authenticated
@idempotent
def action(review_id):
    data=request.get_json() or {};kind=data.get('action')
    if set(data)-{'action','version','message'}:raise DomainError('validation_error','Unsupported investigation field.')
    if kind not in ('acknowledge','request_investigation'):raise DomainError('validation_error','Choose acknowledgement or an investigation request.')
    with transaction() as c:
        hint=one(c,'SELECT building_id FROM energy_review_cases WHERE id=:id',id=uuid_string(review_id))
        if not hint:raise DomainError('not_found','Energy review not found.',404)
        b=one(c,'SELECT * FROM buildings WHERE id=:id AND landlord_id=:uid FOR UPDATE',id=hint['building_id'],uid=g.actor['id'])
        if not b:raise DomainError('not_found','Energy review not found.',404)
        row=one(c,'SELECT * FROM energy_review_cases WHERE id=:id FOR UPDATE',id=review_id)
        if type(data.get('version')) is not int or row['version']!=data['version']:raise DomainError('version_conflict','This investigation changed. Reload before continuing.',409)
        if row['status']=='resolved':raise DomainError('invalid_transition','Reopen the linked support request to continue a resolved investigation.',409)
        if kind=='acknowledge':
            query(c,"UPDATE energy_review_cases SET status='acknowledged',acknowledged_by=:uid,acknowledged_at=now(),version=version+1,updated_at=now() WHERE id=:id",uid=g.actor['id'],id=review_id)
        else:
            if row['ticket_id']:
                ticket=one(c,'SELECT reporter_id FROM support_tickets WHERE id=:id',id=row['ticket_id'])
                if str(ticket['reporter_id'])==g.actor['id']:return jsonify(ticket_id=row['ticket_id'],existing=True)
            note=data.get('message','')
            if not isinstance(note,str) or not 10<=len(note.strip())<=3000:raise DomainError('validation_error','Describe the concern in 10–3000 characters.')
            source=one(c,'SELECT snapshot_sha256 FROM energy_comparison_windows WHERE id=:id',id=row['first_window_id'])
            ticket=one(c,"INSERT INTO support_tickets(reporter_id,scope_device_id,category,subject,message) VALUES(:uid,:device,'device','Review persistent energy difference',:message) RETURNING id",uid=g.actor['id'],device=row['parent_device_id'],message=note.strip()+'\n\nEnergy review: '+str(row['id'])+'\nEvidence checksum: '+source['snapshot_sha256']+'\nThis is an investigation request, not proof of theft.')
            query(c,'UPDATE energy_review_cases SET ticket_id=:ticket,version=version+1,updated_at=now() WHERE id=:id',id=review_id,ticket=ticket['id'])
            if row['ticket_id']:audit(c,g.actor['id'],'energy_review_authority_renewed',review_id,{'previous_ticket_id':str(row['ticket_id']),'new_ticket_id':str(ticket['id']),'old_private_messages_shared':False})
        audit(c,g.actor['id'],'energy_review_'+kind,review_id)
    return jsonify(status='saved',ticket_id=str(ticket['id']) if kind=='request_investigation' else None)

def for_ticket(c,ticket):
    if str(ticket['reporter_id'])!=g.actor['id'] and not(g.actor['role'] in ('internal_support','internal_superadmin') and str(ticket['assigned_to'])==g.actor['id']):return None
    row=one(c,SELECT+' WHERE review.ticket_id=:id',id=ticket['id'])
    if row and str(row['landlord_id'])!=str(ticket['reporter_id']):return None
    return {key:row[key] for key in ('id','status','difference_mwh','snapshot_sha256','latest_measurement_status','latest_difference_mwh','inspection_status','job_id')} if row else None

def ticket_changed(c,ticket_id,status):
    row=one(c,'SELECT * FROM energy_review_cases WHERE ticket_id=:id FOR UPDATE',id=ticket_id)
    if not row:return
    authority=one(c,'SELECT b.landlord_id,t.reporter_id FROM buildings b JOIN support_tickets t ON t.id=:ticket WHERE b.id=:bid',ticket=ticket_id,bid=row['building_id'])
    if str(authority['landlord_id'])!=str(authority['reporter_id']):return
    new='resolved' if status=='resolved' else 'open' if row['status']=='resolved' else row['status']
    if new==row['status']:return
    if new!='resolved' and one(c,"SELECT id FROM energy_review_cases WHERE building_id=:bid AND minutes=:minutes AND status<>'resolved' AND id<>:id",bid=row['building_id'],minutes=row['minutes'],id=row['id']):raise DomainError('newer_energy_review_exists','A newer energy investigation is already open. Continue that review.',409)
    query(c,"UPDATE energy_review_cases SET status=:status,resolved_at=CASE WHEN :status='resolved' THEN now() ELSE NULL END,version=version+1,updated_at=now() WHERE id=:id",id=row['id'],status=new)
    audit(c,g.actor['id'],'energy_review_support_transition',row['id'],{'from':row['status'],'to':new,'ticket_id':ticket_id})

@bp.post('/api/v1/support/tickets/<ticket_id>/energy-inspection')
@authenticated
@idempotent
def inspection(ticket_id):
    staff('internal_support','internal_superadmin')
    with transaction() as c:
        ticket=one(c,'SELECT * FROM support_tickets WHERE id=:id FOR UPDATE',id=uuid_string(ticket_id))
        if not ticket or str(ticket['assigned_to'])!=g.actor['id']:raise DomainError('claim_required','Claim this support request before arranging an inspection.',403)
        if ticket['status']=='resolved':raise DomainError('invalid_transition','Reopen the support request first.',409)
        row=one(c,'SELECT * FROM energy_review_cases WHERE ticket_id=:id FOR UPDATE',id=ticket_id)
        if not row:raise DomainError('not_found','Energy review not found.',404)
        scope=one(c,'SELECT d.id FROM devices d JOIN buildings b ON b.id=:bid LEFT JOIN rooms r ON r.id=d.room_id WHERE d.id=:id AND coalesce(d.building_id,r.building_id)=b.id AND b.landlord_id=:reporter',id=row['parent_device_id'],bid=row['building_id'],reporter=ticket['reporter_id'])
        if not scope:raise DomainError('scope_changed','Installation ownership or source scope changed; confirm authority before dispatch.',409)
        if row['job_id']:return jsonify(id=row['job_id'],existing=True)
        job=one(c,"INSERT INTO jobs(device_id,kind,created_by) VALUES(:device,'inspection',:uid) RETURNING id,status",device=row['parent_device_id'],uid=g.actor['id'])
        query(c,'UPDATE energy_review_cases SET job_id=:job,version=version+1,updated_at=now() WHERE id=:id',id=row['id'],job=job['id'])
        query(c,"INSERT INTO support_messages(ticket_id,author_id,message) VALUES(:id,:uid,'An energy comparison inspection was requested. Field findings remain pending; no theft verdict is inferred.')",id=ticket_id,uid=g.actor['id'])
        audit(c,g.actor['id'],'energy_inspection_requested',job['id'],{'ticket_id':ticket_id,'review_id':str(row['id'])})
    return jsonify(id=job['id'],status=job['status']),201
