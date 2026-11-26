"""Recorded alerts: strict settings, ownership and delivery-state preservation."""
import unittest,uuid
from test_api import LiveIntegration
from app.db import transaction,one,query
from app.alert_experience import validate_sensory,alert_details
class SensoryValidation(unittest.TestCase):
 def test_rejects_malformed_settings(self):
  for value in ({'volume':True},{'volume':float('nan')},{'quiet_hours':None},{'quiet_hours':{'enabled':True,'start':'24:00','end':'07:00'}},{'per_type':{'invented':True}},{'audio_enabled':1}):
   with self.subTest(value=value),self.assertRaises(Exception):validate_sensory(value)
 def test_catalog_cannot_be_overridden(self):
  value=alert_details('supply.lost',{'severity':'success','soundId':'welcome','alert_type':'info'})
  self.assertEqual(value['alert_type'],'info');self.assertNotEqual(value['severity'],'success')
class AlertIntegration(LiveIntegration):
 # Override discovery of inherited tests: these focused checks use the real fixture helpers.
 pass
for name in dir(LiveIntegration):
 if name.startswith('test_'):setattr(AlertIntegration,name,None)
del LiveIntegration
def test_interaction_scope(self):
 owner=self.user();other=self.user();nid=str(uuid.uuid4())
 with self.app.app_context(),transaction() as c:query(c,"INSERT INTO notifications(id,recipient_id,template_key,channel,status,payload,dedupe_key) VALUES(:id,:uid,'supply.lost','in_app','delivered','{}',:key)",id=nid,uid=owner['id'],key=str(uuid.uuid4()))
 self.assertEqual(self.client.post('/api/v1/alerts/'+nid+'/acknowledge',headers=self.headers(other)).status_code,404)
 self.assertEqual(self.client.post('/api/v1/alerts/'+nid+'/snooze',headers=self.headers(owner),json={'minutes':True}).status_code,400)
 self.assertEqual(self.client.post('/api/v1/alerts/'+nid+'/snooze',headers=self.headers(owner),json={'minutes':15}).status_code,200)
 self.assertEqual(self.client.post('/api/v1/alerts/'+nid+'/acknowledge',headers=self.headers(owner)).status_code,200)
 with self.app.app_context(),transaction() as c:
  row=one(c,'SELECT n.status,i.acknowledged_at,i.snoozed_until FROM notifications n JOIN notification_interactions i ON i.notification_id=n.id WHERE n.id=:id',id=nid)
 self.assertEqual(row['status'],'delivered');self.assertIsNotNone(row['acknowledged_at']);self.assertIsNone(row['snoozed_until'])
 self.assertEqual(self.client.patch('/api/v1/users/me/preferences',headers=self.headers(owner),json={'sensory':{'audio_enabled':True,'volume':.3}}).status_code,200)
 self.assertEqual(self.client.patch('/api/v1/users/me/preferences',headers=self.headers(owner),json={'sensory':{'volume':2}}).status_code,400)
AlertIntegration.test_interaction_scope=test_interaction_scope
def test_recorded_advisories(self):
 from datetime import datetime,timezone,timedelta
 from app.device_experience import electrical,connection,check_offline
 from app.db import rows
 owner=self.user('homeowner');device=self.provision(owner);now=datetime.now(timezone.utc)
 with self.app.app_context(),transaction() as c:
  stored=one(c,'SELECT * FROM devices WHERE id=:id FOR UPDATE',id=device['id'])
  self.app.config.update(VOLTAGE_WARNING_LOW_MV='180000',VOLTAGE_WARNING_HIGH_MV='250000')
  row={'occurred_at_ms':int(now.timestamp()*1000),'quality':'valid','clock_quality':'estimated','voltage_mv':270000,'current_ma':None}
  electrical(c,row,stored)
  self.assertEqual(len(rows(c,'SELECT id FROM notifications WHERE recipient_id=:uid',uid=owner['id'])),0)
  row['clock_quality']='trusted';electrical(c,row,stored);row['occurred_at_ms']+=1;electrical(c,row,stored)
  notices=rows(c,"SELECT payload FROM notifications WHERE recipient_id=:uid AND payload->>'alert_type'='over_voltage'",uid=owner['id'])
  self.assertEqual(len(notices),1);self.assertTrue(notices[0]['payload']['advisory_only'])
  query(c,"UPDATE devices SET last_seen_at=now()-interval '5 minutes' WHERE id=:id",id=device['id'])
 with self.app.app_context():check_offline();check_offline()
 with self.app.app_context(),transaction() as c:
  stored=dict(one(c,'SELECT * FROM devices WHERE id=:id FOR UPDATE',id=device['id']));connection(c,stored);stored['last_seen_at']=now;connection(c,stored)
  events=rows(c,"SELECT payload->>'alert_type' AS code FROM notifications WHERE recipient_id=:uid",uid=owner['id'])
 self.assertEqual([r['code'] for r in events].count('device_offline'),1);self.assertEqual([r['code'] for r in events].count('device_online'),1)
