"""Private signed firmware delivery, explicit cohorts and authenticated boot outcomes."""
import base64,hashlib,math,re,uuid
from pathlib import Path
from datetime import datetime,timezone
from flask import Blueprint,current_app,request,jsonify,g
from cryptography.hazmat.primitives import serialization,hashes
from cryptography.hazmat.primitives.asymmetric import rsa,padding
from .db import transaction,query,one,rows,scalar,audit,json_text,uuid_string,DomainError
from .live_auth import authenticated,staff
from .idempotency import idempotent
from .protocol import canonical,sign
from .live_devices import verified,inbox,credential
bp=Blueprint('firmware',__name__)
ROLES=('transformer','pole_gateway','pole_device','house_full','building_hub','ir_reader')


def enabled():
    if current_app.config.get('OTA_ENABLED')!='true':raise DomainError('ota_disabled','Firmware rollout is not enabled.',503)


def signing_key():
    path=current_app.config.get('OTA_SIGNING_KEY_FILE')
    if not path:raise DomainError('ota_key_required','Configure a private firmware signing key before uploading.',503)
    try:
        key=serialization.load_pem_private_key(Path(path).read_bytes(),password=None)
        if not isinstance(key,rsa.RSAPrivateKey) or key.key_size<3072:raise ValueError()
    except (OSError,ValueError,TypeError):raise DomainError('ota_key_invalid','The firmware signing key is unavailable or invalid.',503)
    public=key.public_key().public_bytes(serialization.Encoding.DER,serialization.PublicFormat.SubjectPublicKeyInfo)
    return key,hashlib.sha256(public).hexdigest()


@bp.get('/api/v1/ops/firmware')
@authenticated
def overview():
    staff('internal_engineering','internal_ops','internal_superadmin')
    with transaction() as c:
        artifacts=rows(c,'SELECT id,profile,board,version,secure_version,sha256,size_bytes,key_id,created_at FROM firmware_artifacts ORDER BY created_at DESC LIMIT 100')
        rollouts=rows(c,'SELECT * FROM firmware_rollouts ORDER BY created_at DESC LIMIT 100')
        targets=rows(c,"SELECT t.*,a.version AS firmware_version FROM firmware_targets t JOIN firmware_rollouts r ON r.id=t.rollout_id JOIN firmware_artifacts a ON a.id=r.artifact_id ORDER BY r.created_at DESC,t.ordinal LIMIT 1000")
        audit(c,g.actor['id'],'firmware_overview_viewed')
    return jsonify(artifacts=artifacts,rollouts=rollouts,targets=targets,enabled=current_app.config.get('OTA_ENABLED')=='true')


@bp.post('/api/v1/ops/firmware/artifacts')
@authenticated
@idempotent
def upload():
    staff('internal_engineering','internal_superadmin');enabled();d=request.get_json() or {}
    profile=d.get('profile');board=d.get('board');version=d.get('version');secure=d.get('secure_version')
    if profile not in ROLES or board!='esp32dev' or not isinstance(version,str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]{0,39}',version) or type(secure) is not int or secure<1:
        raise DomainError('invalid_firmware_metadata','Select a supported profile, esp32dev board, version and positive secure version.')
    try:
        encoded=d.get('image_base64')
        if not isinstance(encoded,str) or len(encoded)>2796204:raise ValueError()
        image=base64.b64decode(encoded,validate=True)
        if not 1024<=len(image)<=2097152 or image[0]!=0xE9:raise ValueError()
    except (ValueError,TypeError):raise DomainError('invalid_firmware_image','Upload a 1 KiB–2 MiB ESP32 application binary. A valid header is not hardware qualification.')
    key,key_id=signing_key();artifact=str(uuid.uuid4());digest=hashlib.sha256(image).hexdigest()
    manifest={'artifact_id':artifact,'board':board,'kind':'firmware_manifest','profile':profile,
              'secure_version':secure,'sha256':digest,'size_bytes':len(image),'version':version,'key_id':key_id}
    signature=base64.b64encode(key.sign(canonical(manifest),padding.PKCS1v15(),hashes.SHA256())).decode()
    with transaction() as c:
        query(c,"""INSERT INTO firmware_artifacts(id,profile,board,version,secure_version,image,sha256,size_bytes,manifest,signature,key_id,created_by)
            VALUES(:id,:profile,:board,:version,:secure,:image,:hash,:size,CAST(:manifest AS jsonb),:signature,:key,:uid)""",
            id=artifact,profile=profile,board=board,version=version,secure=secure,image=image,hash=digest,size=len(image),manifest=json_text(manifest),signature=signature,key=key_id,uid=g.actor['id'])
        audit(c,g.actor['id'],'firmware_uploaded',artifact,{'sha256':digest,'size_bytes':len(image)})
    return jsonify(id=artifact,manifest=manifest,signature=signature),201


