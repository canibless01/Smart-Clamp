"""Start the real local API with test-only fixtures. Never deploy this runner.
Requires an isolated qa_services.py config in SMARTCLAMP_QA_CONFIG.
"""
import argparse,sys,pathlib,json,tempfile,uuid
from datetime import datetime,timezone,timedelta
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa,ec
from cryptography.fernet import Fernet
root=pathlib.Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'apps/api/tests'))
from test_api import LiveIntegration
from app.db import transaction,query,one
from app.providers import auth_request
parser=argparse.ArgumentParser();parser.add_argument('--fixture',type=pathlib.Path,required=True);parser.add_argument('--port',type=int,default=5000);parser.add_argument('--onesignal',action='store_true');a=parser.parse_args()
LiveIntegration.setUpClass();t=LiveIntegration();t.setUp()
owner=t.user('landlord');tenant=t.user();ops=t.promote(t.user('homeowner'),'internal_ops');d=t.provision(owner)
installer=t.promote(t.user('homeowner'),'installer');engineer=t.promote(t.user('homeowner'),'internal_engineering')
# Separate landlord fixture for recording a comparison group; no physical topology certified.
topology_owner=t.user('landlord');topology_devices=[t.provision(topology_owner) for _ in range(2)]
with t.app.app_context(),transaction() as c:
    topology_building=one(c,"INSERT INTO buildings(landlord_id,name,address,meter_type) VALUES(:uid,'Isolated QA topology','QA','with_meter') RETURNING id",uid=topology_owner['id'])['id']
    for source in topology_devices:query(c,'UPDATE devices SET building_id=:bid WHERE id=:id',bid=topology_building,id=source['id'])

support_reviewer=t.promote(t.user('homeowner'),'internal_support');finance_reviewer=t.promote(t.user('homeowner'),'internal_finance')
message_recipient=t.user('homeowner');message_device=t.provision(message_recipient)
# QA-only issued bill, not a production bill-issuance adapter.
with t.app.app_context(),transaction() as c:
    dispute_bill=one(c,"INSERT INTO bills(subject_type,subject_id,period_start,period_end,tariff_version,amount_kobo,status) VALUES('device',:device,current_date-30,current_date,:tariff,12500,'unpaid') RETURNING id",device=message_device['id'],tariff=message_device['wallet']['tariff_version'])['id']
cohort_ops=t.promote(t.user('homeowner'),'internal_ops');service_region='QA Browser '+uuid.uuid4().hex[:12]
area=t.client.post('/api/v1/ops/service-areas',json={'name':'Browser QA service area '+uuid.uuid4().hex[:8],'region':service_region},headers=t.headers(ops))
if area.status_code!=201:raise RuntimeError('Could not create isolated browser service area')
assigned=t.client.post('/api/v1/ops/devices/'+message_device['id']+'/service-area',json={'area_id':area.json['id']},headers=t.headers(ops))
if assigned.status_code!=201:raise RuntimeError('Could not assign isolated browser service area')
utility=t.promote(t.user('homeowner'),'nepa_staff');admin=t.promote(t.user('homeowner'),'internal_superadmin')
with t.app.app_context(),transaction() as c:
    utility_org=one(c,'INSERT INTO organizations(name,subdomain) VALUES(:name,:sub) RETURNING id',name='Browser QA utility',sub='qa-browser-'+uuid.uuid4().hex[:12])['id']
    query(c,"INSERT INTO memberships(user_id,role,organization_id) VALUES(:uid,'nepa_staff',:org)",uid=utility['id'],org=utility_org)
    query(c,'INSERT INTO utility_device_scopes(organization_id,device_id,granted_by) VALUES(:org,:did,:uid)',org=utility_org,did=message_device['id'],uid=admin['id'])
