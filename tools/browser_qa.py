"""Start the real local API with test-only fixtures. Never deploy this runner.
Requires an isolated qa_services.py config in SMARTCLAMP_QA_CONFIG.
"""
import argparse,sys,pathlib,json,tempfile
from datetime import datetime,timezone,timedelta
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
root=pathlib.Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'apps/api/tests'))
from test_api import LiveIntegration
from app.db import transaction,query
parser=argparse.ArgumentParser();parser.add_argument('--fixture',type=pathlib.Path,required=True);parser.add_argument('--port',type=int,default=5000);a=parser.parse_args()
LiveIntegration.setUpClass();t=LiveIntegration();t.setUp()
owner=t.user('landlord');tenant=t.user();ops=t.promote(t.user('homeowner'),'internal_ops');d=t.provision(owner)
installer=t.promote(t.user('homeowner'),'installer');engineer=t.promote(t.user('homeowner'),'internal_engineering')
job=t.client.post('/api/v1/ops/jobs',json={'device_id':d['id'],'kind':'repair'},headers=t.headers(ops))
if job.status_code!=201:raise RuntimeError('Could not create isolated work-order fixture')
private=rsa.generate_private_key(public_exponent=65537,key_size=3072)
keyfile=tempfile.NamedTemporaryFile(prefix='smartclamp-browser-signer-',suffix='.pem',delete=False)
keyfile.write(private.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption()));keyfile.close()
report_key=rsa.generate_private_key(public_exponent=65537,key_size=3072)
reportfile=tempfile.NamedTemporaryFile(prefix='smartclamp-browser-report-',suffix='.pem',delete=False)
reportfile.write(report_key.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption()));reportfile.close()
t.app.config.update(OTA_ENABLED='true',OTA_SIGNING_KEY_FILE=keyfile.name,REPORT_SIGNING_KEY_FILE=reportfile.name)
with t.app.app_context(),transaction() as c:query(c,'UPDATE devices SET ota_qualified=true WHERE id=:id',id=d['id'])
with t.app.app_context(),transaction() as c:query(c,'UPDATE devices SET owner_id=NULL WHERE id=:id',id=d['id'])
response=t.client.post('/api/v1/ops/devices/'+d['id']+'/claim-code',json={},headers=t.headers(ops))
if response.status_code!=201:raise RuntimeError('Could not create isolated browser fixture')
past=int((datetime.now(timezone.utc)-timedelta(days=1)).timestamp()*1000)
for counter,at in [(0,past),(1000000,past+60000),(1000000,int(datetime.now(timezone.utc).timestamp()*1000))]:
    if t.client.post('/api/v1/device/events',json=t.envelope(d,occurred_at_ms=at,metrics={'voltage_mv':230000,'real_power_mw':1000000,'import_mwh':counter})).status_code!=200:raise RuntimeError('QA telemetry failed')
    t.drain()
t.drain();a.fixture.parent.mkdir(parents=True,exist_ok=True);a.fixture.touch(mode=0o600);a.fixture.write_text(json.dumps({'owner':owner,'tenant':tenant,'device_id':d['id'],'claim_code':response.json['claim_code'],'ops':ops,'installer':installer,'engineer':engineer,'job_id':job.json['id'],'firmware_bin':str(root/'firmware/.pio/build/house_full/firmware.bin')}));a.fixture.chmod(0o600)
print('Isolated browser QA API ready',flush=True)
try:t.app.run(host='127.0.0.1',port=a.port,use_reloader=False)
finally:
    pathlib.Path(keyfile.name).unlink(missing_ok=True);pathlib.Path(reportfile.name).unlink(missing_ok=True)