@bp.post('/api/v1/ops/firmware/rollouts')
@authenticated
@idempotent
def create_rollout():
    staff('internal_engineering','internal_superadmin');enabled();d=request.get_json() or {};ids=d.get('device_ids')
    if not isinstance(ids,list) or not 1<=len(ids)<=1000:raise DomainError('invalid_cohort','Select between one and 1,000 explicit devices.')
    ids=[uuid_string(v) for v in ids]
    if len(set(ids))!=len(ids):raise DomainError('invalid_cohort','Each selected device must be unique.')
    with transaction() as c:
        a=one(c,'SELECT * FROM firmware_artifacts WHERE id=:id',id=uuid_string(d.get('artifact_id')))
        if not a:raise DomainError('not_found','Firmware artifact not found.',404)
        devices=rows(c,'SELECT * FROM devices WHERE id=ANY(CAST(:ids AS uuid[])) ORDER BY id FOR UPDATE',ids=ids)
        if len(devices)!=len(ids):raise DomainError('invalid_cohort','One or more selected devices do not exist.',404)
        for dev in devices:
            if dev['profile']!=a['profile'] or dev['board']!=a['board'] or not dev['ota_qualified']:
                raise DomainError('ota_device_unqualified','Every target needs matching board/profile and qualified OTA partitions, signature verification and rollback.',422)
            if dev['firmware_secure_version']>=a['secure_version']:raise DomainError('firmware_downgrade','Firmware secure version must increase for every target.',409)
        # Keep infrastructure waves isolated. Multi-gateway cohorts require a separate
        # topology-aware scheduler rather than simultaneously taking a feeder offline.
        if a['profile'] in ('pole_gateway','building_hub') and len(ids)>1:
            raise DomainError('gateway_canary_required','Update one infrastructure gateway per rollout; verify dependents before the next.',422)
        r=one(c,'INSERT INTO firmware_rollouts(artifact_id,created_by) VALUES(:a,:uid) RETURNING *',a=a['id'],uid=g.actor['id'])
        for ordinal,did in enumerate(ids):
            query(c,"INSERT INTO firmware_targets(rollout_id,device_id,ordinal,wave,status) VALUES(:r,:d,:ordinal,:wave,:status)",r=r['id'],d=did,ordinal=ordinal,wave=0 if ordinal==0 else None,status='pending' if ordinal==0 else 'waiting')
        audit(c,g.actor['id'],'firmware_rollout_created',r['id'],{'target_count':len(ids),'canary':ids[0]})
    return jsonify(dict(r)),201


