"""Export implemented route surface separately from the broader product contract."""
import sys,pathlib,re,yaml,json
root=pathlib.Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'apps/api'))
from app import create_app
app=create_app({'DATABASE_URL':''})
paths={};routes=[]
public={'auth_options','oauth_start','oauth_exchange','signup','login','verify_phone','refresh','recovery','phone_recovery','complete_phone_recovery','meter_validate','electricity_providers','events','poll','receipt','download','firmware_receipt','public_report','webhook','payment_public','transfer_instructions','unsupported_webhook','organization','capabilities','health','spec'}
for rule in sorted(app.url_map.iter_rules(),key=lambda r:r.rule):
    if not rule.rule.startswith('/api/v1/'):continue
    path=rule.rule[len('/api/v1'):];params=re.findall(r'<(?:[^:>]+:)?([^>]+)>',path);path=re.sub(r'<(?:[^:>]+:)?([^>]+)>',r'{\1}',path)
    for method in sorted(rule.methods-{'OPTIONS','HEAD'}):
        endpoint=rule.endpoint.rsplit('.',1)[-1];op={'operationId':rule.endpoint.replace('.','_')+'_'+method.lower()+'_'+re.sub(r'[^a-zA-Z0-9]+','_',path).strip('_'),'summary':endpoint.replace('_',' ').capitalize(),'security':[] if endpoint in public else [{'bearerAuth':[]}], 'responses':{str(code):{'description':desc,'content':{'application/json':{'schema':{'type':'object','additionalProperties':True}}}} for code,desc in [(200,'Committed result or current record'),(201,'Created record, when applicable'),(202,'Accepted or verification/pending outcome, when applicable'),(400,'Invalid request'),(401,'Authentication or verification required'),(403,'Role/scope/entitlement denied'),(404,'Resource not found within authorized scope'),(409,'State conflict or idempotency mismatch'),(422,'Unsupported action or missing qualification'),(429,'Rate limited'),(503,'Integration, rollout or database unavailable')]}}
        if params:op['parameters']=[{'name':p,'in':'path','required':True,'schema':{'type':'string'}} for p in params]
        if method in ('POST','PATCH','PUT'):op['requestBody']={'required':True,'content':{'application/json':{'schema':{'type':'object','additionalProperties':True}}}}
        paths.setdefault(path,{})[method.lower()]=op;routes.append({'method':method,'path':'/api/v1'+path,'handler':rule.endpoint})

def body(path,method,properties,required):
    paths[path][method]['requestBody']={'required':True,'content':{'application/json':{'schema':{'type':'object','properties':properties,'required':required,'additionalProperties':False}}}}
string={'type':'string'};uid={'type':'string','format':'uuid'}
body('/devices/claim','post',{'claim_code':{'type':'string','minLength':32,'maxLength':128},'room_id':uid},['claim_code'])
body('/meters/validate','post',{'meter_number':{'type':'string','pattern':'^[0-9]{6,20}$'},'service_id':string,'utility_type':{'type':'string','enum':['electricity']}},['meter_number'])
body('/meters/link','post',{'meter_number':{'type':'string','pattern':'^[0-9]{6,20}$'},'service_id':string},['meter_number'])
body('/payments/quotes','post',{'destination_token':string,'amount_kobo':{'type':'integer','minimum':100,'maximum':100000000},'utility_type':{'type':'string','enum':['electricity']}},['destination_token','amount_kobo'])
body('/payments/checkout','post',{'quote_id':uid,'payer_email':{'type':'string','format':'email'},'return_path':string},['quote_id','payer_email'])
body('/devices/{device_id}/relay','post',{'state':{'type':'string','enum':['on','off']},'authorization_ref':uid},['state','authorization_ref'])
body('/invitations/accept','post',{'token':string},['token'])
body('/reports','post',{'device_id':uid,'period_start':{'type':'string','format':'date'},'period_end':{'type':'string','format':'date'}},['device_id','period_start','period_end'])
body('/jobs/{job_id}/actions','post',{
    'action':{'type':'string','enum':['assign','start','fail_diagnostics','submit','rma','close','reopen']},
    'expected_version':{'type':'integer','minimum':1},'assignee_id':uid,
    'note':{'type':'string','minLength':10,'maxLength':4000}},['action','expected_version','note'])
for path in ['/auth/signup','/auth/login']:
    props={'phone':{'type':'string','pattern':r'^\+[1-9]\d{7,14}$'},'email':{'type':'string','format':'email'},'password':{'type':'string','minLength':8}}
    required=['password']
    if path.endswith('signup'):
        props.update({'role':{'type':'string','enum':['homeowner','tenant','landlord','agent','referrer']},'full_name':string,'accepted_terms':{'type':'boolean','enum':[True]},'terms_version':string,'privacy_version':string})
        required+=['role','full_name','accepted_terms','terms_version','privacy_version']
    body(path,'post',props,required)
    paths[path]['post']['requestBody']['content']['application/json']['schema']['oneOf']=[{'required':['phone'],'not':{'required':['email']}},{'required':['email'],'not':{'required':['phone']}}]
body('/auth/onboarding','post',{'full_name':string,'role':string,'accepted_terms':{'type':'boolean','enum':[True]},'terms_version':string,'privacy_version':string},['full_name','accepted_terms','terms_version','privacy_version'])
body('/auth/oauth/start','post',{'code_challenge':string,'flow_id':string},['code_challenge','flow_id'])
body('/auth/oauth/exchange','post',{'code':string,'code_verifier':string},['code','code_verifier'])
for path,method,mime in [('/device/firmware/download','post','application/octet-stream'),('/exports/{export_id}','get','text/csv')]:
    paths[path][method]['responses']['200']={'description':'Authenticated stored artifact bytes','content':{mime:{'schema':{'type':'string','format':'binary'}}}}
spec={'openapi':'3.0.3','info':{'title':'SmartClamp implemented API surface','version':'0.3.0','description':'Implemented route surface. Response objects are intentionally open where typed schemas are not yet reconciled. See docs/API-RUNTIME.md and docs/LAUNCH-READINESS.md. This is not proof that every operation in the broader product contract is implemented.'},'servers':[{'url':'/api/v1'}],'components':{'securitySchemes':{'bearerAuth':{'type':'http','scheme':'bearer'}}},'paths':paths}
(root/'contracts/runtime-openapi.yaml').write_text(yaml.safe_dump(spec,sort_keys=False,allow_unicode=True));(root/'contracts/runtime-routes.json').write_text(json.dumps(routes,indent=2)+'\n');print('Exported implemented operations:',len(routes))
