"""Start the real local API with test-only fixtures. Never deploy this runner.
Requires an isolated qa_services.py config in SMARTCLAMP_QA_CONFIG.
"""
import argparse,sys,pathlib,json
root=pathlib.Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'apps/api/tests'))
from test_api import LiveIntegration
from app.db import transaction,query
parser=argparse.ArgumentParser();parser.add_argument('--fixture',type=pathlib.Path,required=True);parser.add_argument('--port',type=int,default=5000);a=parser.parse_args()
LiveIntegration.setUpClass();t=LiveIntegration();t.setUp()
owner=t.user('landlord');tenant=t.user();ops=t.promote(t.user('homeowner'),'internal_ops');d=t.provision(owner)
with t.app.app_context(),transaction() as c:query(c,'UPDATE devices SET owner_id=NULL WHERE id=:id',id=d['id'])
response=t.client.post('/api/v1/ops/devices/'+d['id']+'/claim-code',json={},headers=t.headers(ops))
if response.status_code!=201:raise RuntimeError('Could not create isolated browser fixture')
if t.client.post('/api/v1/device/events',json=t.envelope(d)).status_code!=200:raise RuntimeError('QA telemetry failed')
t.drain();a.fixture.parent.mkdir(parents=True,exist_ok=True);a.fixture.touch(mode=0o600);a.fixture.write_text(json.dumps({'owner':owner,'tenant':tenant,'device_id':d['id'],'claim_code':response.json['claim_code']}));a.fixture.chmod(0o600)
print('Isolated browser QA API ready',flush=True);t.app.run(host='127.0.0.1',port=a.port,use_reloader=False)
