"""Integration tests: actual PostgreSQL and GoTrue. Test-only HTTP fixtures exercise provider contracts.
No application endpoint contains a test-mode success provider. Set SMARTCLAMP_QA_CONFIG to an
isolated qa_services.py config; absence is explicitly skipped, not a readiness pass.
"""
import sys,pathlib,json,os,uuid,hashlib,hmac,threading,unittest,secrets
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
    records={};vends=0;vend_requests=[];token=None
    def log_message(self,*args):pass
    def send(self,data,code=200):
        content=json.dumps(data).encode();self.send_response(code);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(content)));self.end_headers();self.wfile.write(content)
    def do_POST(self):
        d=json.loads(self.rfile.read(int(self.headers.get('Content-Length','0'))) or b'{}')
        if self.path=='/transaction/initialize':
            self.records[d['reference']]={'reference':d['reference'],'amount':d['amount'],'currency':'NGN','status':'success'}
            return self.send({'status':True,'data':{'reference':d['reference'],'authorization_url':'https://checkout.paystack.com/'+d['reference']}})
        if self.path=='/merchant-verify':return self.send({'code':'000','content':{'Customer_Name':'Private Example Person'}})
        if self.path in('/pay','/requery'):
            type(self).vends+=1;type(self).vend_requests.append(d['request_id']);response={'code':'000','content':{'transactions':{'status':'delivered'}}}
            if self.token:response['purchased_code']=self.token
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
        self.client=self.app.test_client();self.users=[];ProviderFixture.token=None
    def user(self,role='tenant'):
        phone='+1555'+str(secrets.randbelow(9000000)+1000000);pwd='A-real-QA-password-42'
        r=self.client.post('/api/v1/auth/signup',json={'phone':phone,'password':pwd,'full_name':'Integration test account','role':role})
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
    def test_real_auth_rejects_wrong_password_and_persists_restart(self):
        u=self.user();bad=self.client.post('/api/v1/auth/login',json={'phone':u['phone'],'password':'wrong-password'});self.assertEqual(bad.status_code,401)
        other=create_app(self.settings);r=other.test_client().post('/api/v1/auth/login',json={'phone':u['phone'],'password':u['password']});self.assertEqual(r.status_code,200,r.json);self.assertEqual(r.json['user_id'],u['id']);other.db_engine.dispose()
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
        self.assertEqual(self.signed_webhook(p).status_code,200);self.assertEqual(self.signed_webhook(p).json['status'],'already_processed');self.drain()
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
        u=self.user();d=self.provision(u);ProviderFixture.token='TEST-ONLY-TOKEN';p=self.payment(u,d);self.assertEqual(self.signed_webhook(p).status_code,200);self.drain()
        with self.app.app_context(),transaction() as c:self.assertEqual(scalar(c,'SELECT available_mwh FROM wallets WHERE id=:id',id=d['wallet']['id']),0)
        r=self.client.post('/api/v1/payments/'+str(p['id'])+'/confirm-meter-entry',json={'confirmed':True},headers=self.headers(u));self.assertEqual(r.status_code,200,r.json)
        with self.app.app_context(),transaction() as c:self.assertEqual(scalar(c,'SELECT available_mwh FROM wallets WHERE id=:id',id=d['wallet']['id']),5000000)
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
        owner=self.user('homeowner');d=self.provision(owner);p=self.payment(owner,d);self.assertEqual(self.signed_webhook(p).status_code,200);self.drain()
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
        p=self.payment(owner,d);self.assertEqual(self.signed_webhook(p).status_code,200);self.drain()
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

if __name__=='__main__':unittest.main()
