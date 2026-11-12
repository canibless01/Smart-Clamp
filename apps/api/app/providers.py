"""Real configured HTTP providers. No development secrets, fake accounts or success fallbacks."""
import re,json
from urllib.parse import urlparse
import requests
from flask import current_app
from .db import DomainError

def config(name):
    value=current_app.config.get(name)
    if not value:raise DomainError('integration_not_configured',f'{name} must be configured before this service can be used.',503)
    return value

def call(url,method='GET',headers=None,payload=None,params=None):
    parsed=urlparse(url)
    if parsed.scheme!='https' and not(current_app.testing and parsed.scheme=='http' and parsed.hostname in ('127.0.0.1','localhost')):
        raise DomainError('invalid_provider_configuration','Provider connections require HTTPS.',503)
    try:
        res=requests.request(method,url,headers=headers,json=payload,params=params,timeout=(5,20),allow_redirects=False)
        data={} if res.status_code==204 else res.json()
    except (requests.RequestException,ValueError):raise DomainError('provider_unavailable','The connected provider could not complete the request.',503)
    if res.status_code>=500:raise DomainError('provider_unavailable','The connected provider is temporarily unavailable.',503)
    if res.status_code>=400:
        raise DomainError('provider_rejected','The provider rejected this request. Check the account or credentials and retry.',401 if res.status_code in(400,401) and '/auth/v1/' in url else 422)
    return data

def auth_request(path,method='GET',payload=None,token=None):
    try:
        return call((current_app.config.get('SUPABASE_AUTH_URL') or config('SUPABASE_URL').rstrip('/')+'/auth/v1').rstrip('/')+'/'+path,method,{'apikey':config('SUPABASE_ANON_KEY'),'Authorization':'Bearer '+(token or config('SUPABASE_ANON_KEY'))},payload)
    except DomainError as e:
        if e.code=='provider_rejected' and path.startswith(('token','user','verify')):raise DomainError('unauthorized','The sign-in or verification details were not accepted.',401)
        raise

def paystack(path,method='GET',payload=None):
    return call(current_app.config.get('PAYSTACK_API_URL','https://api.paystack.co').rstrip('/')+'/'+path,method,{'Authorization':'Bearer '+config('PAYSTACK_SECRET_KEY')},payload)

def vtpass(path,payload):
    headers={'api-key':config('VTPASS_API_KEY'),'secret-key':config('VTPASS_SECRET_KEY'),'Content-Type':'application/json'}
    return call(current_app.config.get('VTPASS_API_URL','https://vtpass.com/api').rstrip('/')+'/'+path,'POST',headers,payload)

def electricity_services():
    source=current_app.config.get('VTPASS_ELECTRICITY_SERVICES_JSON')
    if source:
        try:
            services=json.loads(source)
            if not isinstance(services,list) or not services or any(not isinstance(s,dict) or set(s)!={'id','name'} or not re.fullmatch(r'[a-z0-9-]{2,80}',s['id']) or not isinstance(s['name'],str) or not 1<=len(s['name'])<=100 for s in services):raise ValueError()
            if len({s['id'] for s in services})!=len(services):raise ValueError()
            return services
        except (ValueError,TypeError,KeyError):raise DomainError('provider_configuration_invalid','The electricity provider catalogue must be reviewed.',503)
    service=config('VTPASS_ELECTRICITY_SERVICE_ID')
    return [{'id':service,'name':current_app.config.get('VTPASS_ELECTRICITY_SERVICE_NAME') or service}]

def validate_meter(number,service=None):
    if not re.fullmatch(r'\d{6,20}',str(number)):raise DomainError('validation_error','Enter a meter number containing 6–20 digits.')
    services=electricity_services()
    service=service or (services[0]['id'] if len(services)==1 else None)
    if not service or service not in [s['id'] for s in services]:raise DomainError('provider_required','Choose an electricity provider from the supported list.')
    data=vtpass('merchant-verify',{'billersCode':number,'serviceID':service,'type':'prepaid'})
    content=data.get('content') or {}
    if str(data.get('code'))!='000' or content.get('error'):return {'valid':False}
    name=content.get('Customer_Name') or content.get('CustomerName')
    if not name:raise DomainError('provider_response_invalid','The meter provider returned an incomplete account record.',503)
    masked=' '.join(part[0]+'***' for part in str(name).split())
    return {'valid':True,'customer_name':masked,'disco_name':service,'provider_name':'VTPass','utility_type':'electricity'}
