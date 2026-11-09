from flask import Blueprint, request, jsonify
from .. import api_error
from ..protocol import verify, canonical
import uuid, hashlib, time, json, base64

bp = Blueprint('ingest', __name__)

# Simulated device credential store — in production, encrypted vault
# For demo, we derive key from device_id for sandbox testing
def derive_key(device_id):
    # Deterministic test key for sandbox; real provision uses per-device random
    return hashlib.sha256(f"dev-secret-{device_id}".encode()).digest()

@bp.route('/api/v1/device/events', methods=['POST'])
def device_events():
    envelope = request.get_json(force=True)
    if not envelope or not all(k in envelope for k in ('device_id','key_epoch','payload_b64','signature')):
        return api_error('validation_error','Invalid envelope',400)
    device_id = envelope['device_id']
    key_epoch = envelope['key_epoch']
    key = derive_key(device_id)
    try:
        payload = verify(envelope, key)
    except Exception as e:
        return api_error('unauthorized', f'Invalid signature: {e}',401)
    # Validate kind binding
    kind = payload.get('kind')
    if kind not in ('telemetry','heartbeat','supply_lost','supply_returned','protection','tamper','config'):
        return api_error('validation_error','Unsupported kind',400)
    # Unique constraint: device_id, boot_id, seq
    boot_id = payload.get('boot_id')
    seq = payload.get('seq')
    if not boot_id or not seq:
        return api_error('validation_error','boot_id and seq required',400)
    # Check device existence
    from flask import current_app
    # Create device entry if not exists (provisioned)
    if device_id not in current_app.stores['devices']:
        current_app.stores['devices'][device_id]={'device_id':device_id,'role':payload.get('role','pole_device'),'has_relay':False}
    dedup_key = (device_id, payload.get('key_epoch'), boot_id, seq)
    payload_hash = hashlib.sha256(canonical(payload)).hexdigest()
    ack = {'device_id':device_id,'key_epoch':key_epoch,'boot_id':boot_id,'seq':seq,'payload_sha256':payload_hash,'committed':True}
    if dedup_key in current_app.stores.get('inbox',{}):
        existing = current_app.stores['inbox'][dedup_key]
        if existing['hash'] != payload_hash:
            return api_error('conflict','Conflicting same-seq with different hash',409)
        return jsonify(ack),200
    # Store
    if 'inbox' not in current_app.stores:
        current_app.stores['inbox']={}
    current_app.stores['inbox'][dedup_key]={'hash':payload_hash,'payload':payload,'received_at':time.time()}
    # Enqueue outbox for worker (idempotent processing)
    if 'outbox' not in current_app.stores:
        current_app.stores['outbox']=[]
    current_app.stores['outbox'].append({'event_id':str(uuid.uuid4()),'kind':'reading_committed','payload':payload,'dedup_key':dedup_key})
    return jsonify(ack),200

@bp.route('/api/v1/device/poll', methods=['POST'])
def device_poll():
    envelope = request.get_json(force=True)
    if not envelope: return api_error('validation_error','Envelope required',400)
    device_id = envelope.get('device_id')
    key = derive_key(device_id)
    try:
        payload = verify(envelope, key)
    except Exception as e:
        return api_error('unauthorized',f'Invalid signature: {e}',401)
    if payload.get('kind')!='poll':
        return api_error('validation_error','kind must be poll',400)
    from flask import current_app
    # Return pending commands and acks
    commands = []
    acks = []
    # Find commands for this device
    for cid, cmd in current_app.stores.get('commands',{}).items():
        if cmd.get('device_id')==device_id and cmd.get('status')=='pending_delivery':
            # Sign command envelope
            from ..protocol import sign
            cmd_payload = {'kind':'relay_command','device_id':device_id,'key_epoch':1,'config_epoch':1,'command_id':cid,'seq':cmd.get('seq',1),'issued_at_s':int(time.time()),'expires_at_s':int(time.time())+120,'on':cmd.get('state')=='on','policy_epoch':1,'reason':'maintenance','authorization_ref':'ops'}
            # Use device key for command direction (demo reuses same)
            envelope_cmd = sign(cmd_payload, key)
            commands.append(envelope_cmd)
    # Durable acks
    for dedup, inbox in current_app.stores.get('inbox',{}).items():
        if dedup[0]==device_id:
            acks.append({'device_id':device_id,'key_epoch':1,'boot_id':dedup[2],'seq':dedup[3],'payload_sha256':inbox['hash'],'committed':True})
    # signed_time
    from ..protocol import sign as sign2
    time_payload = {'kind':'time','device_id':device_id,'key_epoch':1,'boot_id':'0'*32,'seq':1,'issued_at_ms':int(time.time()*1000)}
    # Simplify: mock signed_time envelope
    signed_time = {'device_id':device_id,'key_epoch':1,'payload_b64':base64.urlsafe_b64encode(json.dumps(time_payload).encode()).decode().rstrip('='),'signature':'0'*64}
    return jsonify({'commands':commands[:16],'acks':acks[:64],'signed_time':signed_time})

@bp.route('/api/v1/device/receipts', methods=['POST'])
def device_receipts():
    envelope = request.get_json(force=True)
    if not envelope: return api_error('validation_error','Envelope required',400)
    device_id = envelope.get('device_id')
    key = derive_key(device_id)
    try:
        payload = verify(envelope, key)
    except Exception as e:
        return api_error('unauthorized',f'Invalid signature: {e}',401)
    if payload.get('kind')!='command_receipt':
        return api_error('validation_error','kind must be command_receipt',400)
    command_id = payload.get('command_id')
    from flask import current_app
    # Update command status
    cmd = current_app.stores.get('commands',{}).get(command_id)
    if cmd:
        result = payload.get('result')
        cmd['status']=result
        cmd['observed_on']=payload.get('observed_on')
    boot_id = payload.get('boot_id','0'*32)
    seq = payload.get('seq',1)
    payload_hash = hashlib.sha256(canonical(payload)).hexdigest()
    ack = {'device_id':device_id,'key_epoch':payload.get('key_epoch',1),'boot_id':boot_id,'seq':seq,'payload_sha256':payload_hash,'committed':True}
    return jsonify(ack),200
