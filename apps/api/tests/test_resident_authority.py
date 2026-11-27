"""Physical ownership does not grant access to a different resident's controls or wallet."""
from datetime import datetime,timezone,timedelta
from test_api import LiveIntegration
from app.db import transaction,one,query
class ResidentAuthorityIntegration(LiveIntegration):pass
for name in dir(LiveIntegration):
 if name.startswith('test_'):setattr(ResidentAuthorityIntegration,name,None)
del LiveIntegration

def test_occupied_room_owner_is_read_only_and_unallocated_boundary_is_not_charged(self):
 owner=self.user('homeowner');tenant=self.user();d=self.provision(owner);now=datetime.now(timezone.utc)
 with self.app.app_context(),transaction() as c:
  building=one(c,"INSERT INTO buildings(landlord_id,name,address,meter_type) VALUES(:uid,'QA authority','QA','with_meter') RETURNING id",uid=owner['id'])['id']
  room=one(c,"INSERT INTO rooms(building_id,label) VALUES(:building,'QA room') RETURNING id",building=building)['id']
  query(c,'UPDATE devices SET room_id=:room,building_id=:building WHERE id=:id',room=room,building=building,id=d['id'])
 old=self.envelope(d,occurred_at_ms=int((now-timedelta(minutes=2)).timestamp()*1000),metrics={'import_mwh':0})
 self.assertEqual(self.client.post('/api/v1/device/events',json=old).status_code,200);self.drain()
 with self.app.app_context(),transaction() as c:query(c,"INSERT INTO occupancies(room_id,tenant_id,start_at) VALUES(:room,:uid,:start)",room=room,uid=tenant['id'],start=now-timedelta(minutes=1))
 base='/api/v1/devices/'+d['id'];context=self.client.get('/api/v1/users/me/context',headers=self.headers(owner));self.assertEqual(context.status_code,200,context.json);self.assertIsNone(context.json['devices'][0]['wallet']);self.assertFalse(context.json['devices'][0]['access']['can_issue_report']);self.assertFalse(context.json['devices'][0]['access']['can_control']);self.assertFalse(context.json['devices'][0]['controls']['can_request']);self.assertEqual(context.json['devices'][0]['controls']['unavailable_code'],'read_only_device')
 self.assertEqual(self.client.get('/api/v1/wallets/'+str(d['wallet']['id'])+'/ledger',headers=self.headers(owner)).status_code,404)
 self.assertEqual(self.client.get(base+'/viewers',headers=self.headers(owner)).status_code,404)
 self.assertEqual(self.client.get(base+'/automation',headers=self.headers(owner)).status_code,404)
 self.assertEqual(self.client.get('/api/v1/wallets',headers=self.headers(owner)).json['items'],[])
 after=self.envelope(d,occurred_at_ms=int(now.timestamp()*1000),metrics={'import_mwh':5000})
 self.assertEqual(self.client.post('/api/v1/device/events',json=after).status_code,200);self.drain()
 with self.app.app_context(),transaction() as c:
  wallet=one(c,'SELECT unpaid_mwh FROM wallets WHERE device_id=:id',id=d['id']);self.assertEqual(wallet['unpaid_mwh'],0)
  unallocated=one(c,"SELECT metadata FROM audit_log WHERE action='occupancy_boundary_usage_unallocated' AND metadata->>'device_id'=:id",id=d['id']);self.assertEqual(unallocated['metadata']['counter_delta_mwh'],5000)
 fresh=self.envelope(d,occurred_at_ms=int(now.timestamp()*1000)+1,metrics={'import_mwh':6000})
 self.assertEqual(self.client.post('/api/v1/device/events',json=fresh).status_code,200);self.drain()
 with self.app.app_context(),transaction() as c:self.assertEqual(one(c,'SELECT unpaid_mwh FROM wallets WHERE device_id=:id',id=d['id'])['unpaid_mwh'],1000)
 self.assertIsNotNone(self.client.get('/api/v1/users/me/context',headers=self.headers(tenant)).json['devices'][0]['wallet'])
ResidentAuthorityIntegration.test_occupied_room_owner_is_read_only_and_unallocated_boundary_is_not_charged=test_occupied_room_owner_is_read_only_and_unallocated_boundary_is_not_charged
