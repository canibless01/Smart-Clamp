"""Real database/Auth coverage for scoped settings, immutable history and frozen money."""
from datetime import datetime,timedelta,timezone
from sqlalchemy.exc import DBAPIError
from test_api import LiveIntegration
from app.db import transaction,one,query
from app.business_rules import resolve,advisory_band
class BusinessRulesIntegration(LiveIntegration):pass
for name in dir(LiveIntegration):
 if name.startswith('test_'):setattr(BusinessRulesIntegration,name,None)
del LiveIntegration

def publish(self,admin,key,value,version=0,**extra):
 return self.client.post('/api/v1/ops/settings/'+key,headers=self.headers(admin),json={'value':value,'expected_version':version,'reason':'Isolated QA approved configuration','scope_type':'device',**extra})

def test_authority_validation_and_deferred_programmes(self):
 resident=self.user();ops=self.promote(self.user(),'internal_ops');admin=self.promote(self.user(),'internal_superadmin');d=self.provision(resident)
 self.assertEqual(self.client.get('/api/v1/ops/settings').status_code,401)
 self.assertEqual(self.client.get('/api/v1/ops/settings',headers=self.headers(resident)).status_code,403)
 self.assertFalse(self.client.get('/api/v1/ops/settings',headers=self.headers(ops)).json['can_edit'])
 self.assertEqual(publish(self,ops,'reports.link_lifetime_days',8,scope_ref=d['id']).status_code,403)
 self.assertEqual(publish(self,admin,'reports.link_lifetime_days',True,scope_ref=d['id']).status_code,400)
 self.assertEqual(publish(self,admin,'roles.agent.enabled',True,scope_type='global').status_code,422)
 self.assertEqual(publish(self,admin,'advisory.voltage_band_mv',[250000,180000],scope_ref=d['id']).status_code,400)
 self.assertEqual(publish(self,admin,'unregistered',10,scope_ref=d['id']).status_code,404)
 public=self.client.get('/api/v1/public/business-settings').json
 self.assertFalse(public['subscription_checkout_available']);self.assertEqual(public['plan_prices']['currency'],'NGN')
BusinessRulesIntegration.test_authority_validation_and_deferred_programmes=test_authority_validation_and_deferred_programmes

def test_scope_schedule_rollback_conflict_and_immutability(self):
 admin=self.promote(self.user(),'internal_superadmin');d=self.provision(self.user());key='reports.link_lifetime_days'
 first=publish(self,admin,key,8,scope_ref=d['id']);self.assertEqual(first.status_code,201,first.json)
 future=(datetime.now(timezone.utc)+timedelta(days=2)).isoformat()
 self.assertEqual(publish(self,admin,key,9,1,scope_ref=d['id'],effective_from=future).status_code,201)
 with self.app.app_context(),transaction() as c:
  self.assertEqual(resolve(c,key,{'device_id':d['id']})['value'],8)
  self.assertEqual(resolve(c,key,{'device_id':d['id']},datetime.now(timezone.utc)+timedelta(days=3))['value'],9)
 restored=publish(self,admin,key,None,2,scope_ref=d['id'],restore_version=1);self.assertEqual(restored.status_code,201,restored.json)
 self.assertEqual(publish(self,admin,key,10,2,scope_ref=d['id']).status_code,409)
 with self.app.app_context(),transaction() as c:
  self.assertEqual(resolve(c,key,{'device_id':d['id']},datetime.now(timezone.utc)+timedelta(days=3))['value'],8)
  self.assertEqual(resolve(c,key)['value'],7)
  with self.assertRaises(DBAPIError):
   with c.begin_nested():query(c,'UPDATE business_rule_versions SET value=\'1\'::jsonb WHERE id=:id',id=first.json['id'])
BusinessRulesIntegration.test_scope_schedule_rollback_conflict_and_immutability=test_scope_schedule_rollback_conflict_and_immutability

def test_quotes_freeze_scoped_rules_and_advisory_stays_separate(self):
 admin=self.promote(self.user(),'internal_superadmin');owner=self.user();d=self.provision(owner)
 for key,val in [('payments.fee_bps',100),('payments.fixed_fee_kobo',100),('payments.platform_markup_bps',200),('advisory.voltage_band_mv',[170000,255000])]:
  result=publish(self,admin,key,val,scope_ref=d['id']);self.assertEqual(result.status_code,201,result.json)
 quoted=self.client.post('/api/v1/payments/quotes',headers=self.headers(owner),json={'amount_kobo':50000,'destination_token':d['wallet']['payment_token']});self.assertEqual(quoted.status_code,201,quoted.json)
 self.assertEqual((quoted.json['fee_kobo'],quoted.json['markup_kobo'],quoted.json['wallet_value_kobo']),(600,1000,48400))
 self.assertEqual(publish(self,admin,'payments.fee_bps',300,1,scope_ref=d['id']).status_code,201)
 with self.app.app_context(),transaction() as c:
  frozen=one(c,'SELECT fee_kobo FROM quotes WHERE id=:id',id=quoted.json['id']);self.assertEqual(frozen['fee_kobo'],600)
  self.assertEqual(advisory_band(c,{'id':d['id']},'voltage'),[170000,255000])
  self.assertIsNone(one(c,'SELECT relay_observed FROM devices WHERE id=:id',id=d['id'])['relay_observed'])
 newer=self.client.post('/api/v1/payments/quotes',headers=self.headers(owner),json={'amount_kobo':50000,'destination_token':d['wallet']['payment_token']});self.assertEqual(newer.json['fee_kobo'],1600)
BusinessRulesIntegration.test_quotes_freeze_scoped_rules_and_advisory_stays_separate=test_quotes_freeze_scoped_rules_and_advisory_stays_separate
