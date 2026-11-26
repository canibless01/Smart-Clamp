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
