"""Durable opt-in, signed sources, worker retry/locking and automatic actor provenance."""
from datetime import datetime,timezone,timedelta
from unittest.mock import patch
from concurrent.futures import ThreadPoolExecutor
from test_api import LiveIntegration
from app.db import transaction,query,one,rows
from app.energy_schedule import process_due
from app.energy_history import record_window
class ScheduleIntegration(LiveIntegration):pass
for name in dir(LiveIntegration):
 if name.startswith('test_'):setattr(ScheduleIntegration,name,None)
del LiveIntegration

def fixture(self):
 owner=self.user('landlord');admin=self.promote(self.user(),'internal_superadmin');devices=[self.provision(owner) for _ in range(2)];span=900000;first=int(datetime.now(timezone.utc).timestamp()*1000)//span*span-3*span
 with self.app.app_context(),transaction() as c:
  bid=str(one(c,"INSERT INTO buildings(landlord_id,name,address,meter_type) VALUES(:uid,'QA automatic evidence','QA','with_meter') RETURNING id",uid=owner['id'])['id'])
  for d in devices:query(c,'UPDATE devices SET building_id=:bid,persistent_counter_qualified=true WHERE id=:id',bid=bid,id=d['id'])
  query(c,'INSERT INTO topology_edges(parent_device_id,child_device_id,valid_from) VALUES(:a,:b,:at)',a=devices[0]['id'],b=devices[1]['id'],at=datetime.fromtimestamp((first-2000)/1000,timezone.utc))
 for key,val in [('max_gap_ms',900000),('boundary_skew_ms',0),('tolerance_bps',500),('collection_delay_ms',0),('consecutive_windows',3)]:
  r=self.client.post('/api/v1/ops/settings/reconciliation.'+key,headers=self.headers(admin),json={'scope_type':'building','scope_ref':bid,'expected_version':0,'value':val,'effective_from':datetime.fromtimestamp((first-2000)/1000,timezone.utc).isoformat(),'reason':'Isolated QA automatic evidence policy approval'});self.assertEqual(r.status_code,201,r.json)
 for d,step in zip(devices,[1000000,800000]):
  for n in range(4):self.assertEqual(self.client.post('/api/v1/device/events',json=self.envelope(d,occurred_at_ms=first+n*span,metrics={'import_mwh':n*step})).status_code,200)
 def cleanup_schedule():
  with self.app.app_context(),transaction() as c:query(c,'UPDATE energy_comparison_schedules SET enabled=false WHERE building_id=:id',id=bid)
 self.addCleanup(cleanup_schedule)
 path='/api/v1/buildings/'+bid+'/energy-reconciliation/schedule'
 with patch('app.energy_schedule.datetime',wraps=datetime) as clock:
  clock.now.return_value=datetime.fromtimestamp((first-1)/1000,timezone.utc)
  r=self.client.post(path,headers=self.headers(owner),json={'enabled':True,'minutes':15,'expected_version':0});self.assertEqual(r.status_code,200,r.json);self.assertEqual(r.json['schedule']['next_window_end_ms'],first+span)
 return owner,admin,devices,bid,path,first,span

def stop(self,owner,path):
 data=self.client.get(path,headers=self.headers(owner)).json['schedule'];return self.client.post(path,headers=self.headers(owner),json={'enabled':False,'minutes':data['minutes'],'expected_version':data['version']})

def test_worker_catches_up_once_and_preserves_system_provenance(self):
 owner,admin,devices,bid,path,first,span=fixture(self)
 self.assertEqual(self.client.get(path,headers=self.headers(self.user())).status_code,404)
 self.assertEqual(self.client.post(path,headers=self.headers(owner),json={'enabled':False,'minutes':15,'expected_version':0}).status_code,409)
 now=datetime.fromtimestamp((first+3*span+1000)/1000,timezone.utc)
 with self.app.app_context():
  for n in range(3):self.assertEqual(process_due(1,now),1)
  self.assertEqual(process_due(1,now),0)
 with self.app.app_context(),transaction() as c:
  saved=rows(c,'SELECT created_by,recording_mode,snapshot FROM energy_comparison_windows WHERE building_id=:id',id=bid);self.assertEqual(len(saved),3)
  for item in saved:self.assertIsNone(item['created_by']);self.assertEqual(item['recording_mode'],'automatic');self.assertEqual(item['snapshot']['recording_mode'],'automatic');self.assertFalse(item['snapshot']['money_changed'])
  self.assertEqual(one(c,'SELECT count(*) AS n FROM ledger_transactions WHERE wallet_id IN(:a,:b)',a=devices[0]['wallet']['id'],b=devices[1]['wallet']['id'])['n'],0)
  for role in ('anon','authenticated'):
   for privilege in ('SELECT','INSERT','UPDATE','DELETE'):self.assertFalse(one(c,"SELECT has_table_privilege(:role,'public.energy_comparison_schedules',:privilege) AS allowed",role=role,privilege=privilege)['allowed'])
 self.assertEqual(self.client.get('/api/v1/buildings/'+bid+'/energy-reconciliation/history',headers=self.headers(owner)).json['trend']['status'],'persistent_review')
 self.assertEqual(stop(self,owner,path).status_code,200)
 with self.app.app_context():self.assertEqual(process_due(1,now+timedelta(days=1)),0)
