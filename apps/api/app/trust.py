"""Scoped signed-signal review and inspection handoff; no accusation or remote cutoff."""
from flask import Blueprint,g,request,jsonify
from .db import transaction,one,rows,query,device,reading_since,audit,uuid_string,DomainError
from .live_auth import authenticated,staff
from .idempotency import idempotent
bp=Blueprint('trust',__name__)

def visible_signals(c,d,signal_id=None):
    return rows(c,"""SELECT s.id,s.kind,s.active,s.occurred_at_ms,s.clock_quality,s.received_at,
      i.payload_sha256 AS signed_payload_sha256,i.key_epoch,i.boot_id,i.seq,
      review.ticket_id,t.status AS review_status,review.job_id,j.status AS inspection_status
      FROM device_signals s JOIN device_inbox i ON i.id=s.inbox_id
      LEFT JOIN signal_reviews review ON review.signal_id=s.id AND review.reporter_id=:uid
      LEFT JOIN support_tickets t ON t.id=review.ticket_id LEFT JOIN jobs j ON j.id=review.job_id
      WHERE s.device_id=:id AND(CAST(:signal AS uuid) IS NULL OR s.id=CAST(:signal AS uuid))
      AND(CAST(:since AS timestamptz) IS NULL OR (s.clock_quality='trusted' AND s.occurred_at_ms>=extract(epoch FROM CAST(:since AS timestamptz))*1000))
      ORDER BY s.received_at DESC,s.id DESC LIMIT 100""",id=d['id'],uid=g.actor['id'],since=reading_since(c,g.actor,d),signal=signal_id)

@bp.get('/api/v1/devices/<device_id>/trust')
@authenticated
def trust(device_id):
    with transaction() as c:
        d=device(c,g.actor,device_id);signals=visible_signals(c,d)
        occupancy=one(c,'SELECT tenant_id FROM occupancies WHERE room_id=:room AND end_at IS NULL',room=d['room_id'])
        can_request=(str(occupancy['tenant_id'])==g.actor['id']) if occupancy else str(d['owner_id'])==g.actor['id']
    return jsonify(items=signals,can_request_review=can_request,limitations=['A signed device signal is evidence of what the device reported, not proof of theft.',
                    'Connectivity loss or a difference between nearby supply readings does not establish bypass.','No public alarm, accusation or automatic punitive cutoff is issued.'])

@bp.post('/api/v1/devices/<device_id>/signals/<signal_id>/review')
@authenticated
@idempotent
def request_review(device_id,signal_id):
    data=request.get_json() or {};note=data.get('message','')
    if not isinstance(note,str) or not 10<=len(note.strip())<=3000:raise DomainError('validation_error','Describe the concern in 10–3000 characters.')
    with transaction() as c:
        d=device(c,g.actor,device_id,write=True)
        if d['room_id']:query(c,'SELECT id FROM rooms WHERE id=:id FOR UPDATE',id=d['room_id'])
        query(c,'SELECT id FROM devices WHERE id=:id FOR UPDATE',id=d['id'])
        occupancy=one(c,'SELECT tenant_id FROM occupancies WHERE room_id=:room AND end_at IS NULL',room=d['room_id'])
        if occupancy and str(occupancy['tenant_id'])!=g.actor['id']:raise DomainError('resident_authority_required','The current resident requests review of this room’s signals.',403)
        signals=visible_signals(c,d,uuid_string(signal_id))
        if not signals:raise DomainError('not_found','Signal not found within your access period.',404)
        signal=signals[0]
        if signal['ticket_id']:return jsonify(id=signal['ticket_id'],status=signal['review_status'],existing=True)
        ticket=create_review(c,d['id'],signal,note)
    return jsonify(id=ticket['id'],status=ticket['status'],existing=False),201

@bp.post('/api/v1/support/tickets/<ticket_id>/inspection')
@authenticated
@idempotent
def inspection(ticket_id):
    staff('internal_support','internal_superadmin')
    with transaction() as c:
        ticket=one(c,'SELECT * FROM support_tickets WHERE id=:id FOR UPDATE',id=uuid_string(ticket_id))
        if not ticket or str(ticket['assigned_to'])!=g.actor['id']:raise DomainError('claim_required','Claim this support request before arranging an inspection.',403)
        if ticket['status']=='resolved':raise DomainError('invalid_transition','Reopen the request before arranging an inspection.',409)
        review=one(c,'SELECT * FROM signal_reviews WHERE ticket_id=:id FOR UPDATE',id=ticket_id)
        if not review:raise DomainError('not_found','This request has no linked signed signal.',404)
        if review['job_id']:return jsonify(id=review['job_id'],status='already_requested')
        job=one(c,"INSERT INTO jobs(device_id,kind,created_by) VALUES(:device,'inspection',:uid) RETURNING id,status",device=ticket['scope_device_id'],uid=g.actor['id'])
        query(c,'UPDATE signal_reviews SET job_id=:job WHERE id=:id',id=review['id'],job=job['id'])
        query(c,"INSERT INTO support_messages(ticket_id,author_id,message) VALUES(:id,:uid,'An inspection work order was requested. Scheduling and field findings remain pending.')",id=ticket_id,uid=g.actor['id'])
        audit(c,g.actor['id'],'signal_inspection_requested',job['id'],{'ticket_id':ticket_id,'signal_id':str(review['signal_id'])})
        from .work import notify
        notify(c,ticket['reporter_id'],'support.updated','An inspection was requested for your signal review. Open your support request for progress.','signal-inspection:'+str(job['id']),channels=[])
    return jsonify(id=job['id'],status=job['status']),201


