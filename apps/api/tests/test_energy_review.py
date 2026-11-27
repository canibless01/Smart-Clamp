"""Scoped drift-to-support loop; no theft verdict, charges or unclaimed inspection."""
from datetime import datetime,timezone
from test_api import LiveIntegration
from test_energy_schedule import fixture as schedule_fixture,stop as stop_schedule
from app.db import transaction,query,one
from app.energy_schedule import process_due
class EnergyReviewIntegration(LiveIntegration):pass
for name in dir(LiveIntegration):
 if name.startswith('test_'):setattr(EnergyReviewIntegration,name,None)
del LiveIntegration

def generate(self,fixture):
 owner,admin,devices,bid,path,first,span=fixture
 with self.app.app_context():
  for _ in range(3):self.assertEqual(process_due(1,datetime.fromtimestamp((first+3*span+1000)/1000,timezone.utc)),1)
 self.assertEqual(stop_schedule(self,owner,path).status_code,200)
 rows=self.client.get('/api/v1/energy-reviews?building_id='+bid,headers=self.headers(owner));self.assertEqual(rows.status_code,200,rows.json);self.assertEqual(len(rows.json['items']),1)
 return rows.json['items'][0]

def test_owner_review_claimed_inspection_and_resolution_loop(self):
 fixture=schedule_fixture(self);owner,admin,devices,bid,path,first,span=fixture;case=generate(self,fixture);other=self.user('landlord');support=self.promote(self.user(),'internal_support');colleague=self.promote(self.user(),'internal_support')
 endpoint='/api/v1/energy-reviews/'+str(case['id'])+'/actions';body={'action':'request_investigation','version':case['version'],'message':'Please investigate the qualified difference; no theft conclusion.'}
 self.assertEqual(self.client.post(endpoint,headers=self.headers(other),json=body).status_code,404)
 headers=self.headers(owner);created=self.client.post(endpoint,headers=headers,json=body);self.assertEqual(created.status_code,200,created.json);self.assertEqual(self.client.post(endpoint,headers=headers,json=body).json,created.json);ticket=str(created.json['ticket_id']);ticket_path='/api/v1/support/tickets/'+ticket
 self.assertIsNone(self.client.get(ticket_path,headers=self.headers(support)).json['energy_review'])
 self.assertEqual(self.client.post(ticket_path+'/energy-inspection',headers=self.headers(support),json={}).status_code,403)
 detail=self.client.get(ticket_path,headers=self.headers(support)).json
 claimed=self.client.post(ticket_path+'/workflow',headers=self.headers(support),json={'action':'claim','version':detail['version'],'note':'Claiming the energy difference review for investigation.'});self.assertEqual(claimed.status_code,200,claimed.json)
 evidence=self.client.get(ticket_path,headers=self.headers(support)).json['energy_review'];self.assertEqual(evidence['snapshot_sha256'],case['snapshot_sha256']);self.assertNotIn('sources',evidence)
 self.assertEqual(self.client.post(ticket_path+'/energy-inspection',headers=self.headers(colleague),json={}).status_code,403)
 job=self.client.post(ticket_path+'/energy-inspection',headers=self.headers(support),json={});self.assertEqual(job.status_code,201,job.json)
 self.assertEqual(self.client.post(ticket_path+'/energy-inspection',headers=self.headers(support),json={}).json['id'],job.json['id'])
 current=self.client.get(ticket_path,headers=self.headers(support)).json
 resolved=self.client.post(ticket_path+'/workflow',headers=self.headers(support),json={'action':'resolve','version':current['version'],'note':'Reviewed the comparison evidence; no theft determination made.'});self.assertEqual(resolved.status_code,200,resolved.json)
 cases=self.client.get('/api/v1/energy-reviews?building_id='+bid,headers=self.headers(owner)).json['items'];self.assertEqual(cases[0]['status'],'resolved')
 reopened=self.client.post(ticket_path+'/workflow',headers=self.headers(owner),json={'action':'reopen','version':resolved.json['version'],'note':'Further investigation requested; the field findings are pending.'});self.assertEqual(reopened.status_code,200,reopened.json)
 self.assertEqual(self.client.get('/api/v1/energy-reviews?building_id='+bid,headers=self.headers(owner)).json['items'][0]['status'],'open')
 successor=self.user('landlord')
 with self.app.app_context(),transaction() as c:query(c,'UPDATE buildings SET landlord_id=:uid WHERE id=:id',uid=successor['id'],id=bid)
 self.assertIsNone(self.client.get(ticket_path,headers=self.headers(owner)).json['energy_review'])
 self.assertEqual(self.client.post(ticket_path+'/energy-inspection',headers=self.headers(support),json={}).status_code,409)
 changed=self.client.get('/api/v1/energy-reviews?building_id='+bid,headers=self.headers(successor)).json['items'][0];self.assertTrue(changed['prior_support_authority_changed']);self.assertIsNone(changed['ticket_id']);self.assertFalse(changed['has_support_request'])
 renewed=self.client.post(endpoint,headers=self.headers(successor),json={**body,'version':changed['version']});self.assertEqual(renewed.status_code,200,renewed.json);self.assertNotEqual(renewed.json['ticket_id'],ticket)
 self.assertEqual(self.client.get('/api/v1/support/tickets/'+renewed.json['ticket_id'],headers=self.headers(owner)).status_code,404)
 with self.app.app_context(),transaction() as c:
  self.assertEqual(one(c,'SELECT count(*) AS n FROM notifications WHERE recipient_id=:uid AND template_key=\'energy.review\'',uid=owner['id'])['n'],1)
  self.assertIsNone(one(c,'SELECT relay_observed FROM devices WHERE id=:id',id=devices[0]['id'])['relay_observed'])
  self.assertEqual(one(c,'SELECT count(*) AS n FROM ledger_transactions WHERE wallet_id IN(:a,:b)',a=devices[0]['wallet']['id'],b=devices[1]['wallet']['id'])['n'],0)
