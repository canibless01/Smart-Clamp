"""Real local QA data for dashboard screenshots. Never deploy this runner.

Uses the same isolated PostgreSQL/GoTrue guard as the integration suite. Device
observations are signed simulations; payment/SMS upstreams are local fixtures.
The private fixture output contains credentials and must remain outside the repo.
"""
import argparse,json,pathlib,sys,uuid,tempfile,base64
from datetime import datetime,timezone,timedelta
from zoneinfo import ZoneInfo
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

root=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'apps/api/tests'))
from test_api import LiveIntegration
from app.db import transaction,query,one

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--fixture',type=pathlib.Path,required=True)
    parser.add_argument('--port',type=int,default=5000)
    args=parser.parse_args()
    if args.fixture.resolve().is_relative_to(root):
        raise RuntimeError('Private fixture must be outside the repository')
    LiveIntegration.setUpClass();t=LiveIntegration();t.setUp()
    private_files=[]
    for name,setting in [('firmware','OTA_SIGNING_KEY_FILE'),('reports','REPORT_SIGNING_KEY_FILE')]:
        key=rsa.generate_private_key(public_exponent=65537,key_size=3072)
        file=tempfile.NamedTemporaryFile(prefix='smartclamp-gallery-'+name+'-',suffix='.pem',delete=False)
        file.write(key.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption()));file.close()
        private_files.append(pathlib.Path(file.name));t.app.config[setting]=file.name
    t.app.config['OTA_ENABLED']='true'
    users={role:t.user(role) for role in ('homeowner','landlord','tenant')}
    for name,role in [('ops','internal_ops'),('engineer','internal_engineering'),('installer','installer'),('utility','nepa_staff'),('admin','internal_superadmin'),('support','internal_support')]:
        users[name]=t.promote(t.user('homeowner'),role)
    def post(path,body,user):
        r=t.client.post('/api/v1'+path,json=body,headers=t.headers(user))
        if r.status_code not in (200,201,202):raise RuntimeError(f'{path}: {r.status_code} {r.json}')
        return r.json
    owner=users['homeowner'];landlord=users['landlord'];tenant=users['tenant'];ops=users['ops']
    home=t.provision(owner,'pole_device')
    with t.app.app_context(),transaction() as c:
        query(c,"UPDATE profiles SET subscription_tier='pro' WHERE id=:id",id=owner['id'])
        query(c,"UPDATE feature_flags SET enabled_globally=true WHERE key='pro_relay_control'")
    building=post('/buildings',{'name':'Cedar House · isolated QA','address':'QA address — no real property','meter_type':'with_meter'},landlord)['building_id']
    meter=post('/meters/link',{'meter_number':'004444444444','service_id':'test-electricity'},landlord)
    central_tariff='qa-gallery-'+uuid.uuid4().hex
    with t.app.app_context(),transaction() as c:query(c,'INSERT INTO tariffs(provider,version,effective_from,day_rate_kobo_per_kwh) VALUES(:provider,:version,now(),10000)',provider='test-electricity',version=central_tariff)
    post('/ops/buildings/'+building+'/payment-destination',{'linked_meter_id':meter['id'],'tariff_version':central_tariff},ops)
    room=post(f'/buildings/{building}/rooms',{'label':'Cedar room'},landlord)['room_id']
    shared=t.provision(landlord)
    with t.app.app_context(),transaction() as c:query(c,'UPDATE devices SET owner_id=NULL WHERE id=:id',id=shared['id'])
    code=post('/ops/devices/'+shared['id']+'/claim-code',{},ops)['claim_code']
    post('/devices/claim',{'claim_code':code,'room_id':room},landlord)
    invitation=post('/rooms/'+room+'/invitations',{},landlord)['invite_link']
    post('/invitations/accept',{'token':invitation.split('token=')[1]},tenant)
    with t.app.app_context(),transaction() as c:
        shared['wallet']=dict(one(c,'SELECT * FROM wallets WHERE device_id=:id',id=shared['id']))
        query(c,'UPDATE devices SET ota_qualified=true WHERE id=:id',id=shared['id'])
    # Tenant observations below are made after occupancy starts; no backdating of access.
    for _ in range(3):
        payment=t.payment(owner,home);t.assertEqual(t.signed_webhook(payment).status_code,200);t.drain();t.attest(owner,payment)
    room_payment=t.payment(tenant,shared);t.assertEqual(t.signed_webhook(room_payment).status_code,200);t.drain();t.attest(tenant,room_payment)
    now=int(datetime.now(timezone.utc).timestamp()*1000)
    for d,profile,periods in [(home,'pole_device',48),(shared,'house_full',2)]:
        counter=0
        for i in range(periods+1):
            watts=[180,240,430,610,320,150][i%6]
            interval=1800000 if d is home else 1
            if i:counter+=watts*1000*interval//3600000
            # Home history spans a day; shared samples follow current occupancy.
            at=now-(periods-i)*interval
            r=t.client.post('/api/v1/device/events',json=t.envelope(d,role=profile,occurred_at_ms=at,metrics={'voltage_mv':230000,'current_ma':watts*1000//230,'real_power_mw':watts*1000,'import_mwh':counter,'export_mwh':0}))
            t.assertEqual(r.status_code,200,r.json);t.drain()
    for kind in ('supply_lost','supply_returned'):
        t.assertEqual(t.client.post('/api/v1/device/events',json=t.envelope(home,kind,role='pole_device')).status_code,200);t.drain()
    job=post('/ops/jobs',{'device_id':home['id'],'kind':'inspection'},ops)
    detail=t.client.get('/api/v1/jobs/'+job['id'],headers=t.headers(ops)).json
    post('/jobs/'+job['id']+'/actions',{'action':'assign','expected_version':detail['job']['version'],'assignee_id':users['installer']['id'],'note':'Review signed simulated connection diagnostics.'},ops)
    # Job transition uses the real versioned work API, also covered by browser tests.
    ticket=post('/support/tickets',{'category':'device','subject':'Review the recorded connection interruption','message':'Isolated QA support record; no actual hardware incident.','device_id':home['id']},owner)
    post('/support/tickets/'+ticket['id']+'/messages',{'message':'Please review the signed simulated observation timestamps.'},owner)
    post('/orders',{'profile':'pole_device','service_address':'Isolated QA installation address','contact_phone':owner['phone'],'notes':'QA request only; not a fulfilled order.'},owner)
    today=datetime.now(ZoneInfo('Africa/Lagos')).date();start=today-timedelta(days=2)
    report=post('/reports',{'device_id':home['id'],'period_start':str(start),'period_end':str(today)},owner)
    # Manual external-bill test input: not a claim that bill issuance is implemented.
    with t.app.app_context(),transaction() as c:
        bill=one(c,"INSERT INTO bills(subject_type,subject_id,period_start,period_end,tariff_version,amount_kobo) VALUES('device',:device,:start,:end,:tariff,10000) RETURNING id",device=home['id'],start=start,end=today,tariff=home['wallet']['tariff_version'])
    dispute=post('/disputes',{'bill_id':str(bill['id']),'note':'QA evidence comparison request; sample bill supplied by the QA runner.'},owner)
    post('/disputes/'+dispute['id']+'/messages',{'message':'Please compare the stored bill snapshot with the recorded measurement coverage.'},owner)
    binary=root/'firmware/.pio/build/house_full/firmware.bin'
    if not binary.is_file():raise RuntimeError('Build the real house_full firmware before capturing the update flow')
    artifact=post('/ops/firmware/artifacts',{'profile':'house_full','board':'esp32dev','version':'qa-gallery-'+uuid.uuid4().hex[:8],'secure_version':int(datetime.now(timezone.utc).timestamp()),'image_base64':base64.b64encode(binary.read_bytes()).decode()},users['engineer'])
    post('/ops/firmware/rollouts',{'artifact_id':artifact['id'],'device_ids':[shared['id']]},users['engineer'])
    with t.app.app_context(),transaction() as c:
        org=one(c,'INSERT INTO organizations(name,subdomain) VALUES(:name,:sub) RETURNING id',name='Isolated QA utility',sub='qa-gallery-'+uuid.uuid4().hex[:10])
        query(c,"INSERT INTO memberships(user_id,role,organization_id) VALUES(:uid,'nepa_staff',:org)",uid=users['utility']['id'],org=org['id'])
        query(c,'INSERT INTO utility_device_scopes(organization_id,device_id,granted_by) VALUES(:org,:did,:uid)',org=org['id'],did=home['id'],uid=ops['id'])
    post('/ops/organizations/'+str(org['id'])+'/notice-grant',{'enabled':True,'valid_days':30,'review_note':'Isolated QA reviewed messaging authority; no real utility agreement.'},users['admin'])
    pref=t.client.patch('/api/v1/users/me/preferences',json={'utility_notices_enabled':True},headers=t.headers(owner));t.assertEqual(pref.status_code,200,pref.json)
    for sender,title in [(ops,'QA service connection review'),(users['utility'],'QA utility service notice')]:
        preview=post('/communications/previews',{'organization_id':str(org['id']),'device_ids':[home['id']],'title':title,'message':'Review the recorded connection observations. This is an isolated QA notice.','channels':['in_app']},sender)
        post('/communications/send',{'preview_id':preview['id']},sender)
    from app.providers import auth_request
    with t.app.app_context():
        pending={'email':'gallery-profile-'+uuid.uuid4().hex+'@example.test','password':'QA-profile-password-42'}
        auth_request('signup','POST',pending)
    users['onboarding']=pending
    args.fixture.touch(mode=0o600);args.fixture.write_text(json.dumps({'users':users,'home_device_id':home['id'],'building_id':building,'job_id':job['id'],'ticket_id':ticket['id'],'dispute_id':dispute['id'],'report_share_path':report['share_path'],'utility_organization_id':str(org['id']),'payment':{'payment_id':str(payment['id']),'status_token':payment['status_token']},'payment_quote_id':str(payment['quote_id'])}));args.fixture.chmod(0o600)
    print('Isolated gallery QA API ready',flush=True)
    try:t.app.run(host='127.0.0.1',port=args.port,use_reloader=False)
    finally:
        for file in private_files:file.unlink(missing_ok=True)

if __name__=='__main__':main()