grant=t.client.post('/api/v1/ops/organizations/'+str(utility_org)+'/notice-grant',json={'enabled':True,'valid_days':30,'review_note':'Isolated browser QA reviewed authority, no real utility agreement.'},headers=t.headers(admin))
if grant.status_code!=201:raise RuntimeError('Could not create isolated reviewed notice grant')
job=t.client.post('/api/v1/ops/jobs',json={'device_id':d['id'],'kind':'repair'},headers=t.headers(ops))
if job.status_code!=201:raise RuntimeError('Could not create isolated work-order fixture')
private=rsa.generate_private_key(public_exponent=65537,key_size=3072)
keyfile=tempfile.NamedTemporaryFile(prefix='smartclamp-browser-signer-',suffix='.pem',delete=False)
keyfile.write(private.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption()));keyfile.close()
report_key=rsa.generate_private_key(public_exponent=65537,key_size=3072)
reportfile=tempfile.NamedTemporaryFile(prefix='smartclamp-browser-report-',suffix='.pem',delete=False)
reportfile.write(report_key.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption()));reportfile.close()
t.app.config.update(OTA_ENABLED='true',OTA_SIGNING_KEY_FILE=keyfile.name,REPORT_SIGNING_KEY_FILE=reportfile.name)
push_key=ec.generate_private_key(ec.SECP256R1())
pushfile=tempfile.NamedTemporaryFile(prefix='smartclamp-browser-vapid-',suffix='.pem',delete=False)
pushfile.write(push_key.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption()));pushfile.close()
t.app.config.update(WEB_PUSH_ENABLED='true',VAPID_PRIVATE_KEY_FILE=pushfile.name,VAPID_SUBJECT='mailto:qa@example.test',PUSH_ENCRYPTION_KEY=Fernet.generate_key().decode())
t.app.config.update(EMAIL_ENABLED='true',EMAIL_FROM='SmartClamp QA <notices@example.test>',EMAIL_ENCRYPTION_KEY=Fernet.generate_key().decode(),RESEND_API_KEY='local-email-fixture',RESEND_API_URL=t.settings['PAYSTACK_API_URL']+'/emails')
if a.onesignal:t.app.config.update(ONESIGNAL_PUSH_ENABLED='true',ONESIGNAL_APP_ID=str(uuid.uuid4()),ONESIGNAL_REST_API_KEY='local-onesignal-fixture',ONESIGNAL_API_URL=t.settings['PAYSTACK_API_URL']+'/onesignal')
with t.app.app_context(),transaction() as c:query(c,'UPDATE devices SET ota_qualified=true WHERE id=:id',id=d['id'])
with t.app.app_context(),transaction() as c:query(c,'UPDATE devices SET owner_id=NULL WHERE id=:id',id=d['id'])
response=t.client.post('/api/v1/ops/devices/'+d['id']+'/claim-code',json={},headers=t.headers(ops))
if response.status_code!=201:raise RuntimeError('Could not create isolated browser fixture')
past=int((datetime.now(timezone.utc)-timedelta(days=1)).timestamp()*1000)
for counter,at in [(0,past),(1000000,past+60000),(1000000,int(datetime.now(timezone.utc).timestamp()*1000))]:
    if t.client.post('/api/v1/device/events',json=t.envelope(d,occurred_at_ms=at,metrics={'voltage_mv':230000,'real_power_mw':1000000,'import_mwh':counter})).status_code!=200:raise RuntimeError('QA telemetry failed')
    t.drain()
t.drain()
pending_email=None
email_recipient=None
email_device=None
with t.app.app_context():
    if (auth_request('settings').get('external') or {}).get('email'):
        import uuid
        pending_email={'email':'browser-external-'+uuid.uuid4().hex+'@example.test','password':'QA-external-password-42'}
        auth_request('signup','POST',pending_email)
        from app.live_auth import legal_versions
        email_recipient={'email':'browser-notices-'+uuid.uuid4().hex+'@example.test','password':'QA-email-notice-password-42'}
        response_email=t.client.post('/api/v1/auth/signup',json={**email_recipient,'full_name':'Browser email recipient','role':'homeowner','accepted_terms':True,**legal_versions()})
        if response_email.status_code!=200:raise RuntimeError('Could not create isolated email notice account')
        email_recipient.update(id=response_email.json['user_id'],token=response_email.json['access_token'])
        email_device=t.provision(email_recipient)
gateway=t.provision(ops,'pole_gateway');session=uuid.uuid4().hex;report_at=int(datetime.now(timezone.utc).timestamp()*1000)
for age,rx,tx in [(60000,1000000,200000),(1000,2500000,700000)]:
    transport_response=t.client.post('/api/v1/device/events',json=t.envelope(gateway,kind='heartbeat',occurred_at_ms=report_at-age,transport={'counter_session':session,'rx_bytes':rx,'tx_bytes':tx,'signal_dbm':-75,'network_type':'4g'}))
    if transport_response.status_code!=200:raise RuntimeError('Could not create signed QA modem report')
signal=t.client.post('/api/v1/device/events',json=t.envelope(message_device,kind='tamper'))
if signal.status_code!=200:raise RuntimeError('Could not create signed QA signal')
a.fixture.parent.mkdir(parents=True,exist_ok=True);a.fixture.touch(mode=0o600);a.fixture.write_text(json.dumps({'topology_owner':topology_owner,'topology_building_id':str(topology_building),'topology_incoming_id':topology_devices[0]['id'],'topology_branch_id':topology_devices[1]['id'],'support_reviewer':support_reviewer,'finance_reviewer':finance_reviewer,'dispute_bill_id':str(dispute_bill),'onesignal':bool(a.onesignal),'owner':owner,'tenant':tenant,'device_id':d['id'],'claim_code':response.json['claim_code'],'ops':ops,'installer':installer,'engineer':engineer,'pending_email':pending_email,'email_recipient':email_recipient,'email_device_id':email_device['id'] if email_device else None,'utility':utility,'admin':admin,'message_recipient':message_recipient,'message_device_id':message_device['id'],'cohort_ops':cohort_ops,'service_region':service_region,'service_area_id':area.json['id'],'utility_organization_id':str(utility_org),'job_id':job.json['id'],'firmware_bin':str(root/'firmware/.pio/build/house_full/firmware.bin')}));a.fixture.chmod(0o600)
print('Isolated browser QA API ready',flush=True)
try:t.app.run(host='127.0.0.1',port=a.port,use_reloader=False)
finally:
    pathlib.Path(keyfile.name).unlink(missing_ok=True);pathlib.Path(reportfile.name).unlink(missing_ok=True);pathlib.Path(pushfile.name).unlink(missing_ok=True)
