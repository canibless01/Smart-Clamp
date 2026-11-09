import sys, pathlib, json, hashlib, hmac, base64
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from app import create_app
from app.protocol import sign, verify
import unittest

class ApiTest(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()
        self.key = hashlib.sha256(b"dev-secret-00000000-0000-4000-8000-000000000001").digest()

    def test_meter_validate(self):
        # invalid input
        r=self.client.post('/api/v1/meters/validate', json={'meter_number':'abc'})
        self.assertEqual(r.status_code,400)
        # valid
        r=self.client.post('/api/v1/meters/validate', json={'meter_number':'04217839011'})
        self.assertEqual(r.status_code,200)
        self.assertTrue(r.json['valid'])
        # not found
        r=self.client.post('/api/v1/meters/validate', json={'meter_number':'00000000001'})
        self.assertEqual(r.json['valid'],False)
        # rate limited? provider unavailable
        r=self.client.post('/api/v1/meters/validate', json={'meter_number':'999000111'})
        self.assertEqual(r.status_code,503)

    def test_signup_login(self):
        r=self.client.post('/api/v1/auth/signup', json={'phone':'+2348012345678','password':'password123','full_name':'Test User','role':'tenant'})
        self.assertEqual(r.status_code,200)
        token=r.json['access_token']
        # duplicate
        r2=self.client.post('/api/v1/auth/signup', json={'phone':'+2348012345678','password':'password123','full_name':'Test','role':'tenant'})
        self.assertEqual(r2.status_code,409)
        # login
        r3=self.client.post('/api/v1/auth/login', json={'phone':'+2348012345678','password':'password123'})
        self.assertEqual(r3.status_code,200)
        # privileged role should fail
        r4=self.client.post('/api/v1/auth/signup', json={'phone':'+2348012345679','password':'password123','full_name':'Admin','role':'internal_superadmin'})
        self.assertEqual(r4.status_code,403)

    def test_building_scope(self):
        # signup landlord
        self.client.post('/api/v1/auth/signup', json={'phone':'+2348011111111','password':'password123','full_name':'Landlord','role':'landlord'})
        r=self.client.post('/api/v1/auth/login', json={'phone':'+2348011111111','password':'password123'})
        token=r.json['access_token']
        # create building
        r=self.client.post('/api/v1/buildings', json={'name':'FUTA Lodge','address':'Akure','meter_type':'with_meter'}, headers={'Authorization':f'Bearer {token}'})
        self.assertEqual(r.status_code,200)
        bid=r.json['building_id']
        # add room
        r=self.client.post(f'/api/v1/buildings/{bid}/rooms', json={'label':'Room 1'}, headers={'Authorization':f'Bearer {token}'})
        self.assertEqual(r.status_code,200)
        # cross-tenant check: tenant cannot create building
        self.client.post('/api/v1/auth/signup', json={'phone':'+2348022222222','password':'password123','full_name':'Tenant','role':'tenant'})
        r=self.client.post('/api/v1/auth/login', json={'phone':'+2348022222222','password':'password123'})
        token2=r.json['access_token']
        r=self.client.post('/api/v1/buildings', json={'name':'Hack','address':'X','meter_type':'with_meter'}, headers={'Authorization':f'Bearer {token2}'})
        self.assertEqual(r.status_code,403)

    def test_device_ingest_dedup(self):
        # device envelope via protocol
        payload={'kind':'telemetry','device_id':'00000000-0000-4000-8000-000000000001','key_epoch':1,'boot_id':'a'*32,'seq':1,'occurred_at_ms':1000000,'uptime_ms':1000,'clock_quality':'trusted','config_epoch':1,'role':'house_full','quality':'valid','metrics':{'voltage_mv':230000,'current_ma':5000,'real_power_mw':1150000,'import_mwh':1000,'export_mwh':0}}
        # Use test vector key from contracts/vectors.json? For ingest we derive key per device_id via sha256
        import hashlib
        key=hashlib.sha256(b"dev-secret-00000000-0000-4000-8000-000000000001").digest()
        from app.protocol import sign
        env=sign(payload,key)
        r=self.client.post('/api/v1/device/events', json=env)
        self.assertEqual(r.status_code,200)
        # duplicate same hash should return same ack
        r2=self.client.post('/api/v1/device/events', json=env)
        self.assertEqual(r2.status_code,200)
        self.assertEqual(r.json['payload_sha256'], r2.json['payload_sha256'])
        # conflicting same-seq different hash should 409
        payload2=dict(payload, metrics={'voltage_mv':230000,'current_ma':5001,'real_power_mw':1150000,'import_mwh':1000,'export_mwh':0})
        env2=sign(payload2,key)
        r3=self.client.post('/api/v1/device/events', json=env2)
        self.assertEqual(r3.status_code,409)

    def test_quote_idempotency(self):
        r=self.client.post('/api/v1/payments/quotes', json={'destination_token':'dest_abc','amount_kobo':500000,'utility_type':'electricity'}, headers={'Idempotency-Key':'key123'})
        self.assertEqual(r.status_code,201)
        qid=r.json['id']
        # same key same body should return same
        r2=self.client.post('/api/v1/payments/quotes', json={'destination_token':'dest_abc','amount_kobo':500000,'utility_type':'electricity'}, headers={'Idempotency-Key':'key123'})
        self.assertEqual(r2.status_code,201)
        self.assertEqual(r2.json['id'], qid)
        # same key different body -> 409
        r3=self.client.post('/api/v1/payments/quotes', json={'destination_token':'dest_abc','amount_kobo':600000,'utility_type':'electricity'}, headers={'Idempotency-Key':'key123'})
        self.assertEqual(r3.status_code,409)

    def test_payment_states(self):
        # create quote then checkout
        r=self.client.post('/api/v1/payments/quotes', json={'destination_token':'dest_xyz','amount_kobo':200000,'utility_type':'electricity'}, headers={'Idempotency-Key':'k1'})
        qid=r.json['id']
        r=self.client.post('/api/v1/payments/checkout', json={'quote_id':qid,'return_path':'/payments/return'}, headers={'Idempotency-Key':'k2'})
        self.assertEqual(r.status_code,202)
        pid=r.json['id']
        # get payment requires auth
        self.client.post('/api/v1/auth/signup', json={'phone':'+2348033333333','password':'password123','full_name':'Payer','role':'tenant'})
        r=self.client.post('/api/v1/auth/login', json={'phone':'+2348033333333','password':'password123'})
        token=r.json['access_token']
        r=self.client.get(f'/api/v1/payments/{pid}', headers={'Authorization':f'Bearer {token}'})
        self.assertEqual(r.status_code,200)
        self.assertIn(r.json['payment_state'], ['pending','verified','failed'])

if __name__=='__main__':
    unittest.main()
