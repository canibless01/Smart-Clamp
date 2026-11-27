"""Operation-bound settings, signed polling/receipts, qualification and ownership boundaries."""
import hashlib,uuid
from test_api import LiveIntegration
from app.db import transaction,query,one
from app.protocol import canonical,verify
from app.automation import DEFAULT,clear_for_transfer
class AutomationIntegration(LiveIntegration):pass
for name in dir(LiveIntegration):
 if name.startswith('test_'):setattr(AutomationIntegration,name,None)
del LiveIntegration

def test_signed_policy_loop_is_bound_versioned_and_not_physical_feedback(self):
 self.app.config['AUTOMATION_ENABLED']='true'
 owner=self.user('homeowner');other=self.user('homeowner');d=self.provision(owner);path='/api/v1/devices/'+d['id']+'/automation'
 self.assertFalse(self.client.get(path,headers=self.headers(owner)).json['can_configure'])
 cfg={**DEFAULT,'daily_mwh':1000000,'monthly_mwh':30000000,'schedule_enabled':True,'allowed_windows':[{'start':420,'end':1320}]}
 with self.app.app_context(),transaction() as c:
  query(c,"UPDATE profiles SET subscription_tier='pro' WHERE id=:id",id=owner['id']);query(c,'UPDATE devices SET automation_policy_qualified=true,persistent_counter_qualified=true WHERE id=:id',id=d['id'])
 self.assertEqual(self.client.post('/api/v1/device/events',json=self.envelope(d,metrics={'import_mwh':5000})).status_code,200)
 def grant(config,version):
  with self.app.app_context(),transaction() as c:return str(one(c,'INSERT INTO step_up_challenges(user_id,operation_hash,scope_ids,verified_at) VALUES(:uid,:hash,CAST(:ids AS uuid[]),now()) RETURNING id',uid=owner['id'],hash=hashlib.sha256(canonical({'device_id':d['id'],'expected_version':version,'settings':config})).hexdigest(),ids=[d['id']])['id'])
 authorization=grant(cfg,0)
 self.assertEqual(self.client.post(path,headers=self.headers(other),json={'settings':cfg,'expected_version':0,'authorization_ref':authorization}).status_code,404)
 edited={**cfg,'daily_mwh':2000000};self.assertEqual(self.client.post(path,headers=self.headers(owner),json={'settings':edited,'expected_version':0,'authorization_ref':authorization}).status_code,403)
 created=self.client.post(path,headers=self.headers(owner),json={'settings':cfg,'expected_version':0,'authorization_ref':authorization});self.assertEqual(created.status_code,202,created.json)
 self.assertFalse(created.json['physical_switching_confirmed']);self.assertEqual(self.client.post(path,headers=self.headers(owner),json={'settings':cfg,'expected_version':0,'authorization_ref':authorization}).status_code,409)
 packet=self.envelope(d,kind='poll');response=self.client.post('/api/v1/device/poll',json=packet);self.assertEqual(response.status_code,200,response.json);body=verify(response.json['automation_policy'],d['command_key']);self.assertEqual(body['request_seq'],packet['payload']['seq'] if 'payload' in packet else d['seq']);self.assertEqual(body['settings'],cfg);self.assertEqual(body['anchor_mwh'],5000)
 receipt=self.envelope(d,kind='automation_policy_receipt',policy_id=body['policy_id'],policy_seq=body['policy_seq'],body_sha256=body['body_sha256'],result='accepted',reason_code='durable_config_installed')
 accepted=self.client.post('/api/v1/device/automation/receipts',json=receipt);self.assertEqual(accepted.status_code,200,accepted.json);self.assertEqual(self.client.post('/api/v1/device/automation/receipts',json=receipt).json,accepted.json)
 current=self.client.get(path,headers=self.headers(owner));self.assertEqual(current.json['status'],'accepted');self.assertFalse(current.json['physical_switching_confirmed'])
 with self.app.app_context(),transaction() as c:self.assertIsNone(one(c,'SELECT relay_observed FROM devices WHERE id=:id',id=d['id'])['relay_observed'])
 # Updating limits preserves the initial budget anchor and requires a fresh matching grant.
 authorization=grant(edited,1);updated=self.client.post(path,headers=self.headers(owner),json={'settings':edited,'expected_version':1,'authorization_ref':authorization});self.assertEqual(updated.status_code,202,updated.json)
 next_policy=verify(self.client.post('/api/v1/device/poll',json=self.envelope(d,kind='poll')).json['automation_policy'],d['command_key']);self.assertEqual(next_policy['anchor_mwh'],5000);self.assertEqual(next_policy['policy_seq'],2)
 # Disabling is available after plan expiry, but it is still confirmed and device-acknowledged.
 with self.app.app_context(),transaction() as c:query(c,"UPDATE profiles SET subscription_tier='free' WHERE id=:id",id=owner['id'])
 authorization=grant(DEFAULT,2);disabled=self.client.post(path,headers=self.headers(owner),json={'settings':DEFAULT,'expected_version':2,'authorization_ref':authorization});self.assertEqual(disabled.status_code,202,disabled.json)
AutomationIntegration.test_signed_policy_loop_is_bound_versioned_and_not_physical_feedback=test_signed_policy_loop_is_bound_versioned_and_not_physical_feedback

