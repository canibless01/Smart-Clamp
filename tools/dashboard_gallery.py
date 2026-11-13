"""Real local QA data for dashboard screenshots. Never deploy this runner.

Uses the same isolated PostgreSQL/GoTrue guard as the integration suite. Device
observations are signed simulations; payment/SMS upstreams are local fixtures.
The private fixture output contains credentials and must remain outside the repo.
"""
import argparse,json,pathlib,sys,uuid
from datetime import datetime,timezone

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
    users={role:t.user(role) for role in ('homeowner','landlord','tenant')}
    for name,role in [('ops','internal_ops'),('engineer','internal_engineering'),('installer','installer'),('utility','nepa_staff')]:
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
    room=post(f'/buildings/{building}/rooms',{'label':'Cedar room'},landlord)['room_id']
    shared=t.provision(landlord)
    with t.app.app_context(),transaction() as c:query(c,'UPDATE devices SET owner_id=NULL WHERE id=:id',id=shared['id'])
    code=post('/ops/devices/'+shared['id']+'/claim-code',{},ops)['claim_code']
    post('/devices/claim',{'claim_code':code,'room_id':room},landlord)
    invitation=post('/rooms/'+room+'/invitations',{},landlord)['invite_link']
    post('/invitations/accept',{'token':invitation.split('token=')[1]},tenant)
    # Tenant observations below are made after occupancy starts; no backdating of access.
    payment=t.payment(owner,home);t.assertEqual(t.signed_webhook(payment).status_code,200);t.drain();t.attest(owner,payment)
    now=int(datetime.now(timezone.utc).timestamp()*1000)
    for d,profile,periods in [(home,'pole_device',24),(shared,'house_full',2)]:
        counter=0
        for i in range(periods+1):
            watts=[180,240,430,610,320,150][i%6]
            interval=1200000 if d is home else 1
            if i:counter+=watts*1000*interval//3600000
            # Home history spans eight hours; shared samples follow occupancy.
            at=now-(periods-i)*interval
            r=t.client.post('/api/v1/device/events',json=t.envelope(d,role=profile,occurred_at_ms=at,metrics={'voltage_mv':230000,'current_ma':watts*1000//230,'real_power_mw':watts*1000,'import_mwh':counter,'export_mwh':0}))
            t.assertEqual(r.status_code,200,r.json);t.drain()
    for kind in ('supply_lost','supply_returned'):
        t.assertEqual(t.client.post('/api/v1/device/events',json=t.envelope(home,kind,role='pole_device')).status_code,200);t.drain()
    job=post('/ops/jobs',{'device_id':home['id'],'kind':'inspection'},ops)
    detail=t.client.get('/api/v1/jobs/'+job['id'],headers=t.headers(ops)).json
    post('/jobs/'+job['id']+'/actions',{'action':'assign','expected_version':detail['job']['version'],'assignee_id':users['installer']['id'],'note':'Review signed simulated connection diagnostics.'},ops)
    # Job transition uses the real versioned work API, also covered by browser tests.
    post('/support/tickets',{'category':'device','subject':'Review the recorded connection interruption','message':'Isolated QA support record; no actual hardware incident.','device_id':home['id']},owner)
    with t.app.app_context(),transaction() as c:
        org=one(c,'INSERT INTO organizations(name,subdomain) VALUES(:name,:sub) RETURNING id',name='Isolated QA utility',sub='qa-gallery-'+uuid.uuid4().hex[:10])
        query(c,"INSERT INTO memberships(user_id,role,organization_id) VALUES(:uid,'nepa_staff',:org)",uid=users['utility']['id'],org=org['id'])
        query(c,'INSERT INTO utility_device_scopes(organization_id,device_id,granted_by) VALUES(:org,:did,:uid)',org=org['id'],did=home['id'],uid=ops['id'])
    args.fixture.touch(mode=0o600);args.fixture.write_text(json.dumps({'users':users,'home_device_id':home['id'],'building_id':building,'job_id':job['id']}));args.fixture.chmod(0o600)
    print('Isolated gallery QA API ready',flush=True)
    t.app.run(host='127.0.0.1',port=args.port,use_reloader=False)

if __name__=='__main__':main()
