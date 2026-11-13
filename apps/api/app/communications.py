"""Bounded service notices with reviewed utility scope and a five-minute audience preview."""
from datetime import datetime,timezone,timedelta
from flask import Blueprint,request,jsonify,g
from .db import transaction,one,rows,query,scalar,json_text,uuid_string,audit,DomainError
from .live_auth import authenticated,staff
from .idempotency import idempotent
from .work import notify
from .notifications import sms_configured
from .web_push import configured as push_configured

bp=Blueprint('communications',__name__)
SENDERS={'internal_ops','internal_support','internal_superadmin','nepa_staff'}
def sender():
    if g.actor['role'] not in SENDERS:raise DomainError('forbidden','Service messaging is not available in this workspace.',403)

def organization(c,org):
    if g.actor['role']!='nepa_staff':return None
    org=uuid_string(org)
    grant=one(c,"SELECT o.id,o.name FROM organizations o JOIN organization_notice_grants n ON n.organization_id=o.id WHERE o.id=:org AND n.enabled AND n.expires_at>now() AND EXISTS(SELECT 1 FROM memberships WHERE organization_id=o.id AND user_id=:uid AND role='nepa_staff' AND revoked_at IS NULL)",org=org,uid=g.actor['id'])
    if not grant:raise DomainError('utility_notice_scope_required','Utility messages require an active reviewed organization grant.',403)
    return org

def audience(c,device_ids,org):
    for did in device_ids:
        dev=one(c,'SELECT id FROM devices WHERE id=:id',id=did)
        if not dev:raise DomainError('scope_denied','A selected device is unavailable within this scope.',403)
        if org and not one(c,'SELECT id FROM utility_device_scopes WHERE organization_id=:org AND device_id=:did AND revoked_at IS NULL',org=org,did=did):raise DomainError('scope_denied','A selected device is unavailable within this scope.',403)
    people=rows(c,"""SELECT DISTINCT p.id FROM profiles p WHERE p.onboarding_completed_at IS NOT NULL AND
      (EXISTS(SELECT 1 FROM devices d WHERE d.id=ANY(CAST(:ids AS uuid[])) AND d.owner_id=p.id) OR
       EXISTS(SELECT 1 FROM occupancies o JOIN devices d ON d.room_id=o.room_id WHERE d.id=ANY(CAST(:ids AS uuid[])) AND o.tenant_id=p.id AND o.end_at IS NULL))
      AND (:utility=false OR EXISTS(SELECT 1 FROM user_preferences pref WHERE pref.user_id=p.id AND pref.value->'utility_notices_enabled'='true'::jsonb)) ORDER BY p.id""",ids=device_ids,utility=bool(org))
    if len(people)>500:raise DomainError('audience_too_large','Select a smaller service audience.',422)
    return sorted(str(p['id']) for p in people)

def summary(c,recipients,channels):
    push=scalar(c,"SELECT count(*) FROM push_subscriptions s JOIN user_preferences p ON p.user_id=s.user_id WHERE s.enabled AND s.user_id=ANY(CAST(:ids AS uuid[])) AND p.value->'push_enabled'='true'::jsonb",ids=recipients) if push_configured() and 'push' in channels else 0
    sms=scalar(c,"SELECT count(*) FROM profiles p JOIN user_preferences pref ON pref.user_id=p.id WHERE p.id=ANY(CAST(:ids AS uuid[])) AND p.phone IS NOT NULL AND pref.value->'sms_enabled'='true'::jsonb",ids=recipients) if sms_configured() and 'sms' in channels else 0
    return {'in_app_recipients':len(recipients),'push_subscriptions':push,'sms_recipients':sms}

