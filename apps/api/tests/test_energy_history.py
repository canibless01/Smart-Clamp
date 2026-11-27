"""Durable measured windows, deduplication, immutable evidence and conservative trends."""
import unittest
from datetime import datetime,timezone,timedelta
from unittest.mock import patch
from sqlalchemy.exc import DBAPIError
from test_api import LiveIntegration
from app.db import transaction,query,one
from app.energy_history import trend
class EnergyHistoryIntegration(LiveIntegration):pass
for name in dir(LiveIntegration):
 if name.startswith('test_'):setattr(EnergyHistoryIntegration,name,None)
del LiveIntegration

def test_closed_windows_freeze_real_sources_count_once_and_isolate_owners(self):
 owner=self.user('landlord');other=self.user('landlord');admin=self.promote(self.user(),'internal_superadmin');devices=[self.provision(owner) for _ in range(2)]
 span=900000;last=int(datetime.now(timezone.utc).timestamp()*1000)//span*span;first=last-3*span
 with self.app.app_context(),transaction() as c:
  bid=str(one(c,"INSERT INTO buildings(landlord_id,name,address,meter_type) VALUES(:uid,'QA evidence windows','QA','with_meter') RETURNING id",uid=owner['id'])['id'])
  for d in devices:query(c,'UPDATE devices SET building_id=:bid,persistent_counter_qualified=true WHERE id=:id',bid=bid,id=d['id'])
  query(c,'INSERT INTO topology_edges(parent_device_id,child_device_id,valid_from) VALUES(:parent,:child,:start)',parent=devices[0]['id'],child=devices[1]['id'],start=datetime.fromtimestamp((first-1000)/1000,timezone.utc))
 path='/api/v1/buildings/'+bid+'/energy-reconciliation/history'
 self.assertEqual(self.client.get(path,headers=self.headers(other)).status_code,404)
 self.assertEqual(self.client.post(path,headers=self.headers(owner),json={'minutes':15}).status_code,409)
 for key,value in [('max_gap_ms',900000),('boundary_skew_ms',0),('tolerance_bps',500),('collection_delay_ms',0),('consecutive_windows',3)]:
  response=self.client.post('/api/v1/ops/settings/reconciliation.'+key,headers=self.headers(admin),json={'scope_type':'building','scope_ref':bid,'expected_version':0,'value':value,'reason':'Approved isolated QA evidence policy','effective_from':datetime.fromtimestamp((first-2000)/1000,timezone.utc).isoformat()});self.assertEqual(response.status_code,201,response.json)
 for d,step in zip(devices,[1000000,800000]):
  for n in range(4):
   response=self.client.post('/api/v1/device/events',json=self.envelope(d,occurred_at_ms=first+n*span,metrics={'import_mwh':n*step}));self.assertEqual(response.status_code,200,response.json)
 for n in range(1,4):
  with patch('app.energy_history.datetime',wraps=datetime) as clock:
   clock.now.return_value=datetime.fromtimestamp((first+n*span+1000)/1000,timezone.utc)
   response=self.client.post(path,headers=self.headers(owner),json={'minutes':15});self.assertEqual(response.status_code,200,response.json)
   self.assertEqual(response.json['trend']['consecutive_review_windows'],n)
   repeated=self.client.post(path,headers=self.headers(owner),json={'minutes':15});self.assertEqual(len(repeated.json['items']),n);self.assertIsNone(repeated.json['recorded_id'])
 self.assertEqual(response.json['trend']['status'],'persistent_review');record=response.json['items'][0]
 self.assertEqual(record['difference_mwh'],200000);self.assertFalse(record['snapshot']['money_changed']);self.assertEqual(len(record['snapshot']['sources']),2)
 import base64,hashlib,json
 exported=self.client.get(path+'/'+str(record['id']),headers=self.headers(owner));self.assertEqual(exported.status_code,200,exported.json)
 raw=base64.b64decode(exported.json['canonical_base64']);self.assertEqual(hashlib.sha256(raw).hexdigest(),exported.json['sha256']);self.assertEqual(json.loads(raw)['environment'],'isolated_qa');self.assertIsNone(exported.json['signature'])
 self.assertEqual(self.client.get(path+'/'+str(record['id']),headers=self.headers(other)).status_code,404)
 with self.app.app_context(),transaction() as c:
  for role in ('anon','authenticated'):
   for privilege in ('SELECT','INSERT','UPDATE','DELETE'):
    self.assertFalse(one(c,"SELECT has_table_privilege(:role,'public.energy_comparison_windows',:privilege) AS allowed",role=role,privilege=privilege)['allowed'])
  with self.assertRaises(DBAPIError):
   with c.begin_nested():query(c,"UPDATE energy_comparison_windows SET status='within_tolerance' WHERE id=:id",id=record['id'])
  self.assertEqual(one(c,'SELECT count(*) AS n FROM audit_log WHERE action=\'energy_comparison_recorded\' AND actor_id=:uid',uid=owner['id'])['n'],3)
  self.assertEqual(one(c,'SELECT count(*) AS n FROM ledger_transactions WHERE wallet_id IN(:a,:b)',a=devices[0]['wallet']['id'],b=devices[1]['wallet']['id'])['n'],0)
EnergyHistoryIntegration.test_closed_windows_freeze_real_sources_count_once_and_isolate_owners=test_closed_windows_freeze_real_sources_count_once_and_isolate_owners

class ConservativeTrend(unittest.TestCase):
 def item(self,end,status='review',**extra):return {'period_start_ms':end-1000,'period_end_ms':end,'status':status,'policy_sha256':'a'*64,'topology_version':1,**extra}
 def test_gaps_unknown_and_changed_policy_or_topology_break_consecutiveness(self):
  windows=[self.item(3000),self.item(2000),self.item(1000)]
  self.assertEqual(trend(windows,3)['status'],'persistent_review')
  for changed in [self.item(2000,status='unknown'),self.item(1000),self.item(2000,policy_sha256='b'*64),self.item(2000,topology_version=2)]:
   self.assertEqual(trend([windows[0],changed,windows[2]],3)['consecutive_review_windows'],1)
  self.assertEqual(trend([self.item(3000,'unknown')],2)['status'],'unknown')
  self.assertEqual(trend([self.item(3000,'within_tolerance')],2)['status'],'latest_within_tolerance')
  self.assertEqual(trend(windows,None)['status'],'not_configured')