AlertIntegration.test_recorded_advisories=test_recorded_advisories
def test_signed_channel_manifests(self):
 owner=self.user('homeowner');d=self.provision(owner)
 for version,channels in enumerate([{'current_a':{'unit':'A','range':[0,5]}},{'current_a':{'unit':'A','range':[0,100]},'voltage_v':{'unit':'V','range':[0,300],'warning_band':[180,250]}},{'power_w':{'unit':'W','range':[0,750]}}],1):
  manifest={'version':version,'schema_version':1,'calibration_version':'qa-calibration-v1','channels':channels}
  packet=self.envelope(d,kind='config',manifest=manifest)
  response=self.client.post('/api/v1/device/events',json=packet);self.assertEqual(response.status_code,200,response.json)
  context=self.client.get('/api/v1/users/me/context',headers=self.headers(owner));self.assertEqual(context.status_code,200,context.json)
  declared=next(item for item in context.json['devices'] if item['id']==d['id'])['channel_manifest']
  self.assertEqual(declared['channels'],channels);self.assertEqual(declared['version'],version)
 bad={'version':4,'schema_version':1,'calibration_version':'qa','channels':{'current_a':{'unit':'V','range':[0,5]}}}
 self.assertEqual(self.client.post('/api/v1/device/events',json=self.envelope(d,kind='config',manifest=bad)).status_code,400)
 self.assertEqual(self.client.post('/api/v1/device/events',json=self.envelope(d,kind='config',manifest={'version':2,'schema_version':1,'calibration_version':'qa','channels':{}})).status_code,409)
AlertIntegration.test_signed_channel_manifests=test_signed_channel_manifests
def test_installation_current_bands_are_independent(self):
 from app.db import rows
 owner=self.user('homeowner');home=self.provision(owner);business=self.provision(owner)
 self.app.config.update(CURRENT_WARNING_LOW_MA='0',CURRENT_WARNING_HIGH_MA='5000')
 for device,limit in [(home,10),(business,80)]:
  manifest={'version':1,'schema_version':1,'calibration_version':'qualified-installation-reference','channels':{'current_a':{'unit':'A','range':[0,100],'warning_band':[0,limit]}}}
  self.assertEqual(self.client.post('/api/v1/device/events',json=self.envelope(device,kind='config',manifest=manifest)).status_code,200)
  self.assertEqual(self.client.post('/api/v1/device/events',json=self.envelope(device,metrics={'current_ma':20000,'import_mwh':0})).status_code,200)
  self.drain()
 with self.app.app_context(),transaction() as c:
  warnings=rows(c,"SELECT payload FROM notifications WHERE recipient_id=:id AND payload->>'alert_type'='over_current'",id=owner['id'])
 self.assertEqual([row['payload']['device_id'] for row in warnings],[home['id']])
 self.app.config.pop('CURRENT_WARNING_LOW_MA',None);self.app.config.pop('CURRENT_WARNING_HIGH_MA',None)
AlertIntegration.test_installation_current_bands_are_independent=test_installation_current_bands_are_independent
def test_shared_live_stream_is_authenticated_and_scoped(self):
 import json
 from app.work import notify
 owner=self.user('homeowner');other=self.user('homeowner');mine=self.provision(owner);theirs=self.provision(other)
 with self.app.app_context(),transaction() as c:
  notify(c,owner['id'],'protection','Private owner event','stream-own:'+str(uuid.uuid4()),channels=[])
  notify(c,other['id'],'protection','Other private event','stream-other:'+str(uuid.uuid4()),channels=[])
 self.assertEqual(self.client.get('/api/v1/users/me/live').status_code,401)
 response=self.client.get('/api/v1/users/me/live',headers=self.headers(owner),buffered=False)
 try:
  self.assertEqual(response.status_code,200);self.assertIn('text/event-stream',response.content_type);frame=next(iter(response.response)).decode();self.assertTrue(frame.startswith('event: snapshot\n'))
  payload=json.loads(frame.split('data: ',1)[1]);self.assertEqual(payload['context']['authorized_context']['phone'],owner['phone']);self.assertIn('email',payload['context']['authorized_context']);self.assertEqual([item['id'] for item in payload['context']['devices']],[mine['id']]);self.assertNotIn(theirs['id'],json.dumps(payload));self.assertEqual([row['payload']['message'] for row in payload['notifications']],['Private owner event']);self.assertEqual(response.headers['Cache-Control'],'no-store, no-transform')
  with self.app.app_context(),transaction() as c:query(c,'UPDATE devices SET owner_id=:uid WHERE id=:id',uid=other['id'],id=mine['id'])
  next_frame=next(iter(response.response)).decode();self.assertEqual(json.loads(next_frame.split('data: ',1)[1])['context']['devices'],[])
 finally:response.close()
