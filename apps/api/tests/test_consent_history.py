"""Own-subject consent history and withdrawals, with real Auth and database."""
from test_api import LiveIntegration
from app.db import transaction,one
class ConsentIntegration(LiveIntegration):pass
for name in dir(LiveIntegration):
 if name.startswith('test_'):setattr(ConsentIntegration,name,None)
del LiveIntegration

def test_own_history_withdrawal_and_versioned_legal_acceptance(self):
 user=self.user();other=self.user();path='/api/v1/users/me/consents'
 self.assertEqual(self.client.get(path).status_code,401)
 initial=self.client.get(path,headers=self.headers(user));self.assertEqual(initial.status_code,200,initial.json);self.assertTrue(initial.json['current_legal_accepted']);self.assertEqual(len(initial.json['acceptances']),1)
 self.assertEqual(self.client.patch('/api/v1/users/me/preferences',headers=self.headers(user),json={'sms_enabled':True,'utility_notices_enabled':True}).status_code,200)
 changed=self.client.get(path,headers=self.headers(user)).json;self.assertEqual(len(changed['history']),1);self.assertTrue(changed['history'][0]['metadata']['changes']['sms_enabled']['after'])
 other_history=self.client.get(path,headers=self.headers(other)).json;self.assertEqual(other_history['history'],[])
 self.assertEqual(self.client.patch('/api/v1/users/me/preferences',headers=self.headers(user),json={'sms_enabled':False,'email_enabled':False,'push_enabled':False,'utility_notices_enabled':False}).status_code,200)
 withdrawn=self.client.get(path,headers=self.headers(user)).json;self.assertFalse(withdrawn['preferences']['sms_enabled']);self.assertEqual(len(withdrawn['history']),2)
 # A no-op does not invent another change or consent timestamp.
 self.client.patch('/api/v1/users/me/preferences',headers=self.headers(user),json={'sms_enabled':False})
 self.assertEqual(len(self.client.get(path,headers=self.headers(user)).json['history']),2)
 self.assertEqual(self.client.get(path+'?before=invalid',headers=self.headers(user)).status_code,400)
 self.app.config['LEGAL_TERMS_VERSION']='qa-new-terms'
 current=self.client.get(path,headers=self.headers(user)).json;self.assertFalse(current['current_legal_accepted'])
 payload={'accepted_terms':False,**current['current_legal']}
 self.assertEqual(self.client.post(path,headers=self.headers(user),json=payload).status_code,400)
 payload['accepted_terms']=True
 accepted=self.client.post(path,headers=self.headers(user),json=payload);self.assertEqual(accepted.status_code,200,accepted.json);self.assertTrue(accepted.json['current_legal_accepted']);self.assertEqual(len(accepted.json['acceptances']),2)
 self.assertEqual(len(self.client.post(path,headers=self.headers(user),json=payload).json['acceptances']),2)
 self.app.config.pop('LEGAL_TERMS_VERSION')
ConsentIntegration.test_own_history_withdrawal_and_versioned_legal_acceptance=test_own_history_withdrawal_and_versioned_legal_acceptance

def test_viewer_can_leave_only_own_grant_and_read_access_ends(self):
 owner=self.user('homeowner');viewer=self.user();stranger=self.user();d=self.provision(owner)
 created=self.client.post('/api/v1/devices/'+d['id']+'/viewers',headers=self.headers(owner),json={'viewer_phone':viewer['phone'],'expires_in_hours':24})
 self.assertEqual(created.status_code,201,created.json);grant=created.json['id']
 listed=self.client.get('/api/v1/users/me/consents',headers=self.headers(viewer)).json['viewer_grants'];self.assertEqual(str(listed[0]['id']),grant);self.assertEqual(listed[0]['direction'],'received')
 endpoint='/api/v1/users/me/viewer-grants/'+grant
 self.assertEqual(self.client.delete(endpoint,headers=self.headers(stranger)).status_code,404)
 self.assertEqual(self.client.get('/api/v1/devices/'+d['id'],headers=self.headers(viewer)).status_code,200)
 self.assertEqual(self.client.delete(endpoint,headers=self.headers(viewer)).status_code,200)
 self.assertEqual(self.client.get('/api/v1/devices/'+d['id'],headers=self.headers(viewer)).status_code,404)
 self.assertEqual(self.client.get('/api/v1/users/me/consents',headers=self.headers(viewer)).json['viewer_grants'],[])
ConsentIntegration.test_viewer_can_leave_only_own_grant_and_read_access_ends=test_viewer_can_leave_only_own_grant_and_read_access_ends
