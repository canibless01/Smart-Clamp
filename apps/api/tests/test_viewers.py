"""Shared reading access against real PostgreSQL/Auth, never production users."""
from datetime import datetime,timezone,timedelta
from test_api import LiveIntegration
from app.db import transaction,query,one
class ViewerIntegration(LiveIntegration):
 pass
# Avoid re-running inherited integration cases in this module.
for name in list(vars(LiveIntegration)):
 if name.startswith('test_'):setattr(ViewerIntegration,name,None)
del LiveIntegration

def test_expiry_revocation_and_private_history(self):
 owner=self.user('homeowner');guest=self.user('homeowner');other=self.user('homeowner');d=self.provision(owner);base='/api/v1/devices/'+d['id'];now=datetime.now(timezone.utc)
 self.assertEqual(self.client.post('/api/v1/device/events',json=self.envelope(d,occurred_at_ms=int((now-timedelta(minutes=1)).timestamp()*1000))).status_code,200)
 for hours in [True,0,8761,'24']:
  self.assertEqual(self.client.post(base+'/viewers',headers=self.headers(owner),json={'viewer_phone':guest['phone'],'expires_in_hours':hours}).status_code,400)
 response=self.client.post(base+'/viewers',headers=self.headers(owner),json={'viewer_phone':guest['phone'],'expires_in_hours':1});self.assertEqual(response.status_code,201,response.json);grant=response.json['id'];self.assertIsNotNone(response.json['expires_at'])
 self.assertEqual(self.client.get(base+'/events',headers=self.headers(guest)).json['items'],[])
 self.assertEqual(self.client.post('/api/v1/device/events',json=self.envelope(d)).status_code,200)
 context=self.client.get('/api/v1/users/me/context',headers=self.headers(guest));self.assertEqual(context.status_code,200,context.json);self.assertEqual(context.json['devices'][0]['electrical']['voltage_v'],230);self.assertIsNone(context.json['devices'][0]['wallet'])
 self.assertEqual(len(self.client.get(base+'/events',headers=self.headers(guest)).json['items']),1)
 detail=self.client.get(base,headers=self.headers(guest));self.assertFalse(detail.json['can_manage_viewers']);self.assertIsNone(detail.json['prepaid_policy'])
 self.assertEqual(self.client.post(base+'/viewers',headers=self.headers(guest),json={'viewer_phone':other['phone']}).status_code,404)
 self.assertEqual(self.client.get('/api/v1/wallets/'+str(d['wallet']['id'])+'/ledger',headers=self.headers(guest)).status_code,404)
 self.assertEqual(self.client.delete(base+'/viewers/'+grant,headers=self.headers(other)).status_code,404)
 with self.app.app_context(),transaction() as c:query(c,"UPDATE device_viewers SET expires_at=now()-interval '1 second' WHERE id=:id",id=grant)
 self.assertEqual(self.client.get(base,headers=self.headers(guest)).status_code,404)
 regrant=self.client.post(base+'/viewers',headers=self.headers(owner),json={'viewer_phone':guest['phone'],'expires_in_hours':None});self.assertEqual(regrant.status_code,201,regrant.json);self.assertIsNone(regrant.json['expires_at'])
 self.assertEqual(self.client.get(base+'/events',headers=self.headers(guest)).json['items'],[])
 self.assertEqual(self.client.delete(base+'/viewers/'+grant,headers=self.headers(owner)).status_code,200)
 self.assertEqual(self.client.get(base,headers=self.headers(guest)).status_code,404)
 self.assertEqual(self.client.delete(base+'/viewers/'+grant,headers=self.headers(owner)).status_code,404)
ViewerIntegration.test_expiry_revocation_and_private_history=test_expiry_revocation_and_private_history

def test_resident_manages_room_sharing(self):
 landlord=self.user('landlord');tenant=self.user();guest=self.user('homeowner');d=self.provision(landlord)
 with self.app.app_context(),transaction() as c:
  building=one(c,"INSERT INTO buildings(landlord_id,name,address,meter_type) VALUES(:uid,'Sharing QA','QA','with_meter') RETURNING id",uid=landlord['id'])['id']
  room=one(c,"INSERT INTO rooms(building_id,label) VALUES(:id,'Room') RETURNING id",id=building)['id']
  query(c,'UPDATE devices SET room_id=:room,building_id=:building WHERE id=:id',room=room,building=building,id=d['id']);query(c,'INSERT INTO occupancies(room_id,tenant_id) VALUES(:room,:uid)',room=room,uid=tenant['id'])
 base='/api/v1/devices/'+d['id']+'/viewers'
 self.assertEqual(self.client.post(base,headers=self.headers(landlord),json={'viewer_phone':guest['phone']}).status_code,404)
 self.assertFalse(self.client.get('/api/v1/devices/'+d['id'],headers=self.headers(landlord)).json['can_manage_viewers'])
 response=self.client.post(base,headers=self.headers(tenant),json={'viewer_phone':guest['phone'],'expires_in_hours':24});self.assertEqual(response.status_code,201,response.json)
ViewerIntegration.test_resident_manages_room_sharing=test_resident_manages_room_sharing