AlertIntegration.test_shared_live_stream_is_authenticated_and_scoped=test_shared_live_stream_is_authenticated_and_scoped
def test_staff_can_find_a_device_outside_recent_registry_window(self):
 owner=self.user('homeowner');device=self.provision(owner);ops=self.promote(self.user('homeowner'),'internal_ops')
 with self.app.app_context(),transaction() as c:query(c,"UPDATE devices SET created_at=now()-interval '10 years' WHERE id=:id",id=device['id'])
 response=self.client.get('/api/v1/communications/context?device_search='+device['id'],headers=self.headers(ops))
 self.assertEqual(response.status_code,200,response.json);self.assertEqual([row['id'] for row in response.json['devices']],[device['id']])
 self.assertEqual(self.client.get('/api/v1/communications/context?device_search='+device['id'],headers=self.headers(owner)).status_code,403)
 self.assertEqual(self.client.get('/api/v1/communications/context?device_search='+'x'*101,headers=self.headers(ops)).status_code,400)
AlertIntegration.test_staff_can_find_a_device_outside_recent_registry_window=test_staff_can_find_a_device_outside_recent_registry_window

def test_uncertain_signed_receipt_does_not_claim_a_relay_state(self):
 import hashlib
 from datetime import datetime,timezone
 from app.protocol import canonical
 owner=self.user('homeowner');device=self.provision(owner);target={'device_id':device['id'],'state':'off'}
 with self.app.app_context(),transaction() as c:
  query(c,"UPDATE feature_flags SET enabled_globally=true WHERE key='pro_relay_control'")
  challenge=one(c,'INSERT INTO step_up_challenges(user_id,operation_hash,scope_ids,verified_at) VALUES(:uid,:hash,CAST(:ids AS uuid[]),now()) RETURNING id',uid=owner['id'],hash=hashlib.sha256(canonical(target)).hexdigest(),ids=[device['id']])
 result=self.client.post('/api/v1/devices/'+device['id']+'/relay',headers=self.headers(owner),json={'state':'off','authorization_ref':str(challenge['id'])})
 self.assertEqual(result.status_code,202,result.json)
 with self.app.app_context(),transaction() as c:command=one(c,'SELECT command_id,seq FROM commands WHERE command_id=:id',id=result.json['id'])
 receipt=self.envelope(device,'command_receipt',command_id=str(command['command_id']),command_seq=command['seq'],result='applied',observed_on=True,observed_at_ms=int(datetime.now(timezone.utc).timestamp()*1000))
 self.assertEqual(self.client.post('/api/v1/device/receipts',json=receipt).status_code,200)
 projection=self.client.get('/api/v1/users/me/context',headers=self.headers(owner)).json['devices'][0]['relay'];self.assertIsNone(projection['observed']);self.assertEqual(projection['latest_command']['status'],'uncertain')
AlertIntegration.test_uncertain_signed_receipt_does_not_claim_a_relay_state=test_uncertain_signed_receipt_does_not_claim_a_relay_state
def test_read_only_viewer_cannot_read_financial_account(self):
 owner=self.user('homeowner');viewer=self.user('homeowner');device=self.provision(owner)
 response=self.client.post('/api/v1/devices/'+device['id']+'/viewers',headers=self.headers(owner),json={'viewer_phone':viewer['phone']});self.assertEqual(response.status_code,201,response.json)
 context=self.client.get('/api/v1/users/me/context',headers=self.headers(viewer));self.assertEqual(context.status_code,200,context.json);shared=next(item for item in context.json['devices'] if item['id']==device['id']);self.assertIsNone(shared['wallet']);self.assertNotIn('recharge',context.json['allowed_actions']);self.assertFalse(shared['controls']['can_request'])
 self.assertEqual(self.client.get('/api/v1/wallets',headers=self.headers(viewer)).json['items'],[])
 self.assertEqual(self.client.get('/api/v1/wallets/'+str(device['wallet']['id'])+'/ledger',headers=self.headers(viewer)).status_code,404)
 self.assertEqual(self.client.get('/api/v1/bills',headers=self.headers(viewer)).json['items'],[])
AlertIntegration.test_read_only_viewer_cannot_read_financial_account=test_read_only_viewer_cannot_read_financial_account
