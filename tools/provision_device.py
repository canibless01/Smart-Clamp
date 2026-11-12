"""Register a uniquely keyed factory device and write a private provisioning bundle.
This does not commission hardware or replace qualification tests. Never log the bundle.
"""
import argparse,base64,json,os,pathlib,secrets,sys,uuid
from cryptography.fernet import Fernet
root=pathlib.Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'apps/api'))
from app import create_app
from app.db import transaction,query,one,audit
parser=argparse.ArgumentParser();parser.add_argument('--profile',required=True,choices=['transformer','pole_gateway','pole_device','house_full','building_hub','ir_reader']);parser.add_argument('--operator-id',required=True);parser.add_argument('--api-origin',required=True);parser.add_argument('--output',type=pathlib.Path,required=True);parser.add_argument('--relay-fitted',action='store_true');a=parser.parse_args()
if not a.api_origin.startswith('https://'):parser.error('Use the qualified HTTPS API origin')
if a.output.exists():parser.error('Output already exists; refusing to overwrite device credentials')
if a.relay_fitted and a.profile not in('pole_gateway','pole_device','house_full'):parser.error('This profile cannot have a relay')
try:operator=str(uuid.UUID(a.operator_id));fernet=Fernet(os.environ['DEVICE_HMAC_ENCRYPTION_KEY'].encode())
except (KeyError,ValueError):parser.error('A valid operator ID and DEVICE_HMAC_ENCRYPTION_KEY are required')
did=str(uuid.uuid4());keys={d:secrets.token_bytes(32) for d in('telemetry','command')};caps=['metering'] if a.profile!='building_hub' else ['gateway']
if a.relay_fitted or a.profile=='house_full':caps.append('relay')
app=create_app()
# Private file is reserved before database insertion; a partial failure leaves an identifiable file, never silently reuses keys.
a.output.parent.mkdir(parents=True,exist_ok=True);fd=os.open(a.output,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
try:
    with app.app_context(),transaction() as c:
        user=one(c,"SELECT id FROM profiles WHERE id=:id AND role IN('internal_ops','internal_engineering','internal_superadmin')",id=operator)
        if not user:raise RuntimeError('Factory registration requires an approved staff profile')
        query(c,'INSERT INTO devices(id,profile,capabilities) VALUES(:id,:profile,:caps)',id=did,profile=a.profile,caps=caps)
        for direction,key in keys.items():query(c,'INSERT INTO private.device_credentials(device_id,key_epoch,direction,encrypted_secret) VALUES(:id,1,:direction,:key)',id=did,direction=direction,key=fernet.encrypt(key).decode())
        audit(c,operator,'factory_device_registered',did,{'profile':a.profile})
    with os.fdopen(fd,'w') as file:json.dump({'device_id':did,'profile':a.profile,'board':'esp32dev','api_origin':a.api_origin.rstrip('/'),'protocol_version':1,'key_epoch':1,'config_epoch':1,'telemetry_key_hex':keys['telemetry'].hex(),'command_key_hex':keys['command'].hex(),'commissioned':False,'calibration_status':'uncalibrated'},file,indent=2)
except Exception:
    try:os.close(fd)
    except OSError:pass
    raise
print('Factory device registered:',did,'; private bundle saved. Hardware remains uncommissioned.')
