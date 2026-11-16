"""Real local GoTrue email-change OTP + non-relaying SMTP sink. Never deploy.
Private config stays under /tmp; no secrets or OTP values are printed.
"""
import argparse,json,pathlib,re,sys,threading,time
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
import requests
from qa_services import start as start_qa,docker

class Template(BaseHTTPRequestHandler):
    def log_message(self,*args):pass
    def do_GET(self):
        raw=b'<h2>SmartClamp isolated QA</h2><p>Verification code: {{ .Token }}</p>'
        self.send_response(200);self.send_header('Content-Type','text/html');self.end_headers();self.wfile.write(raw)

def prepare(path,port=15440,auth_port=15441,mail_port=15442):
    path=pathlib.Path(path)
    if not str(path.resolve()).startswith('/tmp/'):raise RuntimeError('Private QA config must stay under /tmp')
    if not path.exists():start_qa(path,port,auth_port)
    q=json.loads(path.read_text());name=q['name']
    if not name.startswith('smartclamp-qa-') or q['port']!=port or q['auth_port']!=auth_port:raise RuntimeError('Refusing a different QA target')
    smtp=name+'-smtp';known=docker(['ps','-a','--format','{{.Names}}']).splitlines()
    if smtp not in known:docker(['run','-d','--name',smtp,'--network',name+'-network','-p',f'127.0.0.1:{mail_port}:8025','axllent/mailpit:v1.27'])
    else:docker(['start',smtp])
    template=ThreadingHTTPServer(('0.0.0.0',0),Template);threading.Thread(target=template.serve_forever,daemon=True).start()
    values={'GOTRUE_API_HOST':'0.0.0.0','PORT':'9999','GOTRUE_API_PORT':'9999','API_EXTERNAL_URL':f'http://localhost:{auth_port}','GOTRUE_SITE_URL':'http://localhost:3100','GOTRUE_DB_DRIVER':'postgres','GOTRUE_DB_DATABASE_URL':f"postgres://postgres:{q['password']}@{name}:5432/smartclamp?search_path=auth",'GOTRUE_JWT_SECRET':q['jwt_secret'],'GOTRUE_JWT_EXP':'3600','GOTRUE_JWT_AUD':'authenticated','GOTRUE_EXTERNAL_EMAIL_ENABLED':'true','GOTRUE_MAILER_AUTOCONFIRM':'false','GOTRUE_EXTERNAL_PHONE_ENABLED':'true','GOTRUE_SMS_AUTOCONFIRM':'true','GOTRUE_DISABLE_SIGNUP':'false','GOTRUE_SMTP_HOST':smtp,'GOTRUE_SMTP_PORT':'1025','GOTRUE_SMTP_ADMIN_EMAIL':'auth@example.test','GOTRUE_SMTP_SENDER_NAME':'SmartClamp QA','GOTRUE_SMTP_MAX_FREQUENCY':'1s','GOTRUE_RATE_LIMIT_EMAIL_SENT':'1000','GOTRUE_MAILER_TEMPLATES_EMAIL_CHANGE':f'http://host.docker.internal:{template.server_port}/email-change'}
    docker(['rm','-f',name+'-auth'])
    args=['run','-d','--name',name+'-auth','--network',name+'-network','--add-host','host.docker.internal:host-gateway','-p',f'127.0.0.1:{auth_port}:9999']
    for key in values:args+=['-e',key]
    docker(args+['supabase/gotrue:v2.177.0'],values)
    for _ in range(60):
        try:
            if requests.get(f'http://127.0.0.1:{auth_port}/health',timeout=1).ok:break
        except requests.RequestException:pass
        time.sleep(.5)
    else:raise RuntimeError('QA OTP auth did not become healthy')
    q.update(email_otp=True,mail_port=mail_port,smtp_container=smtp);path.write_text(json.dumps(q));path.chmod(0o600)
    return q,template

def latest_code(q,address):
    root='http://127.0.0.1:'+str(q['mail_port'])
    for _ in range(30):
        r=requests.get(root+'/api/v1/messages',timeout=3);r.raise_for_status()
        for message in r.json().get('messages',[]):
            if not any(t.get('Address','').lower()==address.lower() for t in message.get('To',[])):continue
            full=requests.get(root+'/api/v1/message/'+message['ID'],timeout=3);full.raise_for_status();content=full.json()
            match=re.search(r'Verification code:\s*(\d{6,10})',content.get('Text','')) or re.search(r'Verification code:\s*(\d{6,10})',content.get('HTML',''))
            if match:return match.group(1)
        time.sleep(.2)
    raise RuntimeError('No actual QA email OTP reached the non-relaying sink')

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--config',type=pathlib.Path,required=True);parser.add_argument('--fixture',type=pathlib.Path,required=True);parser.add_argument('--port',type=int,default=5000);a=parser.parse_args()
    q,template=prepare(a.config)
    sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'apps/api/tests'))
    from test_api import LiveIntegration
    import os
    os.environ['SMARTCLAMP_QA_CONFIG']=str(a.config);LiveIntegration.setUpClass();t=LiveIntegration();t.setUp();owner=t.user('homeowner')
    if not str(a.fixture.resolve()).startswith('/tmp/'):raise RuntimeError('Private fixture must stay under /tmp')
    a.fixture.touch(mode=0o600);a.fixture.write_text(json.dumps({'owner':owner,'mail_url':'http://127.0.0.1:'+str(q['mail_port'])}));a.fixture.chmod(0o600)
    print('Isolated email-OTP API ready; private fixture saved.',flush=True)
    try:t.app.run(host='127.0.0.1',port=a.port,debug=False,use_reloader=False)
    finally:template.shutdown();LiveIntegration.tearDownClass()