@bp.post('/api/v1/ops/firmware/rollouts/<rollout_id>/actions')
@authenticated
@idempotent
def rollout_action(rollout_id):
    staff('internal_engineering','internal_superadmin');d=request.get_json() or {};action=d.get('action')
    if action not in ('pause','resume','advance','cancel'):raise DomainError('invalid_rollout_action','Choose pause, resume, advance or cancel.')
    with transaction() as c:
        r=one(c,'SELECT * FROM firmware_rollouts WHERE id=:id FOR UPDATE',id=uuid_string(rollout_id))
        if not r:raise DomainError('not_found','Rollout not found.',404)
        if type(d.get('expected_version')) is not int or d['expected_version']!=r['version']:raise DomainError('version_conflict','Refresh the rollout before changing it.',409)
        if r['status'] in ('completed','cancelled'):raise DomainError('rollout_closed','This rollout is already closed.',409)
        state=r['status'];wave=r['wave']
        if action=='cancel':
            state='cancelled';query(c,"UPDATE firmware_targets SET status='cancelled',updated_at=now() WHERE rollout_id=:id AND status IN ('waiting','pending','offered')",id=r['id'])
        elif action=='pause':state='paused'
        else:
            enabled()
            if action=='resume':state='active'
            else:
                if state!='active':raise DomainError('rollout_paused','Resume the rollout before advancing.',409)
                current=rows(c,'SELECT status FROM firmware_targets WHERE rollout_id=:id AND wave=:wave',id=r['id'],wave=wave)
                if not current or any(t['status']!='boot_confirmed' for t in current):raise DomainError('canary_not_healthy','All devices in the current wave must report a healthy new boot before advancing.',409)
                waiting=rows(c,"SELECT id FROM firmware_targets WHERE rollout_id=:id AND status='waiting' ORDER BY ordinal FOR UPDATE",id=r['id'])
                if not waiting:state='completed'
                else:
                    wave=min(3,wave+1);total=scalar(c,'SELECT count(*) FROM firmware_targets WHERE rollout_id=:id',id=r['id'])
                    count=math.ceil(total*(.05 if wave==1 else .25)) if wave<3 else len(waiting)
                    query(c,"UPDATE firmware_targets SET wave=:wave,status='pending',updated_at=now() WHERE id=ANY(CAST(:ids AS uuid[]))",wave=wave,ids=[t['id'] for t in waiting[:count]])
        result=one(c,'UPDATE firmware_rollouts SET status=:status,wave=:wave,version=version+1 WHERE id=:id RETURNING *',status=state,wave=wave,id=r['id'])
        audit(c,g.actor['id'],'firmware_rollout_'+action,r['id'],{'wave':wave})
    return jsonify(dict(result))


def offer(c,device,poll_payload):
    if current_app.config.get('OTA_ENABLED')!='true' or not device['ota_qualified']:return None
    t=one(c,"""SELECT t.id,t.offered_boot_id,a.manifest,a.signature,a.key_id FROM firmware_targets t
        JOIN firmware_rollouts r ON r.id=t.rollout_id JOIN firmware_artifacts a ON a.id=r.artifact_id
        WHERE t.device_id=:id AND r.status='active' AND t.status IN ('pending','offered')
        AND a.profile=:profile AND a.board=:board AND a.secure_version>:secure FOR UPDATE OF t""",
        id=device['id'],profile=device['profile'],board=device['board'],secure=device['firmware_secure_version'])
    if not t:return None
    query(c,"UPDATE firmware_targets SET status='offered',offered_at=coalesce(offered_at,now()),offered_boot_id=coalesce(offered_boot_id,:boot),updated_at=now() WHERE id=:id",id=t['id'],boot=poll_payload['boot_id'])
    payload={'kind':'firmware_offer','device_id':str(device['id']),'key_epoch':device['key_epoch'],
             'config_epoch':device['config_epoch'],'target_id':str(t['id']),'manifest':t['manifest'],
             'manifest_signature':t['signature'],'request_boot_id':poll_payload['boot_id'],
             'request_seq':poll_payload['seq'],'expires_at_s':int(datetime.now(timezone.utc).timestamp())+120}
    return sign(payload,credential(c,device['id'],device['key_epoch'],'command'))


@bp.post('/api/v1/device/firmware/download')
def download():
    enabled()
    with transaction() as c:
        dev,p=verified(c,request.get_json() or {})
        if p.get('kind')!='firmware_download':raise DomainError('invalid_device_event','A signed firmware download is required.')
        inbox(c,dev,p)
        a=one(c,"""SELECT a.image,a.sha256 FROM firmware_targets t JOIN firmware_rollouts r ON r.id=t.rollout_id
            JOIN firmware_artifacts a ON a.id=r.artifact_id WHERE t.id=:target AND t.device_id=:did
            AND t.status='offered' AND r.status='active' AND a.profile=:profile AND a.board=:board
            AND a.secure_version>:secure""",target=uuid_string(p.get('target_id')),did=dev['id'],profile=dev['profile'],board=dev['board'],secure=dev['firmware_secure_version'])
        if not a or not dev['ota_qualified']:raise DomainError('firmware_unavailable','This firmware offer is no longer available.',409)
    return current_app.response_class(bytes(a['image']),mimetype='application/octet-stream',headers={'X-Firmware-SHA256':a['sha256']})