@bp.get('/api/v1/communications/context')
@authenticated
def context():
    sender()
    with transaction() as c:
        orgs=rows(c,"SELECT DISTINCT o.id,o.name FROM organizations o JOIN memberships m ON m.organization_id=o.id JOIN organization_notice_grants n ON n.organization_id=o.id WHERE m.user_id=:uid AND m.role='nepa_staff' AND m.revoked_at IS NULL AND n.enabled AND n.expires_at>now()",uid=g.actor['id']) if g.actor['role']=='nepa_staff' else []
        devices=rows(c,"SELECT d.id,d.profile,d.install_state FROM devices d WHERE :internal OR EXISTS(SELECT 1 FROM utility_device_scopes s JOIN organization_notice_grants n ON n.organization_id=s.organization_id JOIN memberships m ON m.organization_id=s.organization_id WHERE s.device_id=d.id AND s.revoked_at IS NULL AND n.enabled AND n.expires_at>now() AND m.user_id=:uid AND m.role='nepa_staff' AND m.revoked_at IS NULL) ORDER BY d.created_at DESC LIMIT 200",internal=g.actor['role']!='nepa_staff',uid=g.actor['id'])
        history=rows(c,"SELECT d.id,p.title,d.recipient_count,d.created_at FROM service_notice_dispatches d JOIN service_notice_previews p ON p.id=d.preview_id WHERE d.actor_id=:uid ORDER BY d.created_at DESC LIMIT 50",uid=g.actor['id'])
        scopes=rows(c,'SELECT device_id,organization_id FROM utility_device_scopes WHERE organization_id=ANY(CAST(:ids AS uuid[])) AND revoked_at IS NULL',ids=[str(o['id']) for o in orgs]) if orgs else []
        for device in devices:device['organization_ids']=[str(s['organization_id']) for s in scopes if s['device_id']==device['id']]
        grants=rows(c,'SELECT n.organization_id,o.name,n.enabled,n.expires_at,n.version FROM organization_notice_grants n JOIN organizations o ON o.id=n.organization_id ORDER BY o.name') if g.actor['role']=='internal_superadmin' else None
        audit(c,g.actor['id'],'service_messaging_context_viewed')
    return jsonify(organizations=orgs,devices=devices,history=history,notice_grants=grants,can_review_grants=g.actor['role']=='internal_superadmin',firmware_access=g.actor['role']=='internal_superadmin',utility=g.actor['role']=='nepa_staff',channels={'push':bool(push_configured()),'sms':bool(sms_configured())})

@bp.post('/api/v1/communications/previews')
@authenticated
@idempotent
def preview():
    sender();d=request.get_json() or {};title=d.get('title','');message=d.get('message','');channels=d.get('channels',['in_app']);ids=d.get('device_ids')
    if not isinstance(title,str) or not 1<=len(title.strip())<=120 or not isinstance(message,str) or not 10<=len(message.strip())<=2000:raise DomainError('validation_error','Enter a title and a service message of 10–2,000 characters.')
    if not isinstance(channels,list) or any(x not in ('in_app','push','sms') for x in channels):raise DomainError('validation_error','Choose supported notification channels.')
    channels=sorted(set(channels)|{'in_app'})
    if 'push' in channels and not push_configured() or 'sms' in channels and not sms_configured():raise DomainError('channel_unavailable','A selected notification channel is not configured.',503)
    if not isinstance(ids,list) or not 1<=len(ids)<=50:raise DomainError('validation_error','Select 1–50 devices.')
    ids=sorted(set(uuid_string(i) for i in ids))
    with transaction() as c:
        query(c,"SELECT pg_advisory_xact_lock(hashtextextended(:scope,0))",scope='service-preview:'+g.actor['id'])
        if scalar(c,"SELECT count(*) FROM service_notice_previews WHERE actor_id=:uid AND created_at>now()-interval '1 minute'",uid=g.actor['id'])>=10:raise DomainError('rate_limited','Wait before preparing more service notices.',429)
        org=organization(c,d.get('organization_id'));recipients=audience(c,ids,org)
        if not recipients:raise DomainError('audience_empty','No current eligible accounts are in this selection. Utility notices require customer opt-in.',409)
        row=one(c,'INSERT INTO service_notice_previews(actor_id,organization_id,title,message,channels,device_ids,recipient_ids) VALUES(:uid,:org,:title,:message,CAST(:channels AS jsonb),CAST(:ids AS uuid[]),CAST(:recipients AS uuid[])) RETURNING id,expires_at',uid=g.actor['id'],org=org,title=title.strip(),message=message.strip(),channels=json_text(channels),ids=ids,recipients=recipients)
        counts=summary(c,recipients,channels);audit(c,g.actor['id'],'service_notice_previewed',row['id'],{'recipient_count':len(recipients)})
    return jsonify(**dict(row),title=title.strip(),message=message.strip(),channels=channels,**counts),201

