"""Actual local GoTrue email-change OTP, delivered only to a non-relaying SMTP sink."""
import os,sys,json,pathlib,uuid,unittest
from test_api import LiveIntegration
from app.db import transaction,one
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[3]/'tools'))
from email_otp_qa import latest_code
class EmailEnrollmentIntegration(LiveIntegration):
 @classmethod
 def setUpClass(cls):
  path=os.environ.get('SMARTCLAMP_EMAIL_QA_CONFIG')
  if not path:raise unittest.SkipTest('Separate real SMTP/GoTrue OTP QA was not requested')
  cls.mail=json.loads(pathlib.Path(path).read_text())
  if not cls.mail.get('email_otp') or not cls.mail['name'].startswith('smartclamp-qa-'):raise RuntimeError('Refusing a non-OTP QA target')
  previous=os.environ.get('SMARTCLAMP_QA_CONFIG');os.environ['SMARTCLAMP_QA_CONFIG']=path
  try:super().setUpClass()
  finally:
   if previous is None:os.environ.pop('SMARTCLAMP_QA_CONFIG',None)
   else:os.environ['SMARTCLAMP_QA_CONFIG']=previous
for name in dir(LiveIntegration):
 if name.startswith('test_'):setattr(EmailEnrollmentIntegration,name,None)
del LiveIntegration

def test_actual_email_otp_rejects_wrong_code_and_never_binds_pending_contact(self):
 owner=self.user('homeowner');address='otp-'+uuid.uuid4().hex+'@example.test';headers=self.headers(owner)
 response=self.client.post('/api/v1/auth/email/enroll',headers=headers,json={'email':address});self.assertEqual(response.status_code,202,response.json)
 context=self.client.get('/api/v1/users/me/context',headers=headers);self.assertIsNone(context.json['authorized_context']['email'])
 code=latest_code(self.mail,address);wrong=str((int(code)+1)%1000000).zfill(6)
 bad=self.client.post('/api/v1/auth/email/verify',headers=headers,json={'email':address,'code':wrong});self.assertGreaterEqual(bad.status_code,400)
 with self.app.app_context(),transaction() as c:self.assertIsNone(one(c,'SELECT email FROM profiles WHERE id=:id',id=owner['id'])['email'])
 verified=self.client.post('/api/v1/auth/email/verify',headers=headers,json={'email':address,'code':code});self.assertEqual(verified.status_code,200,verified.json.get('code'));self.assertEqual(verified.json['status'],'verified')
 current=self.client.get('/api/v1/users/me/context',headers=headers);self.assertEqual(current.json['authorized_context']['email'],address)
 self.assertEqual(self.client.post('/api/v1/auth/login',json={'email':address,'password':owner['password']}).status_code,200)
 self.assertEqual(self.client.post('/api/v1/auth/email/enroll',headers=headers,json={'email':'another-'+uuid.uuid4().hex+'@example.test'}).status_code,409)
EmailEnrollmentIntegration.test_actual_email_otp_rejects_wrong_code_and_never_binds_pending_contact=test_actual_email_otp_rejects_wrong_code_and_never_binds_pending_contact

def test_actual_email_otp_cannot_bind_another_signed_in_account(self):
 owner=self.user('homeowner');other=self.user('homeowner');address='subject-'+uuid.uuid4().hex+'@example.test'
 enrolled=self.client.post('/api/v1/auth/email/enroll',headers=self.headers(owner),json={'email':address});self.assertEqual(enrolled.status_code,202,enrolled.json);code=latest_code(self.mail,address)
 response=self.client.post('/api/v1/auth/email/verify',headers=self.headers(other),json={'email':address,'code':code});self.assertEqual(response.status_code,401,response.json.get('code'))
 with self.app.app_context(),transaction() as c:self.assertIsNone(one(c,'SELECT email FROM profiles WHERE id=:id',id=other['id'])['email'])
EmailEnrollmentIntegration.test_actual_email_otp_cannot_bind_another_signed_in_account=test_actual_email_otp_cannot_bind_another_signed_in_account