EnergyReviewIntegration.test_owner_review_claimed_inspection_and_resolution_loop=test_owner_review_claimed_inspection_and_resolution_loop

def test_utility_needs_every_source_in_one_current_org_and_revocation_hides_case(self):
 fixture=schedule_fixture(self);owner,admin,devices,bid,path,first,span=fixture;utility=self.promote(self.user(),'nepa_staff');partial=self.promote(self.user(),'nepa_staff');complete=self.promote(self.user(),'nepa_staff')
 with self.app.app_context(),transaction() as c:
  import uuid
  orgs=[one(c,'INSERT INTO organizations(name,subdomain) VALUES(:name,:sub) RETURNING id',name='QA energy scope',sub='qa-energy-'+uuid.uuid4().hex[:12])['id'] for _ in range(4)]
  for user,org in [(utility,orgs[0]),(utility,orgs[1]),(partial,orgs[2]),(complete,orgs[3])]:query(c,"INSERT INTO memberships(user_id,role,organization_id) VALUES(:uid,'nepa_staff',:org)",uid=user['id'],org=org)
  for org,d in [(orgs[0],devices[0]),(orgs[1],devices[1]),(orgs[2],devices[0]),(orgs[3],devices[0]),(orgs[3],devices[1])]:query(c,'INSERT INTO utility_device_scopes(organization_id,device_id,granted_by) VALUES(:org,:id,:uid)',org=org,id=d['id'],uid=admin['id'])
 case=generate(self,fixture)
 with self.app.app_context(),transaction() as c:
  for user,expected in [(complete,1),(utility,0),(partial,0)]:self.assertEqual(one(c,"SELECT count(*) AS n FROM notifications WHERE recipient_id=:uid AND template_key='energy.review'",uid=user['id'])['n'],expected)
 for user in (utility,partial):self.assertNotIn(str(case['id']),[str(row['id']) for row in self.client.get('/api/v1/energy-reviews',headers=self.headers(user)).json['items']])
 with self.app.app_context(),transaction() as c:query(c,'INSERT INTO utility_device_scopes(organization_id,device_id,granted_by) VALUES(:org,:id,:uid)',org=orgs[0],id=devices[1]['id'],uid=admin['id'])
 visible=self.client.get('/api/v1/energy-reviews',headers=self.headers(utility)).json['items'];row=next(item for item in visible if str(item['id'])==str(case['id']));self.assertFalse(row['can_manage']);self.assertIsNone(row['building_id']);self.assertIsNone(row['ticket_id'])
 self.assertEqual(self.client.post('/api/v1/energy-reviews/'+str(case['id'])+'/actions',headers=self.headers(utility),json={'action':'acknowledge','version':row['version']}).status_code,404)
 with self.app.app_context(),transaction() as c:
  query(c,'UPDATE utility_device_scopes SET revoked_at=now() WHERE organization_id=:org AND device_id=:id',org=orgs[0],id=devices[1]['id'])
  for role in ('anon','authenticated'):self.assertFalse(one(c,"SELECT has_table_privilege(:role,'public.energy_review_cases','SELECT') AS allowed",role=role)['allowed'])
 self.assertNotIn(str(case['id']),[str(item['id']) for item in self.client.get('/api/v1/energy-reviews',headers=self.headers(utility)).json['items']])
EnergyReviewIntegration.test_utility_needs_every_source_in_one_current_org_and_revocation_hides_case=test_utility_needs_every_source_in_one_current_org_and_revocation_hides_case
