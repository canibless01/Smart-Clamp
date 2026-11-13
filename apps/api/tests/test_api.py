"""Integration tests: actual PostgreSQL and GoTrue. Test-only HTTP fixtures exercise provider contracts.
No application endpoint contains a test-mode success provider. Set SMARTCLAMP_QA_CONFIG to an
isolated qa_services.py config; absence is explicitly skipped, not a readiness pass.
"""
import sys,pathlib,json,os,uuid,hashlib,hmac,threading,unittest,secrets
from urllib.parse import parse_qs
from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
from datetime import datetime,timezone,timedelta
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]))
from app import create_app
from app.protocol import sign,canonical
from app.db import transaction,one,query,scalar,rows
from app.work import run_once
from cryptography.fernet import Fernet

class ProviderFixture(BaseHTTPRequestHandler):
    """Only in tests; never import this from runtime code."""
    records={};vends=0;vend_requests=[];token=None;sms_requests=[];sms_mode="accepted";vend_records={};vend_units=None;omit_token=False;key_changes={};init_mode="success";initializations=0
    def log_message(self,*args):pass
    def send(self,data,code=200):
        content=json.dumps(data).encode();self.send_response(code);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(content)));self.end_headers();self.wfile.write(content)
    def do_POST(self):
        raw=self.rfile.read(int(self.headers.get('Content-Length','0')))
        if self.path=='/messaging':
            d={k:v[0] for k,v in parse_qs(raw.decode()).items()};type(self).sms_requests.append(d)
            if self.sms_mode=='unknown':self.close_connection=True;return
            return self.send({'SMSMessageData':{'Recipients':[{'number':d['to'],'statusCode':101,'messageId':'test-sms-'+str(len(self.sms_requests))}]}})
        d=json.loads(raw or b'{}')
        if self.path=='/transaction/initialize':
            type(self).initializations+=1
            self.records[d['reference']]={'reference':d['reference'],'amount':d['amount'],'currency':'NGN','status':'pending' if self.init_mode=='pending' else 'success'}
            if self.init_mode=='disconnect':self.close_connection=True;return
            return self.send({'status':True,'data':{'reference':d['reference'],'authorization_url':'https://checkout.paystack.com/'+d['reference']}})
        if self.path=='/merchant-verify':return self.send({'code':'000','content':{'Customer_Name':'Private Example Person'}})
        if self.path in('/pay','/requery'):
            from decimal import Decimal
            type(self).vends+=1;type(self).vend_requests.append(d['request_id'])
            if self.path=='/pay':type(self).vend_records[d['request_id']]=d
            prior=self.vend_records[d['request_id']]
            response={'code':'000','content':{'transactions':{'status':'delivered'}},'requestId':d['request_id'],'amount':prior['amount'],'units':self.vend_units if self.vend_units is not None else str(Decimal(prior['amount'])/100)+' kWh'}
            if not self.omit_token:response['purchased_code']=self.token or str(int(hashlib.sha256(d['request_id'].encode()).hexdigest(),16)%(10**20)).zfill(20)
            response.update(self.key_changes)
            return self.send(response)
        self.send({},404)
    def do_GET(self):
        ref=self.path.rsplit('/',1)[-1]
        if ref in self.records:return self.send({'status':True,'data':self.records[ref]})
        self.send({},404)

class LiveIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        path=os.environ.get('SMARTCLAMP_QA_CONFIG')
        if not path:raise unittest.SkipTest('SMARTCLAMP_QA_CONFIG required: real database/auth integration was not run')
        q=json.loads(pathlib.Path(path).read_text())
        if not q['name'].startswith('smartclamp-qa-'):raise RuntimeError('Refusing a non-QA target')
        cls.qa=q;cls.key=Fernet.generate_key();cls.http=ThreadingHTTPServer(('127.0.0.1',0),ProviderFixture);cls.thread=threading.Thread(target=cls.http.serve_forever,daemon=True);cls.thread.start();provider='http://127.0.0.1:'+str(cls.http.server_port)
        cls.settings={'TESTING':True,'DATABASE_URL':f"postgresql://postgres:{q['password']}@127.0.0.1:{q['port']}/smartclamp",'SUPABASE_AUTH_URL':f"http://127.0.0.1:{q.get('auth_port',15433)}",'SUPABASE_ANON_KEY':q['anon_key'],'DEVICE_HMAC_ENCRYPTION_KEY':cls.key.decode(),'PAYSTACK_API_URL':provider,'VTPASS_API_URL':provider,'PAYSTACK_SECRET_KEY':'test-fixture-not-a-merchant-key','VTPASS_API_KEY':'test-only','VTPASS_SECRET_KEY':'test-only','VTPASS_ELECTRICITY_SERVICE_ID':'test-electricity','APP_ORIGIN':'http://localhost:3000','PAYMENT_FEE_BPS':'0','PAYMENT_FIXED_FEE_KOBO':'0','PLATFORM_MARKUP_BPS':'0'}
        cls.app=create_app(cls.settings)
    @classmethod
    def tearDownClass(cls):cls.http.shutdown();cls.http.server_close();cls.app.db_engine.dispose()
    def setUp(self):
        self.client=self.app.test_client();self.users=[];ProviderFixture.token=None;ProviderFixture.vend_units=None;ProviderFixture.omit_token=False;ProviderFixture.key_changes={};ProviderFixture.init_mode="success"
    def user(self,role='tenant'):
        phone='+1555'+str(secrets.randbelow(9000000)+1000000);pwd='A-real-QA-password-42'
        from app.live_auth import legal_versions
        with self.app.app_context():consent={'accepted_terms':True,**legal_versions()}
        r=self.client.post('/api/v1/auth/signup',json={'phone':phone,'password':pwd,'full_name':'Integration test account','role':role,**consent})
        self.assertEqual(r.status_code,200,r.json)
        u={'id':r.json['user_id'],'token':r.json['access_token'],'phone':phone,'password':pwd,'role':role};self.users.append(u);return u
    def headers(self,u,key=None):return {'Authorization':'Bearer '+u['token'],'Idempotency-Key':key or str(uuid.uuid4())}
    def provision(self,u,profile='house_full'):
        did=str(uuid.uuid4());telemetry=secrets.token_bytes(32);command=secrets.token_bytes(32);meter=str(uuid.uuid4());rate='qa-'+uuid.uuid4().hex
        with self.app.app_context(),transaction() as c:
            query(c,"INSERT INTO linked_meters(id,owner_id,meter_number,disco_name,provider,status) VALUES(:id,:uid,:number,'test-electricity','vtpass','pending')",id=meter,uid=u['id'],number='00'+str(secrets.randbelow(1000000000)).zfill(9))
            query(c,"INSERT INTO devices(id,profile,capabilities,owner_id,linked_meter_id,install_state,calibration_status,last_seen_at) VALUES(:id,:profile,ARRAY['metering','relay'],:uid,:meter,'commissioned','qualified',now())",id=did,profile=profile,uid=u['id'],meter=meter)
            for direction,key in [('telemetry',telemetry),('command',command)]:query(c,'INSERT INTO private.device_credentials(device_id,key_epoch,direction,encrypted_secret) VALUES(:id,1,:direction,:secret)',id=did,direction=direction,secret=Fernet(self.key).encrypt(key).decode())
            query(c,'INSERT INTO tariffs(provider,version,effective_from,day_rate_kobo_per_kwh) VALUES(\'qa-provider\',:version,now(),10000)',version=rate)
            w=one(c,'INSERT INTO wallets(device_id,tariff_version) VALUES(:id,:rate) RETURNING *',id=did,rate=rate)
        return {'id':did,'key':telemetry,'command_key':command,'boot':secrets.token_hex(16),'seq':0,'wallet':dict(w)}
    def envelope(self,d,kind='telemetry',**extra):
        d['seq']+=1;p={'kind':kind,'device_id':d['id'],'key_epoch':1,'boot_id':d['boot'],'seq':d['seq'],'uptime_ms':d['seq']*1000,'config_epoch':1,'occurred_at_ms':int(datetime.now(timezone.utc).timestamp()*1000),'clock_quality':'trusted','role':'house_full','quality':'valid','metrics':{'voltage_mv':230000,'current_ma':5000,'real_power_mw':1150000,'import_mwh':0,'export_mwh':0}}
        p.update(extra);return sign(p,d['key'])
    def drain(self):
        with self.app.app_context():
            for i in range(100):
                if not run_once():return
        self.fail('Outbox did not drain')
    def payment(self,u,d):
        q=self.client.post('/api/v1/payments/quotes',json={'destination_token':d['wallet']['payment_token'],'amount_kobo':50000,'utility_type':'electricity'},headers=self.headers(u));self.assertEqual(q.status_code,201,q.json)
        check=self.client.post('/api/v1/payments/checkout',json={'quote_id':q.json['id'],'payer_email':'qa@example.test','return_path':'/payments/return'},headers=self.headers(u));self.assertEqual(check.status_code,202,check.json)
        with self.app.app_context(),transaction() as c:p=one(c,'SELECT * FROM payments WHERE id=:id',id=check.json['id'])
        return dict(p)
    def signed_webhook(self,p,amount=None):
        raw=json.dumps({'event':'charge.success','data':{'reference':p['provider_reference']}}).encode();sig=hmac.new(self.settings['PAYSTACK_SECRET_KEY'].encode(),raw,hashlib.sha512).hexdigest()
        return self.client.post('/api/v1/webhooks/payment',data=raw,content_type='application/json',headers={'x-paystack-signature':sig})
    def attest(self,u,p):
        result=self.client.post('/api/v1/payments/'+str(p['id'])+'/confirm-meter-entry',json={'confirmed':True},headers=self.headers(u))
        self.assertEqual(result.status_code,200,result.json)
    def test_real_auth_rejects_wrong_password_and_persists_restart(self):
        u=self.user();bad=self.client.post('/api/v1/auth/login',json={'phone':u['phone'],'password':'wrong-password'});self.assertEqual(bad.status_code,401)
        other=create_app(self.settings);r=other.test_client().post('/api/v1/auth/login',json={'phone':u['phone'],'password':u['password']});self.assertEqual(r.status_code,200,r.json);self.assertEqual(r.json['user_id'],u['id']);other.db_engine.dispose()
    def test_explicit_consent_and_email_password_identity(self):
        from app.live_auth import legal_versions
        from app.providers import auth_request
        with self.app.app_context():
            versions=legal_versions();enabled=(auth_request('settings').get('external') or {}).get('email')
        if not enabled:self.skipTest('Requires the isolated email-enabled GoTrue QA stack')
        body={'email':'qa-'+uuid.uuid4().hex+'@example.test','password':'QA-email-password-42','role':'homeowner','full_name':'Email QA account',**versions}
        self.assertEqual(self.client.post('/api/v1/auth/signup',json=body).json['code'],'consent_required')
        self.assertEqual(self.client.post('/api/v1/auth/signup',json=body|{'accepted_terms':True,'terms_version':'outdated'}).status_code,400)
        created=self.client.post('/api/v1/auth/signup',json=body|{'accepted_terms':True});self.assertEqual(created.status_code,200,created.json)
        self.assertFalse(created.json['onboarding_required'])
        login=self.client.post('/api/v1/auth/login',json={'email':body['email'].upper(),'password':body['password']});self.assertEqual(login.status_code,200,login.json)
        u={'id':created.json['user_id'],'token':login.json['access_token']}
        profile=self.client.get('/api/v1/users/me/context',headers=self.headers(u));self.assertEqual(profile.status_code,200);self.assertIsNone(profile.json['authorized_context']['phone']);self.assertEqual(profile.json['authorized_context']['email'],body['email'])
        self.assertEqual(self.client.post('/api/v1/payments/checkout',json={},headers=self.headers(u)).json['code'],'phone_verification_required')
        self.assertEqual(self.client.post('/api/v1/auth/step-up/challenges',json={},headers=self.headers(u)).json['code'],'phone_verification_required')
        with self.app.app_context(),transaction() as c:
            self.assertEqual(scalar(c,'SELECT count(*) FROM account_consents WHERE user_id=:id',id=u['id']),1)
    def test_verified_external_identity_requires_profile_consent_and_cannot_choose_staff(self):
        from app.providers import auth_request
        from app.live_auth import legal_versions
        with self.app.app_context():
            if not (auth_request('settings').get('external') or {}).get('email'):self.skipTest('Requires email-enabled QA GoTrue')
            result=auth_request('signup','POST',{'email':'external-'+uuid.uuid4().hex+'@example.test','password':'QA-external-password-42'})
            versions=legal_versions()
        u={'id':result['user']['id'],'token':result['access_token']};h=self.headers(u)
        self.assertEqual(self.client.get('/api/v1/users/me/context',headers=h).json['code'],'profile_required')
        refresh=self.client.post('/api/v1/auth/refresh',json={'refresh_token':result['refresh_token']});self.assertEqual(refresh.status_code,200);self.assertTrue(refresh.json['onboarding_required'])
        self.assertEqual(self.client.get('/api/v1/auth/onboarding',headers=h).status_code,200)
        body={'full_name':'External identity QA','role':'internal_superadmin','accepted_terms':True,**versions}
        self.assertEqual(self.client.post('/api/v1/auth/onboarding',json=body,headers=h).status_code,403)
        body['role']='tenant';body['accepted_terms']=False
        self.assertEqual(self.client.post('/api/v1/auth/onboarding',json=body,headers=h).json['code'],'consent_required')
        body['accepted_terms']=True
        self.assertEqual(self.client.post('/api/v1/auth/onboarding',json=body,headers=h).status_code,200)
        body['role']='internal_superadmin'
        self.assertEqual(self.client.post('/api/v1/auth/onboarding',json=body,headers=h).json['role'],'tenant')
        self.assertEqual(self.client.get('/api/v1/users/me/context',headers=h).status_code,200)
        with self.app.app_context(),transaction() as c:
            self.assertEqual(scalar(c,'SELECT count(*) FROM account_consents WHERE user_id=:id',id=u['id']),1)
    def test_google_start_is_pkce_bound_to_fixed_origin_and_configuration(self):
        from unittest.mock import patch
        from urllib.parse import urlparse,parse_qs
        body={'code_challenge':'a'*43,'flow_id':'b'*64,'redirect_to':'https://untrusted.example/steal'}
        self.assertEqual(self.client.post('/api/v1/auth/oauth/start',json=body).status_code,503)
        with patch('app.live_auth.auth_request',return_value={'external':{'google':True}}):
            response=self.client.post('/api/v1/auth/oauth/start',json=body)
            self.assertEqual(response.status_code,200,response.json);params=parse_qs(urlparse(response.json['url']).query)
            self.assertEqual(params['redirect_to'],['http://localhost:3000/auth/callback?flow_id='+'b'*64]);self.assertEqual(params['code_challenge_method'],['s256'])
            self.assertEqual(self.client.post('/api/v1/auth/oauth/start',json=body|{'flow_id':'bad'}).status_code,400)
        self.assertEqual(self.client.post('/api/v1/auth/oauth/exchange',json={'code':'x','code_verifier':'bad'}).status_code,400)
    def test_privileged_role_cannot_self_register(self):
        for role in('internal_superadmin','nepa_staff','installer'):
            r=self.client.post('/api/v1/auth/signup',json={'phone':'+15550001001','password':'valid-password-123','full_name':'No privileges','role':role});self.assertEqual(r.status_code,403)
    def test_building_scope_idempotency_and_durable_support(self):
        owner=self.user('landlord');stranger=self.user('landlord');headers=self.headers(owner);body={'name':'Real persistent building','address':'QA fixture address','meter_type':'with_meter'}
        first=self.client.post('/api/v1/buildings',json=body,headers=headers);self.assertEqual(first.status_code,201,first.json)
        again=self.client.post('/api/v1/buildings',json=body,headers=headers);self.assertEqual(first.json,again.json)
        conflict=self.client.post('/api/v1/buildings',json=body|{'name':'Different'},headers=headers);self.assertEqual(conflict.status_code,409)
        bid=first.json['building_id'];deny=self.client.get(f'/api/v1/buildings/{bid}/rooms',headers=self.headers(stranger));self.assertEqual(deny.status_code,404)
        ticket=self.client.post('/api/v1/support/tickets',json={'category':'device','subject':'Saved support request','message':'Persistence test'},headers=self.headers(owner));self.assertEqual(ticket.status_code,201,ticket.json)
        restarted=create_app(self.settings);result=restarted.test_client().get('/api/v1/support/tickets/'+ticket.json['id'],headers=self.headers(owner));self.assertEqual(result.status_code,200);self.assertEqual(result.json['subject'],'Saved support request');restarted.db_engine.dispose()
        self.assertEqual(self.client.get('/api/v1/support/tickets/'+ticket.json['id'],headers=self.headers(stranger)).status_code,404)
    def test_new_account_has_no_invented_readings_or_balances(self):
        u=self.user();r=self.client.get('/api/v1/dashboard/tenant',headers=self.headers(u));self.assertEqual(r.status_code,200);self.assertEqual(r.json['devices'],[])
        self.assertEqual(self.client.get('/api/v1/alerts',headers=self.headers(u)).json['items'],[])
    def test_unconfigured_provider_never_fabricates_meter(self):
        settings=self.settings|{'VTPASS_API_KEY':''};app=create_app(settings);r=app.test_client().post('/api/v1/meters/validate',json={'meter_number':'04217839011'});self.assertEqual(r.status_code,503);self.assertNotIn('valid',r.json);app.db_engine.dispose()
    def test_signed_telemetry_durable_ack_conflict_and_worker_dedup(self):
        u=self.user();d=self.provision(u);env=self.envelope(d)
        first=self.client.post('/api/v1/device/events',json=env);self.assertEqual(first.status_code,200,first.json)
        self.assertEqual(self.client.post('/api/v1/device/events',json=env).json,first.json)
        altered=json.loads(__import__('base64').urlsafe_b64decode(env['payload_b64']+'='*((-len(env['payload_b64']))%4)));altered['metrics']['current_ma']=5
        self.assertEqual(self.client.post('/api/v1/device/events',json=sign(altered,d['key'])).status_code,409)
        tampered=env|{'signature':'0'*64};self.assertEqual(self.client.post('/api/v1/device/events',json=tampered).status_code,401)
        self.drain()
        with self.app.app_context(),transaction() as c:
            self.assertEqual(scalar(c,'SELECT count(*) FROM readings WHERE device_id=:id',id=d['id']),1);self.assertEqual(scalar(c,'SELECT count(*) FROM usage_postings u JOIN readings r ON u.reading_id=r.id WHERE r.device_id=:id',id=d['id']),1)
    def test_forged_webhook_cannot_credit_and_real_signature_credits_once(self):
        u=self.user();d=self.provision(u);p=self.payment(u,d);before=ProviderFixture.vends
        bad=self.client.post('/api/v1/webhooks/payment',json={'event':'charge.success','data':{'reference':p['provider_reference']}});self.assertEqual(bad.status_code,401)
        self.assertEqual(self.signed_webhook(p).status_code,200);self.assertEqual(self.signed_webhook(p).json['status'],'already_processed');self.drain();self.attest(u,p)
        with self.app.app_context(),transaction() as c:
            wallet=one(c,'SELECT * FROM wallets WHERE id=:id',id=d['wallet']['id']);self.assertEqual(wallet['available_mwh'],5000000);self.assertEqual(wallet['reserved_mwh'],0)
            self.assertEqual(scalar(c,'SELECT count(*) FROM ledger_transactions WHERE provider_reference=:ref',ref='credit:'+str(p['id'])),1)
        self.assertEqual(ProviderFixture.vends-before,1)
    def test_wrong_verified_amount_rejected(self):
        u=self.user();d=self.provision(u);p=self.payment(u,d);ProviderFixture.records[p['provider_reference']]['amount']=1
        self.assertEqual(self.signed_webhook(p).status_code,409)
        with self.app.app_context(),transaction() as c:self.assertEqual(scalar(c,'SELECT available_mwh FROM wallets WHERE id=:id',id=d['wallet']['id']),0)
    def test_receipts_are_owned_by_payer(self):
        a=self.user();b=self.user();d=self.provision(a);p=self.payment(a,d)
        self.assertEqual(self.client.get('/api/v1/payments/'+str(p['id']),headers=self.headers(b)).status_code,404)
    def test_sts_token_requires_separate_entry_attestation(self):
        u=self.user();d=self.provision(u);ProviderFixture.token='00000000000000000001';ProviderFixture.key_changes={'kct1':'00000000000000000002','kct2':'00000000000000000003'};p=self.payment(u,d);self.assertEqual(self.signed_webhook(p).status_code,200);self.drain()
        with self.app.app_context(),transaction() as c:self.assertEqual(scalar(c,'SELECT available_mwh FROM wallets WHERE id=:id',id=d['wallet']['id']),0)
        receipt=self.client.get('/api/v1/public/payments/'+p['status_token']).json;self.assertEqual(receipt['meter_token'],'00000000000000000001');self.assertEqual([t['token'] for t in receipt['key_change_tokens']],['00000000000000000002','00000000000000000003'])
        r=self.client.post('/api/v1/payments/'+str(p['id'])+'/confirm-meter-entry',json={'confirmed':True},headers=self.headers(u));self.assertEqual(r.status_code,200,r.json)
        with self.app.app_context(),transaction() as c:self.assertEqual(scalar(c,'SELECT available_mwh FROM wallets WHERE id=:id',id=d['wallet']['id']),5000000)
        recovered=self.client.get('/api/v1/payments/'+str(p['id']),headers=self.headers(u));self.assertEqual(recovered.json['meter_token'],'00000000000000000001');self.assertEqual(len(recovered.json['key_change_tokens']),2)
    def test_command_requires_step_up_and_signed_physical_receipt(self):
        u=self.user();d=self.provision(u);target={'device_id':d['id'],'state':'off'}
        with self.app.app_context(),transaction() as c:query(c,"UPDATE feature_flags SET enabled_globally=true WHERE key='pro_relay_control'")
        with self.app.app_context(),transaction() as c:
            ch=one(c,'INSERT INTO step_up_challenges(user_id,operation_hash,scope_ids,verified_at) VALUES(:uid,:hash,CAST(:ids AS uuid[]),now()) RETURNING id',uid=u['id'],hash=hashlib.sha256(canonical(target)).hexdigest(),ids=[d['id']])
        r=self.client.post('/api/v1/devices/'+d['id']+'/relay',json={'state':'off','authorization_ref':str(ch['id'])},headers=self.headers(u));self.assertEqual(r.status_code,202,r.json)
        poll=self.client.post('/api/v1/device/poll',json=self.envelope(d,'poll'));self.assertEqual(poll.status_code,200,poll.json);self.assertEqual(len(poll.json['commands']),1)
        from app.protocol import verify
        cmd=verify(poll.json['commands'][0],d['command_key']);self.assertFalse(cmd['on'])
        receipt=self.envelope(d,'command_receipt',command_id=cmd['command_id'],command_seq=cmd['seq'],result='applied',observed_on=False,observed_at_ms=int(datetime.now(timezone.utc).timestamp()*1000))
        result=self.client.post('/api/v1/device/receipts',json=receipt);self.assertEqual(result.status_code,200,result.json)
        activity=self.client.get('/api/v1/devices/'+d['id']+'/commands',headers=self.headers(u));self.assertEqual(activity.json['items'][0]['status'],'applied')
        replay=self.client.post('/api/v1/devices/'+d['id']+'/relay',json={'state':'off','authorization_ref':str(ch['id'])},headers=self.headers(u));self.assertEqual(replay.status_code,403)

    def promote(self,u,role):
        with self.app.app_context(),transaction() as c:query(c,'UPDATE profiles SET role=:role WHERE id=:id',role=role,id=u['id'])
        u['role']=role;return u
    def test_landlord_room_invitation_claim_and_tenant_measurement_journey(self):
        landlord=self.user('landlord');tenant=self.user();outsider=self.user();ops=self.promote(self.user('homeowner'),'internal_ops')
        bid=self.client.post('/api/v1/buildings',json={'name':'Journey house','address':'QA only','meter_type':'with_meter'},headers=self.headers(landlord)).json['building_id']
        rr=self.client.post(f'/api/v1/buildings/{bid}/rooms',json={'label':'Room A'},headers=self.headers(landlord));self.assertEqual(rr.status_code,201,rr.json);rid=rr.json['room_id']
        dev=self.provision(landlord)
        with self.app.app_context(),transaction() as c:query(c,'UPDATE devices SET owner_id=NULL WHERE id=:id',id=dev['id'])
        code=self.client.post('/api/v1/ops/devices/'+dev['id']+'/claim-code',json={},headers=self.headers(ops));self.assertEqual(code.status_code,201,code.json)
        claimed=self.client.post('/api/v1/devices/claim',json={'claim_code':code.json['claim_code'],'room_id':rid},headers=self.headers(landlord));self.assertEqual(claimed.status_code,201,claimed.json)
        reuse=self.client.post('/api/v1/devices/claim',json={'claim_code':code.json['claim_code']},headers=self.headers(landlord));self.assertEqual(reuse.status_code,404)
        invite=self.client.post(f'/api/v1/rooms/{rid}/invitations',json={},headers=self.headers(landlord));self.assertEqual(invite.status_code,201,invite.json)
        token=invite.json['invite_link'].split('token=')[1];join=self.client.post('/api/v1/invitations/accept',json={'token':token},headers=self.headers(tenant));self.assertEqual(join.status_code,200,join.json)
        self.assertEqual(self.client.post('/api/v1/invitations/accept',json={'token':token},headers=self.headers(outsider)).status_code,404)
        event=self.envelope(dev);self.assertEqual(self.client.post('/api/v1/device/events',json=event).status_code,200);self.drain()
        room=self.client.get(f'/api/v1/buildings/{bid}/rooms',headers=self.headers(landlord)).json['items'][0];self.assertEqual(room['tenant_id'],tenant['id']);self.assertEqual(room['device_id'],dev['id'])
        for user in(landlord,tenant):
            context=self.client.get('/api/v1/users/me/context',headers=self.headers(user));self.assertEqual(context.status_code,200,context.json);self.assertIn(dev['id'],[d['id'] for d in context.json['devices']]);self.assertEqual(context.json['devices'][0]['measurement']['value'],1150)
        self.assertEqual(self.client.get('/api/v1/devices/'+dev['id']+'/events',headers=self.headers(outsider)).status_code,404)
    def test_owner_payment_usage_and_late_readings_journey(self):
        owner=self.user('homeowner');d=self.provision(owner);p=self.payment(owner,d);self.assertEqual(self.signed_webhook(p).status_code,200);self.drain();self.attest(owner,p)
        base=int(datetime.now(timezone.utc).timestamp()*1000)-10000
        for at,counter in[(base,0),(base+4000,1000000),(base+2000,500000),(base+6000,2000000)]:
            env=self.envelope(d,occurred_at_ms=at,metrics={'voltage_mv':230000,'real_power_mw':1000000,'import_mwh':counter});r=self.client.post('/api/v1/device/events',json=env);self.assertEqual(r.status_code,200,r.json);self.drain()
        dashboard=self.client.get('/api/v1/dashboard/homeowner',headers=self.headers(owner));self.assertEqual(dashboard.status_code,200);self.assertEqual(dashboard.json['devices'][0]['wallet']['available_mwh'],3000000);self.assertEqual([p['kwh'] for p in dashboard.json['usage_history']],[1.0,1.0])
        with self.app.app_context(),transaction() as c:
            self.assertEqual(scalar(c,'SELECT sum(consumed_mwh) FROM usage_postings WHERE wallet_id=:id',id=d['wallet']['id']),2000000)
            balances=rows(c,"SELECT sum(CASE WHEN direction='debit' THEN amount_kobo ELSE -amount_kobo END) cash,sum(CASE WHEN direction='debit' THEN energy_mwh ELSE -energy_mwh END) energy FROM ledger_entries WHERE wallet_id=:id GROUP BY transaction_id",id=d['wallet']['id'])
            self.assertTrue(all((x['cash'] or 0)==0 and (x['energy'] or 0)==0 for x in balances))
    def test_outage_recovery_tamper_and_protection_are_visible_without_false_confirmation(self):
        owner=self.user('homeowner');d=self.provision(owner)
        for kind in('supply_lost','supply_lost','supply_returned','tamper','protection'):
            env=self.envelope(d,kind);r=self.client.post('/api/v1/device/events',json=env);self.assertEqual(r.status_code,200,r.json);self.drain()
        feed=self.client.get('/api/v1/alerts',headers=self.headers(owner));keys=[x['template_key'] for x in feed.json['items']]
        self.assertEqual(keys.count('supply.lost'),1);self.assertEqual(keys.count('supply.restored'),1);self.assertIn('tamper',keys);self.assertIn('protection',keys)
        context=self.client.get('/api/v1/users/me/context',headers=self.headers(owner)).json['devices'][0]
        self.assertIn('protection',context['relay']['off_reasons']);self.assertIsNone(context['relay']['observed'])
    def test_utility_scoped_signal_review_and_internal_repair_metrics(self):
        owner=self.user('homeowner');d=self.provision(owner);other=self.provision(owner);ops=self.promote(self.user('homeowner'),'internal_ops');utility=self.promote(self.user('homeowner'),'nepa_staff')
        denied=self.client.get('/api/v1/dashboard/utility',headers=self.headers(utility));self.assertEqual(denied.status_code,403)
        with self.app.app_context(),transaction() as c:
            org=one(c,'INSERT INTO organizations(name,subdomain) VALUES(:name,:sub) RETURNING id',name='QA utility',sub='qa-'+uuid.uuid4().hex[:16])
            query(c,"INSERT INTO memberships(user_id,role,organization_id) VALUES(:uid,'nepa_staff',:org)",uid=utility['id'],org=org['id'])
            query(c,'INSERT INTO utility_device_scopes(organization_id,device_id,granted_by) VALUES(:org,:did,:uid)',org=org['id'],did=d['id'],uid=ops['id'])
        for dev in(d,other):self.assertEqual(self.client.post('/api/v1/device/events',json=self.envelope(dev,'tamper')).status_code,200)
        self.drain();view=self.client.get('/api/v1/dashboard/utility',headers=self.headers(utility));self.assertEqual(view.status_code,200,view.json);self.assertEqual([x['id'] for x in view.json['devices']],[d['id']]);self.assertEqual(len(view.json['signals']),1);self.assertFalse(view.json['customer_identity_included'])
        self.assertEqual(self.client.get('/api/v1/ops/summary',headers=self.headers(owner)).status_code,403)
        job=self.client.post('/api/v1/ops/jobs',json={'device_id':d['id'],'kind':'repair'},headers=self.headers(ops));self.assertEqual(job.status_code,201,job.json)
        summary=self.client.get('/api/v1/ops/summary',headers=self.headers(ops));self.assertEqual(summary.status_code,200,summary.json);self.assertIn(job.json['id'],[x['id'] for x in summary.json['jobs']])

    def test_recharge_preserves_protection_until_qualified_device_clearance(self):
        owner=self.user('homeowner');d=self.provision(owner)
        trip=self.envelope(d,'protection');self.assertEqual(self.client.post('/api/v1/device/events',json=trip).status_code,200);self.drain()
        with self.app.app_context(),transaction() as c:query(c,"INSERT INTO off_reasons(device_id,reason,scope) VALUES(:id,'wallet_zero','prepaid')",id=d['id'])
        p=self.payment(owner,d);self.assertEqual(self.signed_webhook(p).status_code,200);self.drain();self.attest(owner,p)
        context=self.client.get('/api/v1/users/me/context',headers=self.headers(owner)).json['devices'][0]
        self.assertIn('protection',context['relay']['off_reasons']);self.assertNotIn('wallet_zero',context['relay']['off_reasons']);self.assertIsNone(context['relay']['observed'])
        unsafe=self.envelope(d,'protection',active=False,stable_duration_ms=1000);self.assertEqual(self.client.post('/api/v1/device/events',json=unsafe).status_code,409)
        safe=self.envelope(d,'protection',active=False,stable_duration_ms=300000);r=self.client.post('/api/v1/device/events',json=safe);self.assertEqual(r.status_code,200,r.json);self.drain()
        context=self.client.get('/api/v1/users/me/context',headers=self.headers(owner)).json['devices'][0];self.assertNotIn('protection',context['relay']['off_reasons']);self.assertIsNone(context['relay']['observed'])
    def test_provider_selection_and_water_launch_gate(self):
        settings=self.settings|{'VTPASS_ELECTRICITY_SERVICES_JSON':json.dumps([{'id':'test-electricity','name':'QA provider A'},{'id':'another-electricity','name':'QA provider B'}])};app=create_app(settings);client=app.test_client()
        options=client.get('/api/v1/public/electricity-providers');self.assertEqual(len(options.json['items']),2)
        self.assertEqual(client.post('/api/v1/meters/validate',json={'meter_number':'004217839011'}).status_code,400)
        r=client.post('/api/v1/meters/validate',json={'meter_number':'004217839011','service_id':'test-electricity'});self.assertEqual(r.status_code,200,r.json);self.assertEqual(r.json['customer_name'],'P*** E*** P***');self.assertNotIn('address',r.json)
        self.assertEqual(client.post('/api/v1/meters/validate',json={'meter_number':'004217839011','service_id':'unapproved-electricity'}).status_code,400)
        self.assertEqual(client.post('/api/v1/payments/quotes',json={'utility_type':'water','amount_kobo':50000},headers={'Idempotency-Key':str(uuid.uuid4())}).status_code,503);app.db_engine.dispose()

    def test_factory_cli_registers_distinct_keys_without_commissioning(self):
        import subprocess,tempfile
        ops=self.promote(self.user('homeowner'),'internal_engineering')
        root=pathlib.Path(__file__).resolve().parents[3]
        with tempfile.TemporaryDirectory(prefix='smartclamp-device-') as tmp:
            output=pathlib.Path(tmp)/'device.json';env={**os.environ,'DATABASE_URL':self.settings['DATABASE_URL'],'DEVICE_HMAC_ENCRYPTION_KEY':self.key.decode()}
            r=subprocess.run([sys.executable,str(root/'tools/provision_device.py'),'--operator-id',ops['id'],'--profile','house_full','--api-origin','https://api.example.test','--output',str(output)],env=env,capture_output=True,text=True)
            self.assertEqual(r.returncode,0,'Factory provisioning command failed');bundle=json.loads(output.read_text());self.assertFalse(bundle['commissioned']);self.assertNotEqual(bundle['telemetry_key_hex'],bundle['command_key_hex']);self.assertEqual(output.stat().st_mode&0o777,0o600)
            d={'id':bundle['device_id'],'key':bytes.fromhex(bundle['telemetry_key_hex']),'boot':secrets.token_hex(16),'seq':0}
            heartbeat=self.client.post('/api/v1/device/events',json=self.envelope(d,'heartbeat'));self.assertEqual(heartbeat.status_code,200,heartbeat.json)
            reading=self.client.post('/api/v1/device/events',json=self.envelope(d));self.assertEqual(reading.status_code,409)

    def test_field_work_assignment_progress_scope_and_recovery(self):
        ops=self.promote(self.user('homeowner'),'internal_ops')
        tech=self.promote(self.user('homeowner'),'installer')
        other=self.promote(self.user('homeowner'),'installer')
        owner=self.user('homeowner');d=self.provision(owner)
        created=self.client.post('/api/v1/ops/jobs',json={'device_id':d['id'],'kind':'repair'},headers=self.headers(ops))
        self.assertEqual(created.status_code,201,created.json);jid=created.json['id'];path='/api/v1/jobs/'+jid
        for u in (owner,tech,other):self.assertEqual(self.client.get(path,headers=self.headers(u)).status_code,404)
        def act(u,action,version,**extra):
            return self.client.post(path+'/actions',json={'action':action,'expected_version':version,'note':'Recorded on the isolated test bench.',**extra},headers=self.headers(u))
        self.assertEqual(act(ops,'assign',1,assignee_id=owner['id']).status_code,422)
        assigned=act(ops,'assign',1,assignee_id=tech['id']);self.assertEqual(assigned.status_code,200,assigned.json)
        self.assertEqual(self.client.get(path,headers=self.headers(other)).status_code,404)
        self.assertEqual(act(tech,'start',1).status_code,409)
        started=act(tech,'start',2);self.assertEqual(started.status_code,200,started.json)
        self.assertEqual(act(tech,'close',3).status_code,409)
        headers=self.headers(tech);body={'action':'submit','expected_version':3,'note':'Documented diagnostic result for operator review.'}
        first=self.client.post(path+'/actions',json=body,headers=headers);self.assertEqual(first.status_code,200,first.json)
        self.assertEqual(self.client.post(path+'/actions',json=body,headers=headers).json,first.json)
        self.assertFalse(first.json['commissioning_available'])
        self.assertEqual(act(ops,'close',4).status_code,200)
        detail=self.client.get(path,headers=self.headers(tech)).json
        self.assertEqual(len(detail['events']),4);self.assertEqual(detail['job']['status'],'closed');self.assertIsNotNone(detail['job']['completed_at'])
        with self.app.app_context(),transaction() as c:
            self.assertEqual(scalar(c,'SELECT install_state FROM devices WHERE id=:id',id=d['id']),'commissioned')
            self.assertEqual(scalar(c,'SELECT count(*) FROM notifications WHERE recipient_id=:uid AND dedupe_key LIKE :key',uid=tech['id'],key='job:%'),4)
            self.assertEqual(scalar(c,'SELECT count(*) FROM payouts WHERE earner_id=:uid',uid=tech['id']),0)
        self.assertEqual(act(ops,'reopen',5).status_code,200)
        self.assertEqual(self.client.get(path,headers=self.headers(tech)).status_code,404)
        self.assertEqual(act(ops,'assign',6,assignee_id=other['id']).status_code,200)
        restarted=create_app(self.settings)
        r=restarted.test_client().get(path,headers=self.headers(other));self.assertEqual(r.status_code,200);self.assertEqual(len(r.json['events']),6)
        restarted.db_engine.dispose()

    def test_installation_work_cannot_self_commission_or_close(self):
        ops=self.promote(self.user('homeowner'),'internal_ops');tech=self.promote(self.user('homeowner'),'installer');d=self.provision(self.user('homeowner'))
        with self.app.app_context(),transaction() as c:query(c,"UPDATE devices SET install_state='provisioned',calibration_status='uncalibrated' WHERE id=:id",id=d['id'])
        r=self.client.post('/api/v1/ops/jobs',json={'device_id':d['id'],'kind':'installation'},headers=self.headers(ops));self.assertEqual(r.status_code,201,r.json)
        path='/api/v1/jobs/'+r.json['id']+'/actions'
        for u,action,version,extra in [(ops,'assign',1,{'assignee_id':tech['id']}),(tech,'start',2,{}),(tech,'submit',3,{})]:
            r=self.client.post(path,json={'action':action,'expected_version':version,'note':'The physical qualification remains outstanding.',**extra},headers=self.headers(u));self.assertEqual(r.status_code,200,r.json)
        for action in ('commission','close'):
            r=self.client.post(path,json={'action':action,'expected_version':4,'note':'Cannot substitute for real qualification.'},headers=self.headers(ops));self.assertEqual(r.status_code,409,r.json)
        with self.app.app_context(),transaction() as c:
            self.assertEqual(scalar(c,'SELECT install_state FROM devices WHERE id=:id',id=d['id']),'provisioned')
            self.assertEqual(scalar(c,'SELECT count(*) FROM commands WHERE device_id=:id',id=d['id']),0)

    def test_sms_opt_in_durable_acceptance_unknown_and_no_resend(self):
        from app.work import notify
        from app.notifications import process_sms,delivery_time
        u=self.user('homeowner');base=self.settings['PAYSTACK_API_URL']
        settings={'SMS_ENABLED':'true','AT_USERNAME':'test-fixture','AT_API_KEY':'test-key','AT_SENDER_ID':'QA','AT_SMS_URL':base+'/messaging'}
        before={k:self.app.config.get(k) for k in settings};self.app.config.update(settings)
        try:
            with self.app.app_context(),transaction() as c:notify(c,u['id'],'payment.confirmed','Payment test event','test-optout:'+u['id'])
            self.assertEqual(self.client.patch('/api/v1/users/me/preferences',json={'sms_enabled':'true'},headers=self.headers(u)).status_code,400)
            r=self.client.patch('/api/v1/users/me/preferences',json={'sms_enabled':True},headers=self.headers(u));self.assertEqual(r.status_code,200,r.json)
            self.assertTrue(r.json['notification_channels']['sms'])
            start=len(ProviderFixture.sms_requests)
            with self.app.app_context(),transaction() as c:
                for _ in range(2):notify(c,u['id'],'payment.confirmed','A confirmed test payment.','test-accepted:'+u['id'])
                nid=scalar(c,"SELECT id FROM notifications WHERE recipient_id=:id AND channel='sms'",id=u['id'])
            self.drain()
            with self.app.app_context(),transaction() as c:
                n=one(c,'SELECT * FROM notifications WHERE id=:id',id=nid);self.assertEqual(n['status'],'provider_accepted');self.assertEqual(n['attempts'],1)
            self.assertEqual(len(ProviderFixture.sms_requests)-start,1)
            # Neither a browser acknowledgement nor a reclaimed dispatch can claim delivery or send twice.
            self.assertEqual(self.client.post('/api/v1/alerts/'+str(nid)+'/acknowledge',json={},headers=self.headers(u)).status_code,404)
            with self.app.app_context():process_sms(nid)
            self.assertEqual(len(ProviderFixture.sms_requests)-start,1)
            ProviderFixture.sms_mode='unknown'
            with self.app.app_context(),transaction() as c:
                notify(c,u['id'],'payment.confirmed','An uncertain test dispatch.','test-unknown:'+u['id'])
                unknown=scalar(c,"SELECT id FROM notifications WHERE dedupe_key=:key",key='sms:test-unknown:'+u['id'])
            self.drain()
            with self.app.app_context():process_sms(unknown)
            self.assertEqual(len(ProviderFixture.sms_requests)-start,2)
            with self.app.app_context(),transaction() as c:self.assertEqual(scalar(c,'SELECT status FROM notifications WHERE id=:id',id=unknown),'unknown')
            # Lagos 22:00 delays ordinary notifications until 07:00; critical facts bypass quiet hours.
            late=datetime(2026,11,12,21,tzinfo=timezone.utc)
            self.assertEqual(delivery_time('job.updated',late),datetime(2026,11,13,6,tzinfo=timezone.utc))
            self.assertEqual(delivery_time('supply.lost',late),late)
        finally:
            self.app.config.update(before);ProviderFixture.sms_mode='accepted'

    def test_signed_firmware_canary_download_new_boot_and_failure_pause(self):
        import base64,tempfile
        from cryptography.hazmat.primitives.asymmetric import rsa,padding
        from cryptography.hazmat.primitives import serialization,hashes
        from app.protocol import verify
        owner=self.user('homeowner');engineer=self.promote(self.user('homeowner'),'internal_engineering')
        devices=[self.provision(owner) for _ in range(3)]
        for d in devices:
            with self.app.app_context(),transaction() as c:query(c,'UPDATE devices SET ota_qualified=true WHERE id=:id',id=d['id'])
        key=rsa.generate_private_key(public_exponent=65537,key_size=3072)
        image=bytes([0xE9])+secrets.token_bytes(4095) # Isolated protocol fixture, never a flashable production image.
        secure=secrets.randbelow(2000000000)+1
        body={'profile':'house_full','board':'esp32dev','version':'qa-1','secure_version':secure,'image_base64':base64.b64encode(image).decode()}
        with tempfile.TemporaryDirectory(prefix='smartclamp-ota-') as tmp:
            path=pathlib.Path(tmp)/'signer.pem';path.write_bytes(key.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption()));path.chmod(0o600)
            previous={k:self.app.config.get(k) for k in ('OTA_ENABLED','OTA_SIGNING_KEY_FILE')}
            self.app.config.update(OTA_ENABLED='true',OTA_SIGNING_KEY_FILE=str(path))
            try:
                endpoint='/api/v1/ops/firmware'
                self.assertEqual(self.client.post(endpoint+'/artifacts',json=body,headers=self.headers(owner)).status_code,403)
                result=self.client.post(endpoint+'/artifacts',json=body,headers=self.headers(engineer));self.assertEqual(result.status_code,201,result.json)
                artifact=result.json['id'];manifest=result.json['manifest']
                key.public_key().verify(base64.b64decode(result.json['signature']),canonical(manifest),padding.PKCS1v15(),hashes.SHA256())
                self.assertEqual(manifest['sha256'],hashlib.sha256(image).hexdigest())
                rollout=self.client.post(endpoint+'/rollouts',json={'artifact_id':artifact,'device_ids':[d['id'] for d in devices]},headers=self.headers(engineer));self.assertEqual(rollout.status_code,201,rollout.json);rid=rollout.json['id']
                def action(name,version):return self.client.post(endpoint+'/rollouts/'+rid+'/actions',json={'action':name,'expected_version':version},headers=self.headers(engineer))
                self.assertEqual(action('advance',1).status_code,409)
                self.assertIsNone(self.client.post('/api/v1/device/poll',json=self.envelope(devices[1],'poll')).json['firmware'])
                d=devices[0];poll=self.client.post('/api/v1/device/poll',json=self.envelope(d,'poll'));self.assertEqual(poll.status_code,200,poll.json)
                offer=verify(poll.json['firmware'],d['command_key']);target=offer['target_id'];self.assertEqual(offer['manifest'],manifest)
                bad=self.client.post('/api/v1/device/firmware/download',json=self.envelope(devices[1],'firmware_download',target_id=target));self.assertEqual(bad.status_code,409)
                self.assertEqual(action('pause',1).status_code,200)
                self.assertEqual(self.client.post('/api/v1/device/firmware/download',json=self.envelope(d,'firmware_download',target_id=target)).status_code,409)
                self.assertEqual(action('resume',2).status_code,200)
                download=self.client.post('/api/v1/device/firmware/download',json=self.envelope(d,'firmware_download',target_id=target));self.assertEqual(download.status_code,200);self.assertEqual(download.data,image)
                def receipt(dev,result,**extra):return self.client.post('/api/v1/device/firmware/receipts',json=self.envelope(dev,'firmware_receipt',target_id=target,result=result,sha256=manifest['sha256'],secure_version=secure,reason_code='qa_protocol_fixture',**extra))
                self.assertEqual(receipt(d,'boot_confirmed',health_ok=True).status_code,409)
                self.assertEqual(receipt(d,'staged').status_code,200)
                self.assertEqual(receipt(d,'boot_confirmed',health_ok=True).status_code,409) # Same boot cannot confirm new code.
                d['boot']=secrets.token_hex(16);d['seq']=0
                r=receipt(d,'boot_confirmed',health_ok=True);self.assertEqual(r.status_code,200,r.json)
                self.assertEqual(action('advance',3).status_code,200)
                d=devices[1];poll=self.client.post('/api/v1/device/poll',json=self.envelope(d,'poll'));target=verify(poll.json['firmware'],d['command_key'])['target_id']
                failure=receipt(d,'failed');self.assertEqual(failure.status_code,200,failure.json)
                overview=self.client.get(endpoint,headers=self.headers(engineer)).json
                rollout=next(r for r in overview['rollouts'] if r['id']==rid);self.assertEqual(rollout['status'],'paused')
                self.assertEqual(action('advance',rollout['version']).status_code,409)
                with self.app.app_context(),transaction() as c:
                    current=one(c,'SELECT firmware_secure_version,firmware_sha256 FROM devices WHERE id=:id',id=devices[0]['id']);self.assertEqual(current['firmware_secure_version'],secure);self.assertEqual(current['firmware_sha256'],manifest['sha256'])
                    self.assertEqual(scalar(c,'SELECT firmware_secure_version FROM devices WHERE id=:id',id=devices[1]['id']),0)
                self.assertEqual(self.client.post(endpoint+'/rollouts',json={'artifact_id':artifact,'device_ids':[devices[0]['id']]},headers=self.headers(engineer)).status_code,409)
            finally:self.app.config.update(previous)

    def test_timestamped_webhook_rotation_replay_and_downgrade_denial(self):
        import time
        u=self.user('homeowner');d=self.provision(u);p=self.payment(u,d)
        raw=json.dumps({'event':'charge.success','data':{'reference':p['provider_reference']}}).encode()
        stamp=str(int(time.time()));secret='whsec_isolated_fixture';old='whsec_previous_fixture'
        def sig(key,t):return hmac.new(key.encode(),t.encode()+b'.'+raw,hashlib.sha512).hexdigest()
        previous={k:self.app.config.get(k) for k in ('PAYSTACK_WEBHOOK_SECRET','PAYSTACK_WEBHOOK_PREVIOUS_SECRET')}
        self.app.config.update(PAYSTACK_WEBHOOK_SECRET=secret,PAYSTACK_WEBHOOK_PREVIOUS_SECRET=old)
        try:
            self.assertEqual(self.signed_webhook(p).status_code,401) # No downgrade once current signing mode is configured.
            stale=str(int(stamp)-301)
            header=f't={stale},v1=whk_qa:{sig(secret,stale)}'
            self.assertEqual(self.client.post('/api/v1/webhooks/payment',data=raw,content_type='application/json',headers={'Paystack-Signature':header}).status_code,401)
            header=f't={stamp},v1=whk_new:'+('0'*128)+f',v1=whk_old:{sig(old,stamp)}'
            good=self.client.post('/api/v1/webhooks/payment',data=raw,content_type='application/json',headers={'Paystack-Signature':header});self.assertEqual(good.status_code,200,good.json)
            self.assertEqual(self.client.post('/api/v1/webhooks/payment',data=raw+b' ',content_type='application/json',headers={'Paystack-Signature':header}).status_code,401)
            self.assertEqual(self.client.post('/api/v1/webhooks/payment',data=raw,content_type='application/json',headers={'Paystack-Signature':header+',t='+stamp}).status_code,401)
        finally:self.app.config.update(previous)

    def test_actual_vended_units_replace_estimate_without_duplicate_credit_and_cost_residual(self):
        owner=self.user('homeowner');d=self.provision(owner);p=self.payment(owner,d)
        ProviderFixture.vend_units='4.75 kWh'
        self.assertEqual(self.signed_webhook(p).status_code,200);self.drain();self.attest(owner,p)
        with self.app.app_context(),transaction() as c:
            w=one(c,'SELECT * FROM wallets WHERE id=:id',id=d['wallet']['id']);self.assertEqual(w['available_mwh'],4750000);self.assertEqual(w['reserved_mwh'],0)
            actual=one(c,'SELECT units_mwh,delivered_units_mwh FROM payments WHERE id=:id',id=p['id']);self.assertEqual(actual['units_mwh'],5000000);self.assertEqual(actual['delivered_units_mwh'],4750000)
        base=int(datetime.now(timezone.utc).timestamp()*1000)-10000
        for counter,at in [(0,base),(2375000,base+1000),(4750000,base+2000)]:
            r=self.client.post('/api/v1/device/events',json=self.envelope(d,occurred_at_ms=at,metrics={'voltage_mv':230000,'import_mwh':counter}));self.assertEqual(r.status_code,200,r.json);self.drain()
        with self.app.app_context(),transaction() as c:
            w=one(c,'SELECT available_mwh,available_kobo FROM wallets WHERE id=:id',id=d['wallet']['id']);self.assertEqual(w['available_mwh'],0);self.assertEqual(w['available_kobo'],0)
            self.assertEqual(scalar(c,'SELECT count(*) FROM energy_credit_lots WHERE payment_id=:id',id=p['id']),1)
        self.assertEqual(self.signed_webhook(p).status_code,200);self.drain()
        with self.app.app_context(),transaction() as c:self.assertEqual(scalar(c,'SELECT available_mwh FROM wallets WHERE id=:id',id=d['wallet']['id']),0)
    def test_missing_actual_units_remain_reserved_and_requery_same_vend(self):
        owner=self.user('homeowner');d=self.provision(owner);p=self.payment(owner,d);ProviderFixture.vend_units='unknown';before=len(ProviderFixture.vend_requests)
        self.assertEqual(self.signed_webhook(p).status_code,200);self.drain()
        with self.app.app_context(),transaction() as c:
            self.assertEqual(scalar(c,'SELECT available_mwh FROM wallets WHERE id=:id',id=d['wallet']['id']),0)
            self.assertIsNone(scalar(c,'SELECT delivered_units_mwh FROM payments WHERE id=:id',id=p['id']))
            query(c,"UPDATE outbox SET next_attempt_at=now() WHERE event_type='payment_verified' AND payload->>'payment_id'=:id",id=str(p['id']))
        ProviderFixture.vend_units='4.9 kWh';self.drain();self.attest(owner,p)
        self.assertEqual(ProviderFixture.vend_requests[before],ProviderFixture.vend_requests[before+1])
        with self.app.app_context(),transaction() as c:self.assertEqual(scalar(c,'SELECT available_mwh FROM wallets WHERE id=:id',id=d['wallet']['id']),4900000)

    def test_standalone_meter_purchase_without_smartclamp_or_fabricated_meter_balance(self):
        owner=self.user('homeowner');stranger=self.user('homeowner');service='qa-'+uuid.uuid4().hex[:12]
        previous=self.app.config.get('VTPASS_ELECTRICITY_SERVICE_ID');self.app.config['VTPASS_ELECTRICITY_SERVICE_ID']=service
        try:
            r=self.client.post('/api/v1/meters/link',json={'meter_number':'001234567890','service_id':service},headers=self.headers(owner));self.assertEqual(r.status_code,201,r.json)
            linked=r.json['id'];wallets=self.client.get('/api/v1/wallets',headers=self.headers(owner)).json['items'];self.assertEqual(len(wallets),1)
            wallet=wallets[0];self.assertEqual(wallet['balance_kind'],'meter_purchases');self.assertIsNone(wallet['device_id']);self.assertEqual(wallet['meter_hint'],'7890')
            self.assertEqual(self.client.post('/api/v1/payments/quotes',json={'destination_token':wallet['payment_token'],'amount_kobo':50000},headers=self.headers(owner)).status_code,503)
            with self.app.app_context(),transaction() as c:query(c,'INSERT INTO tariffs(provider,version,effective_from,day_rate_kobo_per_kwh) VALUES(:service,:version,now(),10000)',service=service,version='tariff-'+service)
            p=self.payment(owner,{'wallet':wallet});ProviderFixture.token='00000000000000000004';self.assertEqual(self.signed_webhook(p).status_code,200);self.drain()
            confirm=self.client.post('/api/v1/payments/'+str(p['id'])+'/confirm-meter-entry',json={'confirmed':True},headers=self.headers(owner));self.assertEqual(confirm.status_code,200,confirm.json)
            self.assertEqual(self.client.get('/api/v1/wallets',headers=self.headers(stranger)).json['items'],[])
            self.assertEqual(self.client.get('/api/v1/wallets/'+wallet['id']+'/ledger',headers=self.headers(stranger)).status_code,404)
            self.assertEqual(self.client.get('/api/v1/wallets/'+wallet['id']+'/ledger',headers=self.headers(owner)).status_code,200)
            context=self.client.get('/api/v1/users/me/context',headers=self.headers(owner)).json;self.assertEqual(context['devices'],[])
            with self.app.app_context(),transaction() as c:
                self.assertEqual(scalar(c,'SELECT status FROM linked_meters WHERE id=:id',id=linked),'pending')
                self.assertEqual(scalar(c,'SELECT available_mwh FROM wallets WHERE id=:id',id=wallet['id']),5000000)
        finally:self.app.config['VTPASS_ELECTRICITY_SERVICE_ID']=previous

    def test_central_meter_configuration_keeps_room_credit_private_and_pins_vend_destination(self):
        owner=self.user('landlord');ops=self.promote(self.user('homeowner'),'internal_ops')
        service='qa-'+uuid.uuid4().hex[:12];previous=self.app.config.get('VTPASS_ELECTRICITY_SERVICE_ID');self.app.config['VTPASS_ELECTRICITY_SERVICE_ID']=service
        try:
            b=self.client.post('/api/v1/buildings',json={'name':'Shared meter pilot','address':'Isolated QA','meter_type':'with_meter'},headers=self.headers(owner));self.assertEqual(b.status_code,201,b.json);bid=b.json['building_id']
            meter=self.client.post('/api/v1/meters/link',json={'meter_number':'004444444444','service_id':service},headers=self.headers(owner));self.assertEqual(meter.status_code,201,meter.json)
            with self.app.app_context(),transaction() as c:query(c,'INSERT INTO tariffs(provider,version,effective_from,day_rate_kobo_per_kwh) VALUES(:service,:version,now(),10000)',service=service,version='tariff-'+service)
            endpoint='/api/v1/ops/buildings/'+bid+'/payment-destination';body={'linked_meter_id':meter.json['id'],'tariff_version':'tariff-'+service}
            self.assertEqual(self.client.post(endpoint,json=body,headers=self.headers(owner)).status_code,403)
            self.assertEqual(self.client.post(endpoint,json=body,headers=self.headers(ops)).status_code,201)
            self.assertEqual(self.client.post(endpoint,json=body,headers=self.headers(ops)).status_code,409)
            room_devices=[]
            for label in ('Room A','Room B'):
                r=self.client.post('/api/v1/buildings/'+bid+'/rooms',json={'label':label},headers=self.headers(owner));self.assertEqual(r.status_code,201,r.json)
                rid=r.json['room_id'];d=self.provision(owner)
                with self.app.app_context(),transaction() as c:query(c,'UPDATE devices SET owner_id=NULL WHERE id=:id',id=d['id'])
                claim=self.client.post('/api/v1/ops/devices/'+d['id']+'/claim-code',json={},headers=self.headers(ops));self.assertEqual(claim.status_code,201,claim.json)
                linked=self.client.post('/api/v1/devices/claim',json={'claim_code':claim.json['claim_code'],'room_id':rid},headers=self.headers(owner));self.assertEqual(linked.status_code,201,linked.json)
                with self.app.app_context(),transaction() as c:
                    self.assertEqual(str(scalar(c,'SELECT linked_meter_id FROM devices WHERE id=:id',id=d['id'])),meter.json['id'])
                    d['wallet']=dict(one(c,'SELECT * FROM wallets WHERE device_id=:id',id=d['id']))
                room_devices.append(d)
            p=self.payment(owner,room_devices[0])
            # A later association change must not redirect the already-quoted meter purchase.
            with self.app.app_context(),transaction() as c:query(c,'UPDATE devices SET linked_meter_id=NULL WHERE id=:id',id=room_devices[0]['id'])
            before=len(ProviderFixture.vend_requests);self.assertEqual(self.signed_webhook(p).status_code,200);self.drain();self.attest(owner,p)
            request_id=ProviderFixture.vend_requests[before];self.assertEqual(ProviderFixture.vend_records[request_id]['billersCode'],'004444444444')
            with self.app.app_context(),transaction() as c:
                self.assertEqual(scalar(c,'SELECT available_mwh FROM wallets WHERE id=:id',id=room_devices[0]['wallet']['id']),5000000)
                self.assertEqual(scalar(c,'SELECT available_mwh FROM wallets WHERE id=:id',id=room_devices[1]['wallet']['id']),0)
        finally:self.app.config['VTPASS_ELECTRICITY_SERVICE_ID']=previous
    def test_signed_reports_freeze_observations_export_exact_bytes_and_revoke_sharing(self):
        import base64,tempfile
        from cryptography.hazmat.primitives.asymmetric import rsa,padding
        from cryptography.hazmat.primitives import serialization,hashes
        owner=self.user('homeowner');stranger=self.user('homeowner');d=self.provision(owner)
        today=datetime.now(timezone.utc).date();start=today-timedelta(days=2);end=today
        at=int(datetime.combine(start,datetime.min.time(),tzinfo=timezone.utc).timestamp()*1000)+3600000
        for counter,offset in [(0,0),(1000000,60000)]:
            response=self.client.post('/api/v1/device/events',json=self.envelope(d,occurred_at_ms=at+offset,metrics={'voltage_mv':230000,'import_mwh':counter}));self.assertEqual(response.status_code,200,response.json);self.drain()
        key=rsa.generate_private_key(public_exponent=65537,key_size=3072)
        with tempfile.TemporaryDirectory(prefix='smartclamp-report-') as tmp:
            path=pathlib.Path(tmp)/'report.pem';path.write_bytes(key.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption()));path.chmod(0o600)
            previous=self.app.config.get('REPORT_SIGNING_KEY_FILE');self.app.config['REPORT_SIGNING_KEY_FILE']=str(path)
            try:
                r=self.client.post('/api/v1/reports',json={'device_id':d['id'],'period_start':start.isoformat(),'period_end':end.isoformat()},headers=self.headers(owner));self.assertEqual(r.status_code,201,r.json)
                rid=r.json['id'];token=r.json['share_path'].split('/')[-1]
                report=self.client.get('/api/v1/reports/'+rid,headers=self.headers(owner));self.assertEqual(report.status_code,200,report.json);original=report.json
                self.assertTrue(original['signature_valid']);self.assertEqual(original['snapshot']['measured_consumption_mwh'],1000000);self.assertEqual(len(original['snapshot']['readings']),2)
                raw=base64.b64decode(original['canonical_base64']);key.public_key().verify(base64.b64decode(original['signature']),raw,padding.PKCS1v15(),hashes.SHA256())
                self.assertEqual(hashlib.sha256(raw).hexdigest(),original['sha256']);self.assertNotIn(owner['phone'],raw.decode())
                self.assertEqual(self.client.get('/api/v1/reports/'+rid,headers=self.headers(stranger)).status_code,404)
                self.assertEqual(self.client.get('/api/v1/reports',headers=self.headers(stranger)).json['items'],[])
                self.assertEqual(self.client.get('/api/v1/public/reports/'+token).status_code,200)
                later=self.client.post('/api/v1/device/events',json=self.envelope(d,occurred_at_ms=at+120000,metrics={'voltage_mv':230000,'import_mwh':2000000}));self.assertEqual(later.status_code,200,later.json);self.drain()
                self.assertEqual(self.client.get('/api/v1/reports/'+rid,headers=self.headers(owner)).json['canonical_base64'],original['canonical_base64'])
                exported=self.client.post('/api/v1/reports/'+rid+'/exports',json={},headers=self.headers(owner));self.assertEqual(exported.status_code,201,exported.json)
                download=self.client.get('/api/v1'+exported.json['download_path'],headers=self.headers(owner));self.assertEqual(download.status_code,200);self.assertEqual(hashlib.sha256(download.data).hexdigest(),exported.json['sha256']);self.assertEqual(len(download.data.decode().splitlines()),3)
                self.assertEqual(self.client.get('/api/v1'+exported.json['download_path'],headers=self.headers(stranger)).status_code,404)
                self.assertEqual(self.client.post('/api/v1/reports/'+rid+'/revoke',json={},headers=self.headers(owner)).status_code,200)
                self.assertEqual(self.client.get('/api/v1/public/reports/'+token).status_code,404)
                restarted=create_app(self.settings);saved=restarted.test_client().get('/api/v1/reports/'+rid,headers=self.headers(owner));self.assertEqual(saved.status_code,200);self.assertTrue(saved.json['revoked']);self.assertEqual(saved.json['sha256'],original['sha256']);restarted.db_engine.dispose()
            finally:self.app.config['REPORT_SIGNING_KEY_FILE']=previous

    def test_delayed_timely_relay_receipt_does_not_overwrite_newer_feedback(self):
        owner=self.user('homeowner');d=self.provision(owner);cid=str(uuid.uuid4())
        now=datetime.now(timezone.utc);issued=now-timedelta(minutes=5);expires=issued+timedelta(seconds=120);observed=issued+timedelta(seconds=5)
        with self.app.app_context(),transaction() as c:
            query(c,"INSERT INTO commands(device_id,command_id,seq,key_epoch,config_epoch,policy_epoch,issued_at,expires_at,on_state,reason,authorization_ref,requester_id,status,signed_envelope) VALUES(:did,:cid,1,1,1,1,:issued,:expires,false,'user_manual','qa-only',:uid,'expired','{}'::jsonb)",did=d['id'],cid=cid,issued=issued,expires=expires,uid=owner['id'])
            query(c,'UPDATE devices SET relay_observed=true,relay_observed_at=:now WHERE id=:id',id=d['id'],now=now)
        envelope=self.envelope(d,'command_receipt',command_id=cid,command_seq=1,result='applied',observed_on=False,observed_at_ms=int(observed.timestamp()*1000))
        r=self.client.post('/api/v1/device/receipts',json=envelope);self.assertEqual(r.status_code,200,r.json)
        self.assertEqual(self.client.post('/api/v1/device/receipts',json=envelope).json,r.json)
        with self.app.app_context(),transaction() as c:
            self.assertTrue(scalar(c,'SELECT relay_observed FROM devices WHERE id=:id',id=d['id']))
            self.assertEqual(scalar(c,'SELECT status FROM commands WHERE command_id=:id',id=cid),'applied')
        invalid=self.envelope(d,'command_receipt',command_id=cid,command_seq=1,result='applied',observed_on=False,observed_at_ms=int(now.timestamp()*1000))
        self.assertEqual(self.client.post('/api/v1/device/receipts',json=invalid).status_code,400)

    def test_delivered_prepaid_vend_without_token_never_releases_room_credit(self):
        owner=self.user('homeowner');d=self.provision(owner);p=self.payment(owner,d);ProviderFixture.omit_token=True
        self.assertEqual(self.signed_webhook(p).status_code,200);self.drain()
        with self.app.app_context(),transaction() as c:
            self.assertEqual(scalar(c,'SELECT available_mwh FROM wallets WHERE id=:id',id=d['wallet']['id']),0)
            self.assertEqual(scalar(c,'SELECT credit_state FROM payments WHERE id=:id',id=p['id']),'reserved')
            query(c,"UPDATE outbox SET next_attempt_at=now() WHERE event_type='payment_verified' AND payload->>'payment_id'=:id",id=str(p['id']))
        ProviderFixture.omit_token=False;self.drain()
        with self.app.app_context(),transaction() as c:
            self.assertEqual(scalar(c,'SELECT vending_state FROM payments WHERE id=:id',id=p['id']),'token_pending_entry')
            self.assertEqual(scalar(c,'SELECT available_mwh FROM wallets WHERE id=:id',id=d['wallet']['id']),0)
        self.attest(owner,p)
        with self.app.app_context(),transaction() as c:self.assertEqual(scalar(c,'SELECT available_mwh FROM wallets WHERE id=:id',id=d['wallet']['id']),5000000)

    def test_lost_initialization_response_and_webhook_recover_same_payment_without_second_charge(self):
        owner=self.user('homeowner');d=self.provision(owner);ProviderFixture.init_mode='disconnect'
        start=ProviderFixture.initializations;p=self.payment(owner,d);self.assertEqual(p['payment_state'],'unknown')
        again=self.client.post('/api/v1/payments/checkout',json={'quote_id':str(p['quote_id']),'payer_email':'qa@example.test','return_path':'/payments/return'},headers=self.headers(owner));self.assertEqual(again.status_code,202,again.json);self.assertEqual(again.json['id'],str(p['id']))
        self.assertEqual(ProviderFixture.initializations-start,1)
        with self.app.app_context(),transaction() as c:query(c,"UPDATE outbox SET next_attempt_at=now() WHERE event_type='payment_reconcile' AND payload->>'payment_id'=:id",id=str(p['id']))
        before=ProviderFixture.vends;self.drain()
        with self.app.app_context(),transaction() as c:
            self.assertEqual(scalar(c,'SELECT payment_state FROM payments WHERE id=:id',id=p['id']),'verified')
            self.assertEqual(scalar(c,'SELECT vending_state FROM payments WHERE id=:id',id=p['id']),'token_pending_entry')
            self.assertEqual(scalar(c,'SELECT available_mwh FROM wallets WHERE id=:id',id=d['wallet']['id']),0)
        self.attest(owner,p)
        self.assertEqual(self.signed_webhook(p).status_code,200);self.drain()
        self.assertEqual(ProviderFixture.vends-before,1);self.assertEqual(ProviderFixture.initializations-start,1)
        with self.app.app_context(),transaction() as c:
            self.assertEqual(scalar(c,'SELECT count(*) FROM ledger_transactions WHERE provider_reference=:ref',ref='money:'+p['provider_reference']),1)
            self.assertEqual(scalar(c,'SELECT available_mwh FROM wallets WHERE id=:id',id=d['wallet']['id']),5000000)

    def test_provider_requery_keeps_pending_unknown_and_only_closes_confirmed_failure(self):
        owner=self.user('homeowner');d=self.provision(owner);ProviderFixture.init_mode='pending';p=self.payment(owner,d)
        with self.app.app_context(),transaction() as c:query(c,"UPDATE outbox SET next_attempt_at=now() WHERE event_type='payment_reconcile' AND payload->>'payment_id'=:id",id=str(p['id']))
        self.drain()
        with self.app.app_context(),transaction() as c:
            self.assertEqual(scalar(c,'SELECT payment_state FROM payments WHERE id=:id',id=p['id']),'pending')
            self.assertEqual(scalar(c,'SELECT reserved_mwh FROM wallets WHERE id=:id',id=d['wallet']['id']),0)
            query(c,"UPDATE outbox SET next_attempt_at=now() WHERE event_type='payment_reconcile' AND payload->>'payment_id'=:id",id=str(p['id']))
        ProviderFixture.records[p['provider_reference']]['status']='failed';self.drain()
        status=self.client.get('/api/v1/payments/'+str(p['id']),headers=self.headers(owner));self.assertEqual(status.json['payment_state'],'failed');self.assertEqual(status.json['credit_state'],'none')
        again=self.client.post('/api/v1/payments/checkout',json={'quote_id':str(p['quote_id']),'payer_email':'qa@example.test','return_path':'/payments/return'},headers=self.headers(owner));self.assertEqual(again.status_code,202,again.json);self.assertIsNone(again.json['checkout_url']);self.assertEqual(again.json['status'],'failed')

    def test_existing_checkout_recovery_works_after_original_quote_expired(self):
        owner=self.user('homeowner');d=self.provision(owner);qid=str(uuid.uuid4());pid=str(uuid.uuid4());reference='SC_QA_'+uuid.uuid4().hex
        with self.app.app_context(),transaction() as c:
            query(c,"INSERT INTO quotes(id,wallet_id,destination_token,amount_kobo,wallet_value_kobo,markup_kobo,fee_kobo,units_mwh,tariff_version,created_at,expires_at) VALUES(:id,:wallet,:dest,50000,50000,0,0,5000000,:rate,now()-interval '16 minutes',now()-interval '1 minute')",id=qid,wallet=d['wallet']['id'],dest=d['wallet']['payment_token'],rate=d['wallet']['tariff_version'])
            query(c,"INSERT INTO payments(id,quote_id,payer_id,provider_reference,status_token,payment_state,amount_kobo,units_mwh) VALUES(:id,:quote,:uid,:ref,:token,'unknown',50000,5000000)",id=pid,quote=qid,uid=owner['id'],ref=reference,token=secrets.token_urlsafe(32))
        before=ProviderFixture.initializations
        recovered=self.client.post('/api/v1/payments/checkout',json={'quote_id':qid,'payer_email':'qa@example.test','return_path':'/payments/return'},headers=self.headers(owner));self.assertEqual(recovered.status_code,202,recovered.json);self.assertEqual(recovered.json['id'],pid);self.assertEqual(recovered.json['status'],'unknown');self.assertEqual(ProviderFixture.initializations,before)

    def test_signed_prepaid_ceiling_uses_funded_lots_not_stale_cloud_balance(self):
        from app.protocol import verify
        owner=self.user('homeowner');d=self.provision(owner)
        self.assertIsNone(self.client.post('/api/v1/device/poll',json=self.envelope(d,'poll')).json['prepaid_policy'])
        with self.app.app_context(),transaction() as c:
            query(c,'UPDATE devices SET prepaid_enforced=true,persistent_counter_qualified=true,prepaid_policy_qualified=true,prepaid_anchor_mwh=100,meter_counter_epoch=1 WHERE id=:id',id=d['id'])
        empty=self.client.post('/api/v1/device/poll',json=self.envelope(d,'poll'));self.assertEqual(empty.status_code,200,empty.json)
        initial=verify(empty.json['prepaid_policy'],d['command_key']);self.assertEqual(initial['ceiling_mwh'],100);self.assertEqual(initial['funded_mwh'],0)
        p=self.payment(owner,d);self.assertEqual(self.signed_webhook(p).status_code,200);self.drain();self.attest(owner,p)
        poll=self.client.post('/api/v1/device/poll',json=self.envelope(d,'poll'));grant=verify(poll.json['prepaid_policy'],d['command_key']);self.assertEqual(grant['ceiling_mwh'],5000100);self.assertGreater(grant['policy_seq'],initial['policy_seq'])
        repeated=self.client.post('/api/v1/device/poll',json=self.envelope(d,'poll'));again=verify(repeated.json['prepaid_policy'],d['command_key']);self.assertEqual(again['policy_seq'],grant['policy_seq']);self.assertEqual(again['body_sha256'],grant['body_sha256']);self.assertNotEqual(again['request_seq'],grant['request_seq'])
        # A wrong/missing counter epoch cannot install the allowance.
        invalid=self.envelope(d,'prepaid_policy_receipt',policy_id=grant['policy_id'],policy_seq=grant['policy_seq'],body_sha256=grant['body_sha256'],result='accepted',reason_code='durable_policy_installed',import_mwh=100,counter_epoch=2)
        self.assertEqual(self.client.post('/api/v1/device/prepaid-policy/receipts',json=invalid).status_code,409)
        accepted=self.envelope(d,'prepaid_policy_receipt',policy_id=grant['policy_id'],policy_seq=grant['policy_seq'],body_sha256=grant['body_sha256'],result='accepted',reason_code='durable_policy_installed',import_mwh=100,counter_epoch=1)
        r=self.client.post('/api/v1/device/prepaid-policy/receipts',json=accepted);self.assertEqual(r.status_code,200,r.json)
        self.assertEqual(self.client.post('/api/v1/device/prepaid-policy/receipts',json=accepted).json,r.json)
        detail=self.client.get('/api/v1/devices/'+d['id'],headers=self.headers(owner));self.assertEqual(detail.json['prepaid_policy']['status'],'accepted');self.assertFalse(detail.json['prepaid_policy']['physical_cutoff_confirmed'])
        with self.app.app_context(),transaction() as c:
            # Delayed cloud accounting cannot manufacture another allowance.
            query(c,'UPDATE wallets SET available_mwh=999999999 WHERE id=:id',id=d['wallet']['id'])
            self.assertIsNone(scalar(c,'SELECT relay_observed FROM devices WHERE id=:id',id=d['id']))
        after=self.client.post('/api/v1/device/poll',json=self.envelope(d,'poll'));fixed=verify(after.json['prepaid_policy'],d['command_key']);self.assertEqual(fixed['ceiling_mwh'],5000100);self.assertEqual(fixed['policy_seq'],grant['policy_seq'])

    def test_unqualified_commissioning_policy_rejection_is_visible_without_claimed_cutoff(self):
        from app.protocol import verify
        owner=self.user('homeowner');d=self.provision(owner)
        with self.app.app_context(),transaction() as c:query(c,'UPDATE devices SET prepaid_enforced=true,persistent_counter_qualified=true,prepaid_policy_qualified=true,prepaid_anchor_mwh=0 WHERE id=:id',id=d['id'])
        poll=self.client.post('/api/v1/device/poll',json=self.envelope(d,'poll'));grant=verify(poll.json['prepaid_policy'],d['command_key'])
        rejected=self.envelope(d,'prepaid_policy_receipt',policy_id=grant['policy_id'],policy_seq=grant['policy_seq'],body_sha256=grant['body_sha256'],result='rejected',reason_code='hardware_unqualified',import_mwh=None,counter_epoch=1)
        r=self.client.post('/api/v1/device/prepaid-policy/receipts',json=rejected);self.assertEqual(r.status_code,200,r.json)
        view=self.client.get('/api/v1/devices/'+d['id'],headers=self.headers(owner));self.assertEqual(view.json['prepaid_policy']['status'],'rejected');self.assertFalse(view.json['prepaid_policy']['physical_cutoff_confirmed'])
        with self.app.app_context(),transaction() as c:self.assertEqual(scalar(c,'SELECT count(*) FROM commands WHERE device_id=:id',id=d['id']),0)

    def test_landlord_cannot_manually_cut_resident_power_and_controls_are_explicit(self):
        from app.live_devices import issue_command
        from app.db import DomainError
        owner=self.user('landlord');d=self.provision(owner)
        with self.app.app_context(),transaction() as c:
            actor=dict(one(c,'SELECT * FROM profiles WHERE id=:id',id=owner['id']))
            with self.assertRaises(DomainError) as denied:issue_command(c,actor,d['id'],False,'not-an-authority')
            self.assertEqual(denied.exception.code,'resident_control_required')
            self.assertEqual(scalar(c,'SELECT count(*) FROM commands WHERE device_id=:id',id=d['id']),0)
        context=self.client.get('/api/v1/users/me/context',headers=self.headers(owner)).json
        self.assertFalse(context['devices'][0]['controls']['can_request']);self.assertNotIn('relay_toggle',context['allowed_actions'])

if __name__=='__main__':unittest.main()
