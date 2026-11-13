"""Immutable signed measurement snapshots and exports; no inferred legal certification."""
import base64,csv,hashlib,io,json,secrets,uuid
from pathlib import Path
from datetime import datetime,timezone,timedelta
from zoneinfo import ZoneInfo
from flask import Blueprint,current_app,g,request,jsonify
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import serialization,hashes
from cryptography.hazmat.primitives.asymmetric import rsa,padding
from .db import transaction,one,rows,query,device,audit,json_text,uuid_string,DomainError
from .live_auth import authenticated
from .idempotency import idempotent
from .protocol import canonical
bp=Blueprint('reports',__name__)

@bp.get('/api/v1/reports')
@authenticated
def report_list():
    with transaction() as c:
        result=rows(c,'SELECT id,device_id,period_start,period_end,issued_at,expires_at,revoked_at FROM reports WHERE created_by=:uid ORDER BY issued_at DESC LIMIT 100',uid=g.actor['id'])
    return jsonify(items=result)


def signer():
    try:
        key=serialization.load_pem_private_key(Path(current_app.config.get('REPORT_SIGNING_KEY_FILE','')).read_bytes(),password=None)
        if not isinstance(key,rsa.RSAPrivateKey) or key.key_size<3072:raise ValueError()
    except (OSError,ValueError,TypeError):raise DomainError('report_signing_unavailable','A private RSA report-signing key of at least 3072 bits must be configured.',503)
    public=key.public_key().public_bytes(serialization.Encoding.PEM,serialization.PublicFormat.SubjectPublicKeyInfo).decode()
    key_id=hashlib.sha256(key.public_key().public_bytes(serialization.Encoding.DER,serialization.PublicFormat.SubjectPublicKeyInfo)).hexdigest()
    return key,public,key_id


def period(d):
    try:
        start=datetime.strptime(d['period_start'],'%Y-%m-%d').replace(tzinfo=ZoneInfo('Africa/Lagos')).astimezone(timezone.utc)
        end=datetime.strptime(d['period_end'],'%Y-%m-%d').replace(tzinfo=ZoneInfo('Africa/Lagos')).astimezone(timezone.utc)
        if not timedelta(0)<end-start<=timedelta(days=31) or end>datetime.now(timezone.utc):raise ValueError()
    except (KeyError,ValueError,TypeError):raise DomainError('invalid_report_period','Choose a completed period of up to 31 days. Dates use Africa/Lagos; the end date is exclusive.')
    return start,end


def owned_report(c,report_id):
    r=one(c,'SELECT * FROM reports WHERE id=:id AND created_by=:uid',id=uuid_string(report_id),uid=g.actor['id'])
    if not r:raise DomainError('not_found','Report not found.',404)
    return r


def view(r):
    raw=bytes(r['canonical_bytes'])
    try:
        if hashlib.sha256(raw).hexdigest()!=r['sha256']:raise ValueError()
        public=serialization.load_pem_public_key(r['public_key_pem'].encode())
        if hashlib.sha256(public.public_bytes(serialization.Encoding.DER,serialization.PublicFormat.SubjectPublicKeyInfo)).hexdigest()!=r['key_id']:raise ValueError()
        public.verify(base64.b64decode(r['signature'],validate=True),raw,padding.PKCS1v15(),hashes.SHA256())
        snapshot=json.loads(raw)
    except (ValueError,TypeError,AttributeError,InvalidSignature):raise DomainError('report_integrity_failure','The stored report could not be verified. Contact support with its reference.',503)
    return dict(id=str(r['id']),snapshot=snapshot,sha256=r['sha256'],signature=r['signature'],key_id=r['key_id'],public_key_pem=r['public_key_pem'],
                canonical_base64=base64.b64encode(raw).decode(),signature_valid=True,issued_at=r['issued_at'],expires_at=r['expires_at'],revoked=r['revoked_at'] is not None,
                qualification='Signature verifies the issued bytes. It does not certify electrical accuracy, theft, liability or a utility-approved refund.')