@bp.post('/api/v1/device/firmware/receipts')
def firmware_receipt():
    # Receipts remain available while rollout is paused/disabled so failures/recovery are visible.
    with transaction() as c:
        dev,p=verified(c,request.get_json() or {})
        if p.get('kind')!='firmware_receipt' or p.get('result') not in ('staged','boot_confirmed','failed','rolled_back'):
            raise DomainError('invalid_receipt','A signed firmware result is required.')
        iid,ack,duplicate=inbox(c,dev,p)
        if duplicate:return jsonify(ack)
        scope=one(c,'SELECT rollout_id FROM firmware_targets WHERE id=:target AND device_id=:did',target=uuid_string(p.get('target_id')),did=dev['id'])
        if not scope:raise DomainError('not_found','Firmware target not found.',404)
        # Rollout actions lock rollout then targets; use the same order here.
        query(c,'SELECT id FROM firmware_rollouts WHERE id=:id FOR UPDATE',id=scope['rollout_id'])
        t=one(c,"""SELECT t.*,a.sha256,a.version AS firmware_version,a.secure_version
            FROM firmware_targets t JOIN firmware_rollouts r ON r.id=t.rollout_id
            JOIN firmware_artifacts a ON a.id=r.artifact_id WHERE t.id=:target AND t.device_id=:did FOR UPDATE OF t""",target=uuid_string(p.get('target_id')),did=dev['id'])
        if not t:raise DomainError('not_found','Firmware target not found.',404)
        result=p['result'];reason=p.get('reason_code')
        if not isinstance(reason,str) or not re.fullmatch(r'[a-z0-9_]{1,80}',reason):raise DomainError('invalid_receipt','A bounded firmware reason code is required.')
        prior=one(c,'SELECT result FROM firmware_receipts WHERE target_id=:id AND result=:result',id=t['id'],result=result)
        if prior:return jsonify(ack)
        allowed={'offered':{'staged','failed'},'staged':{'boot_confirmed','failed','rolled_back'}}
        if result not in allowed.get(t['status'],set()):raise DomainError('firmware_state_conflict','This firmware outcome does not match its delivery state.',409)
        if result in ('staged','boot_confirmed') and (p.get('sha256')!=t['sha256'] or p.get('secure_version')!=t['secure_version']):raise DomainError('firmware_hash_mismatch','The device must verify the exact signed image and secure version.',409)
        if result=='boot_confirmed':
            if p['boot_id']==t['offered_boot_id'] or p.get('health_ok') is not True:raise DomainError('firmware_boot_unconfirmed','A new boot and successful local health checks are required.',409)
            query(c,'UPDATE devices SET firmware_version=:version,firmware_sha256=:hash,firmware_secure_version=:secure WHERE id=:id',id=dev['id'],version=t['firmware_version'],hash=t['sha256'],secure=t['secure_version'])
        query(c,'UPDATE firmware_targets SET status=:status,updated_at=now() WHERE id=:id',id=t['id'],status=result)
        query(c,'INSERT INTO firmware_receipts(target_id,inbox_id,result,reason_code,boot_id) VALUES(:target,:inbox,:result,:reason,:boot)',target=t['id'],inbox=iid,result=result,reason=reason,boot=p['boot_id'])
        if result in ('failed','rolled_back'):query(c,"UPDATE firmware_rollouts SET status='paused',version=version+1 WHERE id=:id AND status='active'",id=t['rollout_id'])
        audit(c,None,'firmware_'+result,t['id'])
    return jsonify(ack)