@bp.post('/api/v1/communications/send')
@authenticated
@idempotent
def send():
    sender();d=request.get_json() or {}
    with transaction() as c:
        p=one(c,'SELECT * FROM service_notice_previews WHERE id=:id AND actor_id=:uid FOR UPDATE',id=uuid_string(d.get('preview_id')),uid=g.actor['id'])
        if not p:raise DomainError('not_found','Notice preview not found.',404)
        prior=one(c,'SELECT id,recipient_count FROM service_notice_dispatches WHERE preview_id=:id',id=p['id'])
        if prior:return jsonify(id=prior['id'],recipient_count=prior['recipient_count'],status='in_app_committed')
        if 'push' in p['channels'] and not push_configured() or 'sms' in p['channels'] and not sms_configured():raise DomainError('channel_unavailable','A selected channel is unavailable. Prepare another preview or restore its configuration.',503)
        if p['expires_at']<=datetime.now(timezone.utc):raise DomainError('preview_expired','Prepare a fresh audience preview.',409)
        org=organization(c,str(p['organization_id']) if p['organization_id'] else None)
        recipients=audience(c,[str(i) for i in p['device_ids']],org)
        if recipients!=sorted(str(i) for i in p['recipient_ids']):raise DomainError('audience_changed','The current audience changed. Prepare a fresh preview.',409)
        query(c,"SELECT pg_advisory_xact_lock(hashtextextended(:scope,0))",scope='service-notices:'+g.actor['id'])
        if one(c,"SELECT id FROM service_notice_dispatches WHERE actor_id=:uid AND created_at>now()-interval '1 minute'",uid=g.actor['id']):raise DomainError('rate_limited','Wait a minute before sending another service notice.',429)
        row=one(c,'INSERT INTO service_notice_dispatches(preview_id,actor_id,recipient_count) VALUES(:pid,:uid,:count) RETURNING id',pid=p['id'],uid=g.actor['id'],count=len(recipients))
        for uid in recipients:notify(c,uid,'utility.notice' if org else 'service.notice',p['title']+'\n'+p['message'],'notice:'+str(row['id'])+':'+uid,channels=p['channels'])
        counts=summary(c,recipients,p['channels']);audit(c,g.actor['id'],'service_notice_committed',row['id'],{'recipient_count':len(recipients)})
    return jsonify(id=row['id'],recipient_count=len(recipients),status='in_app_committed',**counts),201

@bp.post('/api/v1/ops/organizations/<organization_id>/notice-grant')
@authenticated
@idempotent
def grant(organization_id):
    staff('internal_superadmin');d=request.get_json() or {};note=d.get('review_note','');days=d.get('valid_days',30)
    if type(d.get('enabled')) is not bool or type(days) is not int or not 1<=days<=365 or not isinstance(note,str) or not 10<=len(note.strip())<=2000:raise DomainError('validation_error','Record the reviewed authority, enabled state and 1–365 valid days.')
    with transaction() as c:
        org=one(c,'SELECT id FROM organizations WHERE id=:id',id=uuid_string(organization_id))
        if not org:raise DomainError('not_found','Organization not found.',404)
        old=one(c,'SELECT version FROM organization_notice_grants WHERE organization_id=:id FOR UPDATE',id=org['id'])
        if old and d.get('expected_version')!=old['version']:raise DomainError('version_conflict','Refresh the current grant before changing it.',409)
        row=one(c,'INSERT INTO organization_notice_grants(organization_id,enabled,expires_at,reviewed_by,review_note) VALUES(:id,:enabled,:expires,:uid,:note) ON CONFLICT(organization_id) DO UPDATE SET enabled=excluded.enabled,expires_at=excluded.expires_at,reviewed_by=excluded.reviewed_by,review_note=excluded.review_note,version=organization_notice_grants.version+1,updated_at=now() RETURNING organization_id,enabled,expires_at,version',id=org['id'],enabled=d['enabled'],expires=datetime.now(timezone.utc)+timedelta(days=days),uid=g.actor['id'],note=note.strip())
        audit(c,g.actor['id'],'organization_notice_grant_reviewed',org['id'],{'enabled':d['enabled'],'version':row['version']})
    return jsonify(dict(row)),201
