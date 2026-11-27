"""Real signed signal -> scoped review -> support -> field inspection."""
import uuid
from test_api import LiveIntegration
from app.db import transaction,one,query,rows
class TrustIntegration(LiveIntegration):pass
for name in dir(LiveIntegration):
 if name.startswith('test_'):setattr(TrustIntegration,name,None)
del LiveIntegration

def test_signed_signal_review_inspection_and_authority(self):
 owner=self.user('homeowner');other=self.user('homeowner');support=self.promote(self.user('homeowner'),'internal_support');d=self.provision(owner)
 packet=self.envelope(d,kind='tamper');self.assertEqual(self.client.post('/api/v1/device/events',json=packet).status_code,200)
 base='/api/v1/devices/'+d['id'];feed=self.client.get(base+'/trust',headers=self.headers(owner));self.assertEqual(feed.status_code,200,feed.json);signal=feed.json['items'][0];self.assertEqual(signal['kind'],'tamper');self.assertEqual(len(signal['signed_payload_sha256']),64)
 self.assertEqual(self.client.get(base+'/trust',headers=self.headers(other)).status_code,404)
 path=base+'/signals/'+signal['id']+'/review'
 self.assertEqual(self.client.post(path,headers=self.headers(owner),json={'message':'short'}).status_code,400)
 review=self.client.post(path,headers=self.headers(owner),json={'message':'Please inspect this recorded device signal.'});self.assertEqual(review.status_code,201,review.json);ticket=str(review.json['id'])
 repeated=self.client.post(path,headers=self.headers(owner),json={'message':'Please inspect this recorded device signal.'});self.assertEqual(repeated.status_code,200,repeated.json);self.assertEqual(str(repeated.json['id']),ticket)
 detail='/api/v1/support/tickets/'+ticket
 self.assertEqual(self.client.get(detail,headers=self.headers(other)).status_code,404)
 self.assertEqual(self.client.post(detail+'/inspection',headers=self.headers(owner),json={}).status_code,403)
 self.assertEqual(self.client.post(detail+'/inspection',headers=self.headers(support),json={}).status_code,403)
 row=self.client.get(detail,headers=self.headers(support));self.assertEqual(row.status_code,200,row.json)
 claim=self.client.post(detail+'/workflow',headers=self.headers(support),json={'action':'claim','version':row.json['version'],'note':'Review signed signal and arrange safe inspection.'});self.assertEqual(claim.status_code,200,claim.json)
 inspection=self.client.post(detail+'/inspection',headers=self.headers(support),json={});self.assertEqual(inspection.status_code,201,inspection.json)
 again=self.client.post(detail+'/inspection',headers=self.headers(support),json={});self.assertEqual(again.status_code,200);self.assertEqual(again.json['id'],inspection.json['id'])
 visible=self.client.get(base+'/trust',headers=self.headers(owner));self.assertEqual(visible.json['items'][0]['inspection_status'],'open');self.assertEqual(str(visible.json['items'][0]['job_id']),str(inspection.json['id']))
 with self.app.app_context(),transaction() as c:self.assertEqual(one(c,'SELECT kind FROM jobs WHERE id=:id',id=inspection.json['id'])['kind'],'inspection')
TrustIntegration.test_signed_signal_review_inspection_and_authority=test_signed_signal_review_inspection_and_authority

def test_utility_alert_fanout_is_contract_scoped(self):
 owner=self.user('homeowner');d=self.provision(owner);utility=self.promote(self.user('homeowner'),'nepa_staff');unrelated=self.promote(self.user('homeowner'),'nepa_staff')
 with self.app.app_context(),transaction() as c:
  org=one(c,'INSERT INTO organizations(name,subdomain) VALUES(:name,:sub) RETURNING id',name='Scoped signal QA',sub='signal-'+uuid.uuid4().hex[:12])['id']
  query(c,"INSERT INTO memberships(user_id,role,organization_id) VALUES(:uid,'nepa_staff',:org)",uid=utility['id'],org=org)
  query(c,'INSERT INTO utility_device_scopes(organization_id,device_id,granted_by) VALUES(:org,:did,:uid)',org=org,did=d['id'],uid=owner['id'])
 self.assertEqual(self.client.post('/api/v1/device/events',json=self.envelope(d,kind='tamper')).status_code,200);self.drain()
 for user,count in [(owner,1),(utility,1),(unrelated,0)]:
  notices=self.client.get('/api/v1/alerts',headers=self.headers(user)).json['items'];signals=[n for n in notices if n['template_key']=='tamper'];self.assertEqual(len(signals),count)
  if count:self.assertIn('does not prove theft',signals[0]['payload']['message']);self.assertIn('signal_id',signals[0]['payload'])
 feed=self.client.get('/api/v1/dashboard/utility',headers=self.headers(utility));self.assertEqual(feed.status_code,200,feed.json);signal=feed.json['signals'][0];self.assertEqual(len(signal['signed_payload_sha256']),64)
 review_path='/api/v1/utility/signals/'+signal['id']+'/review'
 self.assertEqual(self.client.post(review_path,headers=self.headers(unrelated),json={}).status_code,404)
 review=self.client.post(review_path,headers=self.headers(utility),json={});self.assertEqual(review.status_code,201,review.json)
 self.assertEqual(self.client.post(review_path,headers=self.headers(utility),json={}).status_code,200)
 with self.app.app_context(),transaction() as c:query(c,'UPDATE utility_device_scopes SET revoked_at=now() WHERE organization_id=:id',id=org)
 self.assertEqual(self.client.post(review_path,headers=self.headers(utility),json={}).status_code,404)
 self.assertEqual(self.client.post('/api/v1/device/events',json=self.envelope(d,kind='tamper',active=False)).status_code,200);self.drain()
 self.assertEqual(len([n for n in self.client.get('/api/v1/alerts',headers=self.headers(utility)).json['items'] if n['template_key']=='tamper']),1)
TrustIntegration.test_utility_alert_fanout_is_contract_scoped=test_utility_alert_fanout_is_contract_scoped
