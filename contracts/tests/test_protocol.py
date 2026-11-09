import sys,pathlib,unittest,json
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]))
from reference_protocol import sign,verify,command_allowed,canonical
class Protocol(unittest.TestCase):
 def setUp(self):
  self.key=bytes(range(32));self.p=dict(kind='relay_command',device_id='00000000-0000-4000-8000-000000000001',key_epoch=1,config_epoch=1,policy_epoch=1,command_id='00000000-0000-4000-8000-000000000002',seq=1,issued_at_s=100,expires_at_s=120,on=True,reason='self',authorization_ref='test')
 def test_golden_vector(self):
  vectors=json.loads((pathlib.Path(__file__).resolve().parents[1]/'vectors.json').read_text());self.assertEqual(sign(vectors['payload'],bytes.fromhex(vectors['test_key_hex'])),vectors['envelope']);self.assertEqual(verify(sign(self.p,self.key),self.key),self.p)
 def test_tampered_body(self):
  e=sign(self.p,self.key);e['payload_b64']=e['payload_b64'][:-1]+'A'
  with self.assertRaises(ValueError):verify(e,self.key)
 def test_wrong_key_target_epoch(self):
  for mutation in [('device_id','another'),('key_epoch',2)]:
   e=sign(self.p,self.key);e[mutation[0]]=mutation[1]
   with self.assertRaises(ValueError):verify(e,self.key)
  with self.assertRaises(ValueError):verify(sign(self.p,self.key),b'x'*32)
 def test_expiry_replay_policy(self):
  kw=dict(device_id=self.p['device_id'],key_epoch=1,config_epoch=1,policy_epoch=1,now=110,last_sequence=0)
  self.assertTrue(command_allowed(self.p,**kw))
  for change in [dict(now=120),dict(now=99),dict(last_sequence=1),dict(policy_epoch=2),dict(config_epoch=2)]:self.assertFalse(command_allowed(self.p,**(kw|change)))
 def test_float_or_noncanonical_rejected(self):
  with self.assertRaises(ValueError):canonical({'volts':1.1})
  with self.assertRaises(ValueError):sign(self.p,b'short')
if __name__=='__main__':unittest.main()