@bp.post('/api/v1/reports')
@authenticated
@idempotent
def issue():
    d=request.get_json() or {};start,end=period(d);key,public,key_id=signer();token=secrets.token_urlsafe(32);rid=str(uuid.uuid4());issued=datetime.now(timezone.utc)
    with transaction() as c:
        dev=device(c,g.actor,d.get('device_id'),write=True)
        if g.actor['role']=='tenant':
            occupancy=one(c,'SELECT start_at FROM occupancies WHERE room_id=:room AND tenant_id=:uid AND end_at IS NULL',room=dev['room_id'],uid=g.actor['id'])
            if not occupancy or start<occupancy['start_at']:raise DomainError('report_occupancy_scope','Reports cannot include another resident’s occupancy.',403)
        start_ms=int(start.timestamp()*1000);end_ms=int(end.timestamp()*1000)
        readings=rows(c,"""SELECT r.id,r.occurred_at_ms,r.quality,r.clock_quality,r.voltage_mv,r.current_ma,r.real_power_mw,r.import_mwh,r.export_mwh,
            i.payload_sha256,u.interval_start_ms,u.accounting_quality,u.consumed_mwh,ch.chain_hash
            FROM readings r JOIN device_inbox i ON i.id=r.inbox_id LEFT JOIN usage_postings u ON u.reading_id=r.id
            LEFT JOIN usage_event_chain ch ON ch.reading_id=r.id WHERE r.device_id=:id AND r.occurred_at_ms>=:start AND r.occurred_at_ms<:end
            ORDER BY r.occurred_at_ms,r.id LIMIT 10001""",id=dev['id'],start=start_ms,end=end_ms)
        if len(readings)>10000:raise DomainError('report_period_too_large','This period has more than 10,000 observations. Choose a shorter period.',422)
        eligible=[r for r in readings if r['accounting_quality']=='measured' and r['interval_start_ms'] is not None and start_ms<=r['interval_start_ms']<r['occurred_at_ms']]
        covered=sum(r['occurred_at_ms']-r['interval_start_ms'] for r in eligible)
        coverage={'counter_interval_ms':min(covered,end_ms-start_ms),'requested_period_ms':end_ms-start_ms,'eligible_intervals':len(eligible),'observation_count':len(readings)}
        snapshot={'schema_version':1,'report_id':rid,'issued_at':issued.isoformat(),'device_id':str(dev['id']),'period_start':start.isoformat(),'period_end':end.isoformat(),
                  'display_timezone':'Africa/Lagos','coverage':coverage,'measured_consumption_mwh':sum(r['consumed_mwh'] for r in eligible),
                  'consumption_status':'measured_intervals_only' if eligible else 'unavailable','readings':readings,
                  'limitations':['Missing intervals remain unknown.','Counter-interval coverage is not waveform accuracy or supply availability.','No theft determination, liability allocation or approved utility credit is issued.']}
        raw=canonical(json.loads(json_text(snapshot)));digest=hashlib.sha256(raw).hexdigest();signature=base64.b64encode(key.sign(raw,padding.PKCS1v15(),hashes.SHA256())).decode()
        r=one(c,"""INSERT INTO reports(id,device_id,subject_type,subject_id,canonical_bytes,sha256,signature,key_id,public_key_pem,public_token_hash,public_token_hint,coverage,expires_at,created_by,period_start,period_end,issued_at)
            VALUES(:id,:device,'device',:device,:raw,:hash,:signature,:key,:public,:token,:hint,CAST(:coverage AS jsonb),now()+interval '7 days',:uid,:start,:end,:issued) RETURNING id,expires_at""",
            id=rid,device=dev['id'],raw=raw,hash=digest,signature=signature,key=key_id,public=public,token=hashlib.sha256(token.encode()).hexdigest(),hint=token[-4:],coverage=json_text(coverage),uid=g.actor['id'],start=start,end=end,issued=issued)
        audit(c,g.actor['id'],'report_issued',rid,{'sha256':digest,'observation_count':len(readings)})
    return jsonify(id=rid,expires_at=r['expires_at'],share_path='/verification-reports/'+token,sha256=digest),201