def test_invalid_windows_and_unqualified_configuration_are_rejected(self):
 owner=self.user('homeowner');d=self.provision(owner);path='/api/v1/devices/'+d['id']+'/automation'
 payload={'settings':DEFAULT,'expected_version':0,'authorization_ref':str(uuid.uuid4())}
 self.assertEqual(self.client.post(path,headers=self.headers(owner),json=payload).status_code,422)
 for cfg in [{**DEFAULT,'daily_mwh':True},{**DEFAULT,'schedule_enabled':True},{**DEFAULT,'allowed_windows':[{'start':100,'end':200},{'start':150,'end':250}]}]:
  self.assertEqual(self.client.post(path,headers=self.headers(owner),json={**payload,'settings':cfg}).status_code,400)
 self.assertIsNone(self.client.post('/api/v1/device/poll',json=self.envelope(d,kind='poll')).json['automation_policy'])
AutomationIntegration.test_invalid_windows_and_unqualified_configuration_are_rejected=test_invalid_windows_and_unqualified_configuration_are_rejected

def test_room_transfer_requires_acknowledged_disabled_policy_and_new_subject_anchor(self):
 self.app.config['AUTOMATION_ENABLED']='true';landlord=self.user('landlord');tenant=self.user();incoming=self.user();d=self.provision(landlord)
 with self.app.app_context(),transaction() as c:
  building=one(c,"INSERT INTO buildings(landlord_id,name,address,meter_type) VALUES(:uid,'QA automation handover','QA','with_meter') RETURNING id",uid=landlord['id'])['id'];room=one(c,"INSERT INTO rooms(building_id,label) VALUES(:id,'QA room') RETURNING id",id=building)['id']
  query(c,'UPDATE devices SET room_id=:room,building_id=:building,automation_policy_qualified=true,persistent_counter_qualified=true WHERE id=:id',id=d['id'],room=room,building=building)
  query(c,'INSERT INTO occupancies(room_id,tenant_id) VALUES(:room,:uid)',room=room,uid=tenant['id'])
  query(c,"UPDATE profiles SET subscription_tier='pro' WHERE id IN(:a,:b)",a=tenant['id'],b=incoming['id'])
 self.assertEqual(self.client.post('/api/v1/device/events',json=self.envelope(d,metrics={'import_mwh':0})).status_code,200);self.drain()
 def change(user,cfg,version):
  with self.app.app_context(),transaction() as c:authorization=str(one(c,'INSERT INTO step_up_challenges(user_id,operation_hash,scope_ids,verified_at) VALUES(:uid,:hash,CAST(:ids AS uuid[]),now()) RETURNING id',uid=user['id'],hash=hashlib.sha256(canonical({'device_id':d['id'],'expected_version':version,'settings':cfg})).hexdigest(),ids=[d['id']])['id'])
  return self.client.post('/api/v1/devices/'+d['id']+'/automation',headers=self.headers(user),json={'settings':cfg,'expected_version':version,'authorization_ref':authorization})
 cfg={**DEFAULT,'daily_mwh':1000000};self.assertEqual(change(tenant,cfg,0).status_code,202)
 transfer='/api/v1/rooms/'+str(room)+'/transfer'
 blocked=self.client.post(transfer,headers=self.headers(landlord),json={'tenant_id':incoming['id']});self.assertEqual(blocked.json['code'],'automation_clearance_required')
 self.assertEqual(change(tenant,DEFAULT,1).status_code,202)
 self.assertEqual(self.client.post(transfer,headers=self.headers(landlord),json={'tenant_id':incoming['id']}).json['code'],'automation_clearance_required')
 body=verify(self.client.post('/api/v1/device/poll',json=self.envelope(d,kind='poll')).json['automation_policy'],d['command_key'])
 self.assertEqual(self.client.post('/api/v1/device/automation/receipts',json=self.envelope(d,kind='automation_policy_receipt',policy_id=body['policy_id'],policy_seq=body['policy_seq'],body_sha256=body['body_sha256'],result='accepted',reason_code='durable_disabled')).status_code,200)
 moved=self.client.post(transfer,headers=self.headers(landlord),json={'tenant_id':incoming['id']});self.assertEqual(moved.status_code,200,moved.json)
 self.assertEqual(self.client.get('/api/v1/devices/'+d['id']+'/automation',headers=self.headers(tenant)).status_code,404)
 self.assertIsNone(self.client.post('/api/v1/device/poll',json=self.envelope(d,kind='poll')).json['automation_policy'])
 self.assertEqual(self.client.post('/api/v1/device/events',json=self.envelope(d,metrics={'import_mwh':5000})).status_code,200);self.drain()
 self.assertEqual(change(incoming,cfg,2).status_code,202)
 new=verify(self.client.post('/api/v1/device/poll',json=self.envelope(d,kind='poll')).json['automation_policy'],d['command_key']);self.assertEqual(new['anchor_mwh'],5000);self.assertEqual(new['requested_by'],incoming['id'])
AutomationIntegration.test_room_transfer_requires_acknowledged_disabled_policy_and_new_subject_anchor=test_room_transfer_requires_acknowledged_disabled_policy_and_new_subject_anchor
