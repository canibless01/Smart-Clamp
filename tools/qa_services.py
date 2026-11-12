"""Start disposable LOCAL PostgreSQL + real GoTrue for integration tests. Never a production stack.
Phone auto-confirm is restricted to this isolated test service; no merchant or hardware credentials.
"""
import argparse,json,os,pathlib,secrets,subprocess,time,uuid
import jwt,psycopg,requests
from migrate import migrate

def docker(args,values=None):
    result=subprocess.run(['docker',*args],env={**os.environ,**(values or {})},capture_output=True,text=True)
    if result.returncode:raise RuntimeError('QA container operation failed: '+args[0]+'; inspect Docker locally without sharing credential-bearing logs.')
    return result.stdout.strip()

def start(path,port,auth_port):
    if path.exists():raise RuntimeError('Config already exists; use its running services or choose a new config path.')
    name='smartclamp-qa-'+uuid.uuid4().hex[:12];q={'name':name,'password':secrets.token_urlsafe(32),'port':port,'auth_port':auth_port,'jwt_secret':secrets.token_urlsafe(48)}
    for role,key in [('anon','anon_key'),('service_role','service_key')]:q[key]=jwt.encode({'role':role,'iss':'supabase','exp':4070908800},q['jwt_secret'],algorithm='HS256')
    path.parent.mkdir(parents=True,exist_ok=True);path.touch(mode=0o600);path.write_text(json.dumps(q));path.chmod(0o600)
    network=name+'-network';docker(['network','create',network])
    docker(['run','-d','--name',name,'--network',network,'-p',f'127.0.0.1:{port}:5432','-e','POSTGRES_PASSWORD','-e','POSTGRES_DB','postgres:16'],{'POSTGRES_PASSWORD':q['password'],'POSTGRES_DB':'smartclamp'})
    url=f"postgresql://postgres:{q['password']}@127.0.0.1:{port}/smartclamp"
    for attempt in range(60):
        try:
            with psycopg.connect(url,connect_timeout=1) as c:
                c.execute('CREATE SCHEMA IF NOT EXISTS auth')
                for role in ['anon','authenticated']:c.execute('DO $$ BEGIN CREATE ROLE '+role+' NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$')
                c.execute("CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$")
            break
        except psycopg.OperationalError:time.sleep(.5)
    else:raise RuntimeError('QA PostgreSQL did not become ready.')
    values={'GOTRUE_API_HOST':'0.0.0.0','PORT':'9999','GOTRUE_API_PORT':'9999','API_EXTERNAL_URL':f'http://localhost:{auth_port}','GOTRUE_SITE_URL':'http://localhost:3000','GOTRUE_DB_DRIVER':'postgres','GOTRUE_DB_DATABASE_URL':f"postgres://postgres:{q['password']}@{name}:5432/smartclamp?search_path=auth",'GOTRUE_JWT_SECRET':q['jwt_secret'],'GOTRUE_JWT_EXP':'3600','GOTRUE_JWT_AUD':'authenticated','GOTRUE_EXTERNAL_EMAIL_ENABLED':'false','GOTRUE_EXTERNAL_PHONE_ENABLED':'true','GOTRUE_SMS_AUTOCONFIRM':'true','GOTRUE_DISABLE_SIGNUP':'false'}
    args=['run','-d','--name',name+'-auth','--network',network,'-p',f'127.0.0.1:{auth_port}:9999']
    for key in values:args+=['-e',key]
    docker(args+['supabase/gotrue:v2.177.0'],values)
    for attempt in range(60):
        try:
            if requests.get(f'http://127.0.0.1:{auth_port}/health',timeout=1).ok:break
        except requests.RequestException:pass
        time.sleep(.5)
    else:raise RuntimeError('QA auth service did not become ready.')
    migrate(url);print('Isolated local QA services ready. Config:',path)

def stop(path):
    q=json.loads(path.read_text());name=q['name']
    if not name.startswith('smartclamp-qa-') or len(name)>80:raise RuntimeError('Not a QA stack')
    for container in [name+'-auth',name]:docker(['rm','-f',container])
    docker(['network','rm',name+'-network']);path.unlink();print('QA services removed.')

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('action',choices=['start','stop']);parser.add_argument('--config',type=pathlib.Path,required=True);parser.add_argument('--port',type=int,default=15432);parser.add_argument('--auth-port',type=int,default=15433);a=parser.parse_args()
    if a.action=='start':start(a.config,a.port,a.auth_port)
    else:stop(a.config)