@bp.get('/api/v1/reports/<report_id>')
@authenticated
def private_report(report_id):
    with transaction() as c:
        r=owned_report(c,report_id);audit(c,g.actor['id'],'report_viewed',r['id']);result=view(r)
    return jsonify(result)


@bp.get('/api/v1/public/reports/<token>')
def public_report(token):
    if not 32<=len(token)<=128:raise DomainError('not_found','Report not found or no longer shared.',404)
    with transaction() as c:
        r=one(c,'SELECT * FROM reports WHERE public_token_hash=:hash AND revoked_at IS NULL AND expires_at>now()',hash=hashlib.sha256(token.encode()).hexdigest())
        if not r:raise DomainError('not_found','Report not found or no longer shared.',404)
        audit(c,None,'shared_report_viewed',r['id']);result=view(r)
    return jsonify(result)


@bp.post('/api/v1/reports/<report_id>/revoke')
@authenticated
@idempotent
def revoke(report_id):
    with transaction() as c:
        r=owned_report(c,report_id);query(c,'UPDATE reports SET revoked_at=coalesce(revoked_at,now()) WHERE id=:id',id=r['id']);audit(c,g.actor['id'],'report_sharing_revoked',r['id'])
    return jsonify(id=report_id,shared=False)


@bp.post('/api/v1/reports/<report_id>/exports')
@authenticated
@idempotent
def export(report_id):
    with transaction() as c:
        r=owned_report(c,report_id);snapshot=view(r)['snapshot'];out=io.StringIO(newline='');writer=csv.writer(out,lineterminator='\r\n')
        columns=['occurred_at_ms','quality','clock_quality','voltage_mv','current_ma','real_power_mw','import_mwh','export_mwh','accounting_quality','consumed_mwh','payload_sha256']
        writer.writerow(columns)
        for row in snapshot['readings']:writer.writerow([row.get(k) for k in columns])
        content=out.getvalue().encode('utf-8');digest=hashlib.sha256(content).hexdigest()
        result=one(c,"""INSERT INTO exports(scope_id,format,period_start,period_end,status,requester_id,result_path)
            VALUES(:report,'csv',:start,:end,'ready',:uid,:path) RETURNING id""",report=r['id'],start=snapshot['period_start'],end=snapshot['period_end'],uid=g.actor['id'],path='report:'+str(r['id']))
        query(c,"INSERT INTO export_files(export_id,content,sha256,content_type) VALUES(:id,:content,:hash,'text/csv')",id=result['id'],content=content,hash=digest)
        audit(c,g.actor['id'],'report_exported',r['id'],{'export_id':str(result['id']),'sha256':digest})
    return jsonify(id=result['id'],sha256=digest,download_path='/exports/'+str(result['id'])),201


@bp.get('/api/v1/exports/<export_id>')
@authenticated
def download_export(export_id):
    with transaction() as c:
        r=one(c,"SELECT f.* FROM export_files f JOIN exports e ON e.id=f.export_id WHERE e.id=:id AND e.requester_id=:uid AND e.status='ready'",id=uuid_string(export_id),uid=g.actor['id'])
        if not r:raise DomainError('not_found','Export not found.',404)
        content=bytes(r['content'])
        if hashlib.sha256(content).hexdigest()!=r['sha256']:raise DomainError('export_integrity_failure','The stored export could not be verified.',503)
        audit(c,g.actor['id'],'export_downloaded',export_id)
    return current_app.response_class(content,mimetype='text/csv',headers={'Content-Disposition':f'attachment; filename="smartclamp-{export_id}.csv"','X-Content-SHA256':r['sha256']})
