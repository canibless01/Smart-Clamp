"""Executable protocol reference, not a deployed API or secure credential store."""
import base64,hashlib,hmac,json

def _validate(v):
    if type(v) is float: raise ValueError('floats forbidden')
    if isinstance(v,dict):
        if not all(isinstance(k,str) for k in v):raise ValueError('string keys required')
        for x in v.values():_validate(x)
    elif isinstance(v,list):
        for x in v:_validate(x)
    elif v is not None and type(v) not in (str,int,bool):raise ValueError('unsupported JSON value')

def canonical(payload):
    _validate(payload)
    return json.dumps(payload,sort_keys=True,separators=(',',':'),ensure_ascii=True,allow_nan=False).encode()

def sign(payload,key):
    if len(key)!=32:raise ValueError('256-bit direction key required')
    raw=canonical(payload)
    if len(raw)>8192:raise ValueError('payload too large')
    encoded=base64.urlsafe_b64encode(raw).decode().rstrip('=')
    device,epoch=payload['device_id'],payload['key_epoch']
    text=f'SC1\n{device}\n{epoch}\n{encoded}'.encode()
    return dict(device_id=device,key_epoch=epoch,payload_b64=encoded,signature=hmac.new(key,text,hashlib.sha256).hexdigest())

def verify(envelope,key):
    if set(envelope)!={'device_id','key_epoch','payload_b64','signature'}:raise ValueError('envelope fields')
    if len(key)!=32 or type(envelope['key_epoch']) is not int or envelope['key_epoch']<1:raise ValueError('key epoch')
    encoded=envelope['payload_b64']
    if not isinstance(encoded,str) or len(encoded)>10924:raise ValueError('payload too large')
    if any(c not in 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_' for c in encoded):raise ValueError('base64url')
    text=f"SC1\n{envelope['device_id']}\n{envelope['key_epoch']}\n{encoded}".encode()
    expected=hmac.new(key,text,hashlib.sha256).hexdigest()
    if not isinstance(envelope['signature'],str) or not hmac.compare_digest(expected,envelope['signature']):raise ValueError('signature')
    raw=base64.b64decode(encoded+'='*((-len(encoded))%4),altchars=b'-_',validate=True)
    if len(raw)>8192:raise ValueError('payload too large')
    payload=json.loads(raw)
    if canonical(payload)!=raw:raise ValueError('noncanonical or duplicate keys')
    if payload['device_id']!=envelope['device_id'] or payload['key_epoch']!=envelope['key_epoch']:raise ValueError('target mismatch')
    return payload

def command_allowed(payload,*,device_id,key_epoch,config_epoch,policy_epoch,now,last_sequence):
    return (payload.get('kind')=='relay_command' and payload.get('device_id')==device_id
      and payload.get('key_epoch')==key_epoch and payload.get('config_epoch')==config_epoch
      and payload.get('policy_epoch')==policy_epoch and type(payload.get('seq')) is int
      and payload['seq']>last_sequence and type(payload.get('on')) is bool
      and type(payload.get('issued_at_s')) is int and type(payload.get('expires_at_s')) is int
      and payload['issued_at_s']<=now<payload['expires_at_s']<=payload['issued_at_s']+120)
