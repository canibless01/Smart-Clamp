"""Bounded durable audience fanout. Never expand the frozen recipient list."""
from flask import g
from .db import transaction,one,rows,query,DomainError,audit

def process(payload):
    from .communications import SENDERS,organization
    from .audiences import resolve
    from .work import notify
    old=getattr(g,'actor',None)
    try:
        with transaction() as c:
            notice=one(c,'SELECT d.id AS dispatch_id,d.actor_id AS sender_id,p.* FROM service_notice_dispatches d JOIN service_notice_previews p ON p.id=d.preview_id WHERE d.id=:id',id=payload['dispatch_id'])
            if not notice:return
            actor=one(c,'SELECT * FROM profiles WHERE id=:id',id=notice['sender_id']);eligible=set();reason='scope_or_eligibility_changed'
            if actor and actor['role'] in SENDERS:
                g.actor=dict(actor);g.actor['id']=str(actor['id'])
                try:
                    org=organization(c,str(notice['organization_id']) if notice['organization_id'] else None)
                    _,people=resolve(c,notice['audience_criteria'],org);eligible=set(people)
                except DomainError:eligible=set()
            for uid in payload['recipient_ids']:
                work=one(c,'SELECT status FROM service_notice_recipient_work WHERE dispatch_id=:did AND recipient_id=:uid FOR UPDATE',did=notice['dispatch_id'],uid=uid)
                if not work or work['status']!='queued':continue
                if uid in eligible:
                    notify(c,uid,'utility.notice' if notice['organization_id'] else 'service.notice',notice['title']+'\n'+notice['message'],'notice:'+str(notice['dispatch_id'])+':'+uid,channels=notice['channels'])
                    query(c,"UPDATE service_notice_recipient_work SET status='committed',processed_at=now() WHERE dispatch_id=:did AND recipient_id=:uid",did=notice['dispatch_id'],uid=uid)
                else:query(c,"UPDATE service_notice_recipient_work SET status='skipped',reason=:reason,processed_at=now() WHERE dispatch_id=:did AND recipient_id=:uid",did=notice['dispatch_id'],uid=uid,reason=reason)
            audit(c,str(notice['sender_id']),'service_notice_batch_processed',notice['dispatch_id'])
    finally:
        if old is None:g.pop('actor',None)
        else:g.actor=old
