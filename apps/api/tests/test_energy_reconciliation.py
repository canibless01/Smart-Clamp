"""Qualified comparison without inferred balances, allocations or theft verdicts."""
import unittest
from datetime import datetime,timezone,timedelta
from unittest.mock import patch
from test_api import LiveIntegration
from app.db import transaction,query,one
from app.energy_reconciliation import interval
class ReconciliationIntegration(LiveIntegration):pass
for name in dir(LiveIntegration):
 if name.startswith('test_'):setattr(ReconciliationIntegration,name,None)
del LiveIntegration

def test_scope_policy_aligned_sources_and_missing_coverage(self):
 owner=self.user('landlord');other=self.user();admin=self.promote(self.user(),'internal_superadmin');devices=[self.provision(owner) for _ in range(3)]
 end=datetime.now(timezone.utc).replace(microsecond=0);start=end-timedelta(minutes=15)
 with self.app.app_context(),transaction() as c:
  bid=str(one(c,"INSERT INTO buildings(landlord_id,name,address,meter_type) VALUES(:uid,'QA comparison','QA','with_meter') RETURNING id",uid=owner['id'])['id'])
  for d in devices:query(c,'UPDATE devices SET building_id=:bid,persistent_counter_qualified=true WHERE id=:id',id=d['id'],bid=bid)
  for d in devices[1:]:query(c,'INSERT INTO topology_edges(parent_device_id,child_device_id,valid_from) VALUES(:parent,:child,:start)',parent=devices[0]['id'],child=d['id'],start=start-timedelta(minutes=1))
 path='/api/v1/buildings/'+bid+'/energy-reconciliation'
 self.assertEqual(self.client.get(path,headers=self.headers(other)).status_code,404)
 self.assertEqual(self.client.get(path,headers=self.headers(owner)).json['reason'],'comparison_policy_unconfigured')
 for key,value in [('max_gap_ms',900000),('boundary_skew_ms',0),('tolerance_bps',500)]:
  r=self.client.post('/api/v1/ops/settings/reconciliation.'+key,headers=self.headers(admin),json={'scope_type':'building','scope_ref':bid,'expected_version':0,'value':value,'reason':'Isolated QA comparison policy approval','effective_from':(start-timedelta(minutes=1)).isoformat()})
  self.assertEqual(r.status_code,201,r.json)
 for d,delta in zip(devices,[1000000,500000,400000]):
  for when,total in [(start,0),(end,delta)]:
   packet=self.envelope(d,occurred_at_ms=int(when.timestamp()*1000),metrics={'import_mwh':total})
   response=self.client.post('/api/v1/device/events',json=packet);self.assertEqual(response.status_code,200,response.json)
 with patch('app.energy_reconciliation.datetime',wraps=datetime) as clock:
  clock.now.return_value=end
  measured=self.client.get(path,headers=self.headers(owner));self.assertEqual(measured.status_code,200,measured.json)
  self.assertEqual(measured.json['status'],'review');self.assertEqual(measured.json['difference_mwh'],100000);self.assertFalse(measured.json['money_changed']);self.assertFalse(measured.json['physical_wiring_verified'])
  self.assertEqual(len(measured.json['sources']),3)
  with self.app.app_context(),transaction() as c:
   for d in devices:self.assertIsNone(one(c,'SELECT relay_observed FROM devices WHERE id=:id',id=d['id'])['relay_observed'])
   query(c,'UPDATE devices SET persistent_counter_qualified=false WHERE id=:id',id=devices[1]['id'])
  missing=self.client.get(path,headers=self.headers(owner)).json
  self.assertEqual(missing['status'],'unknown');self.assertIsNone(missing['difference_mwh']);self.assertEqual(missing['reason'],'incomplete_measurement_coverage')
ReconciliationIntegration.test_scope_policy_aligned_sources_and_missing_coverage=test_scope_policy_aligned_sources_and_missing_coverage