ScheduleIntegration.test_worker_catches_up_once_and_preserves_system_provenance=test_worker_catches_up_once_and_preserves_system_provenance

def test_failed_attempt_keeps_cursor_and_does_not_log_raw_errors(self):
 owner,admin,devices,bid,path,first,span=fixture(self);now=datetime.fromtimestamp((first+span+1000)/1000,timezone.utc)
 def fail_after_write(*args,**kwargs):
  record_window(*args,**kwargs);raise RuntimeError('private-error-must-not-be-stored')
 with self.app.app_context(),patch('app.energy_schedule.record_window',side_effect=fail_after_write):self.assertEqual(process_due(1,now),0)
 with self.app.app_context(),transaction() as c:self.assertEqual(one(c,'SELECT count(*) AS n FROM energy_comparison_windows WHERE building_id=:id',id=bid)['n'],0)
 result=self.client.get(path,headers=self.headers(owner)).json['schedule'];self.assertEqual(result['next_window_end_ms'],first+span);self.assertEqual(result['last_error'],'RuntimeError');self.assertIsNone(result['last_recorded_at'])
 with self.app.app_context():self.assertEqual(process_due(1,now+timedelta(seconds=61)),1)
 cleared=self.client.post('/api/v1/ops/settings/reconciliation.max_gap_ms',headers=self.headers(admin),json={'scope_type':'building','scope_ref':bid,'expected_version':1,'value':None,'effective_from':datetime.fromtimestamp((first-2000)/1000,timezone.utc).isoformat(),'reason':'QA withdraw comparison timing approval'})
 self.assertEqual(cleared.status_code,201,cleared.json)
 with self.app.app_context():self.assertEqual(process_due(1,now+timedelta(minutes=15)),0)
 paused=self.client.get(path,headers=self.headers(owner)).json;self.assertFalse(paused['can_enable']);self.assertEqual(paused['schedule']['last_error'],'comparison_policy_unconfigured');self.assertEqual(paused['schedule']['next_window_end_ms'],first+2*span)
 self.assertEqual(stop(self,owner,path).status_code,200)
ScheduleIntegration.test_failed_attempt_keeps_cursor_and_does_not_log_raw_errors=test_failed_attempt_keeps_cursor_and_does_not_log_raw_errors

def test_concurrent_workers_record_one_window_and_ownership_change_pauses(self):
 owner,admin,devices,bid,path,first,span=fixture(self);now=datetime.fromtimestamp((first+span+1000)/1000,timezone.utc)
 def run():
  with self.app.app_context():return process_due(1,now)
 with ThreadPoolExecutor(max_workers=2) as pool:self.assertEqual(sum(pool.map(lambda _:run(),range(2))),1)
 successor=self.user('landlord')
 with self.app.app_context(),transaction() as c:query(c,'UPDATE buildings SET landlord_id=:uid WHERE id=:id',id=bid,uid=successor['id'])
 with self.app.app_context():self.assertEqual(process_due(1,now+timedelta(minutes=15)),0)
 state=self.client.get(path,headers=self.headers(successor)).json['schedule'];self.assertFalse(state['enabled']);self.assertEqual(state['last_error'],'owner_changed')
 self.assertEqual(self.client.get(path,headers=self.headers(owner)).status_code,404)
ScheduleIntegration.test_concurrent_workers_record_one_window_and_ownership_change_pauses=test_concurrent_workers_record_one_window_and_ownership_change_pauses

import unittest
from app.energy_schedule import worker_settings
class WorkerConfiguration(unittest.TestCase):
 def test_default_and_explicit_capacity(self):
  self.assertEqual(worker_settings({}),(5,30));self.assertEqual(worker_settings({'ENERGY_COMPARISON_SCHEDULER_BATCH_SIZE':'100','ENERGY_COMPARISON_SCHEDULER_TICK_SECONDS':'1'}),(100,1))
 def test_bad_capacity_fails_without_echoing_values(self):
  for value in ('0','101','private-malformed-value'):
   with self.assertRaises(ValueError) as error:worker_settings({'ENERGY_COMPARISON_SCHEDULER_BATCH_SIZE':value})
   self.assertNotIn('private-malformed-value',str(error.exception))