def notify_signal(c,job):
    from .work import notify
    payload=job['payload'];did=payload['device_id']
    signal=one(c,'SELECT id,occurred_at_ms,clock_quality,active FROM device_signals WHERE inbox_id=:id',id=payload['inbox_id'])
    if not signal:raise DomainError('signal_missing','The committed signal is unavailable.',409)
    recipients=rows(c,"""SELECT DISTINCT p.id,p.role FROM profiles p WHERE
      EXISTS(SELECT 1 FROM devices d WHERE d.id=:did AND d.owner_id=p.id AND NOT EXISTS(SELECT 1 FROM occupancies o WHERE o.room_id=d.room_id AND o.end_at IS NULL))
      OR EXISTS(SELECT 1 FROM occupancies o JOIN devices d ON d.room_id=o.room_id WHERE d.id=:did AND o.end_at IS NULL AND o.tenant_id=p.id)
      OR(p.role='nepa_staff' AND EXISTS(SELECT 1 FROM memberships m JOIN utility_device_scopes s ON s.organization_id=m.organization_id
        WHERE m.user_id=p.id AND m.role='nepa_staff' AND m.revoked_at IS NULL AND s.revoked_at IS NULL AND s.device_id=:did))""",did=did)
    for recipient in recipients:
        kind=job['event_type'];active=signal['active']
        message='A device reported a '+kind+' signal for investigation.' if active else 'A device reported that its '+kind+' signal cleared. Review the recorded evidence and other restrictions.'
        if kind=='tamper':message+=' This signal asks for investigation; it does not prove theft.'
        message+=' No physical switching is confirmed by this signal.'
        notify(c,recipient['id'],kind,message,'signal:'+str(signal['id'])+':'+str(recipient['id']),channels=[] if recipient['role']=='nepa_staff' else None,
               details={'alert_type':kind if active else 'info','device_id':str(did),'signal_id':str(signal['id']),'observed_at_ms':signal['occurred_at_ms'],'clock_quality':signal['clock_quality']})


def create_review(c,device_id,signal,note):
    message=note.strip()+'\n\nSigned signal reference: '+str(signal['id'])+'\nPayload SHA-256: '+signal['signed_payload_sha256']+'\nThis signal requests investigation; it does not establish theft.'
    ticket=one(c,"INSERT INTO support_tickets(reporter_id,scope_device_id,category,subject,message) VALUES(:uid,:device,'device','Review '||:kind||' signal',:message) RETURNING id,status",uid=g.actor['id'],device=device_id,kind=signal['kind'],message=message)
    query(c,'INSERT INTO signal_reviews(signal_id,reporter_id,ticket_id) VALUES(:signal,:uid,:ticket)',signal=signal['id'],uid=g.actor['id'],ticket=ticket['id'])
    audit(c,g.actor['id'],'signal_review_requested',ticket['id'],{'signal_id':str(signal['id'])})
    return ticket

@bp.post('/api/v1/utility/signals/<signal_id>/review')
@authenticated
@idempotent
def utility_review(signal_id):
    staff('nepa_staff')
    with transaction() as c:
        signal=one(c,"""SELECT s.id,s.device_id,s.kind,i.payload_sha256 AS signed_payload_sha256
          FROM device_signals s JOIN device_inbox i ON i.id=s.inbox_id
          WHERE s.id=:id FOR SHARE OF s""",id=uuid_string(signal_id))
        if not signal:raise DomainError('not_found','Signal not found within your organization scope.',404)
        scope=one(c,"""SELECT scopes.id FROM utility_device_scopes scopes JOIN memberships m ON m.organization_id=scopes.organization_id
          WHERE scopes.device_id=:device AND scopes.revoked_at IS NULL AND m.user_id=:uid AND m.role='nepa_staff' AND m.revoked_at IS NULL
          LIMIT 1 FOR SHARE OF scopes,m""",device=signal['device_id'],uid=g.actor['id'])
        if not scope:raise DomainError('not_found','Signal not found within your organization scope.',404)
        query(c,'SELECT id FROM devices WHERE id=:id FOR UPDATE',id=signal['device_id'])
        existing=one(c,'SELECT r.ticket_id,t.status FROM signal_reviews r JOIN support_tickets t ON t.id=r.ticket_id WHERE r.signal_id=:id AND r.reporter_id=:uid',id=signal['id'],uid=g.actor['id'])
        if existing:return jsonify(id=existing['ticket_id'],status=existing['status'],existing=True)
        ticket=create_review(c,signal['device_id'],signal,'Please review this signed signal in our assigned device scope.')
    return jsonify(id=ticket['id'],status=ticket['status'],existing=False),201