class WindowQualification(unittest.TestCase):
 def sample(self,at,total,**extra):return dict(id=str(at),occurred_at_ms=at,import_mwh=total,quality='valid',clock_quality='trusted',config_epoch=1,key_epoch=1,payload_sha256='a'*64,**extra)
 def test_unknown_is_not_zero_and_resets_epochs_gaps_are_rejected(self):
  a=self.sample(1000,0);b=self.sample(2000,100)
  self.assertEqual(interval([a,b],1000,2000,1000,0)[0]['energy_mwh'],100)
  self.assertEqual(interval([a,{**b,'import_mwh':0}],1000,2000,1000,0)[0]['energy_mwh'],0)
  for changed,reason in [({'import_mwh':None},'unqualified_reading'),({'quality':'gap'},'unqualified_reading'),({'clock_quality':'estimated'},'unqualified_reading'),({'config_epoch':2},'epoch_changed'),({'key_epoch':2},'epoch_changed'),({'import_mwh':-1},'counter_reset')]:
   self.assertEqual(interval([a,{**b,**changed}],1000,2000,1000,0)[1],reason)
  self.assertEqual(interval([a,b],1000,2100,1000,0)[1],'boundary_unaligned')
  self.assertEqual(interval([a,b],1000,2000,999,0)[1],'coverage_gap')
  self.assertEqual(interval([],1000,2000,1000,0)[1],'boundary_missing')

def test_versioned_topology_recording_is_scoped_idempotent_and_preserves_history(self):
 owner=self.user('landlord');other=self.user('landlord');devices=[self.provision(owner) for _ in range(3)];foreign=self.provision(other)
 with self.app.app_context(),transaction() as c:
  bid=str(one(c,"INSERT INTO buildings(landlord_id,name,address,meter_type) VALUES(:uid,'QA topology','QA','with_meter') RETURNING id",uid=owner['id'])['id'])
  for d in devices:query(c,'UPDATE devices SET building_id=:bid WHERE id=:id',bid=bid,id=d['id'])
 path='/api/v1/buildings/'+bid+'/topology';initial=self.client.get(path,headers=self.headers(owner));self.assertEqual(initial.status_code,200,initial.json);self.assertEqual(len(initial.json['devices']),3)
 body={'expected_version':1,'parent_device_id':devices[0]['id'],'child_device_ids':[d['id'] for d in devices[1:]],'reason':'QA recorded downstream branches; no physical certificate'}
 self.assertEqual(self.client.post(path,headers=self.headers(other),json=body).status_code,404)
 self.assertEqual(self.client.post(path,headers=self.headers(owner),json={**body,'child_device_ids':[foreign['id']]}).status_code,404)
 self.assertEqual(self.client.post(path,headers=self.headers(owner),json={**body,'child_device_ids':[devices[0]['id']]}).status_code,400)
 headers=self.headers(owner);created=self.client.post(path,headers=headers,json=body);self.assertEqual(created.status_code,200,created.json);self.assertFalse(created.json['physical_wiring_verified'])
 self.assertEqual(self.client.post(path,headers=headers,json=body).json,created.json)
 self.assertEqual(self.client.post(path,headers=self.headers(owner),json=body).status_code,409)
 replaced=self.client.post(path,headers=self.headers(owner),json={**body,'expected_version':2,'child_device_ids':[devices[1]['id']]});self.assertEqual(replaced.status_code,200,replaced.json)
 with self.app.app_context(),transaction() as c:
  self.assertEqual(one(c,'SELECT count(*) AS n FROM topology_edges WHERE parent_device_id=:id AND valid_to IS NOT NULL',id=devices[0]['id'])['n'],2)
  self.assertEqual(one(c,'SELECT count(*) AS n FROM topology_edges WHERE parent_device_id=:id AND valid_to IS NULL',id=devices[0]['id'])['n'],1)
  self.assertEqual(one(c,'SELECT count(*) AS n FROM audit_log WHERE target_id=:id AND action=\'building_topology_recorded\'',id=bid)['n'],2)
ReconciliationIntegration.test_versioned_topology_recording_is_scoped_idempotent_and_preserves_history=test_versioned_topology_recording_is_scoped_idempotent_and_preserves_history
