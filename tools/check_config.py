"""Validate launch configuration and optionally applied SQL without displaying secrets.
A successful check never qualifies merchants, electrical hardware or unfinished features.
"""
import argparse,hashlib,json,os,sys
from pathlib import Path
from urllib.parse import urlparse
from dotenv import load_dotenv
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
root=Path(__file__).resolve().parents[1]

def validate(values):
    required=['DATABASE_URL','SUPABASE_URL','SUPABASE_ANON_KEY','DEVICE_HMAC_ENCRYPTION_KEY','PAYSTACK_SECRET_KEY','VTPASS_API_KEY','VTPASS_SECRET_KEY','APP_ORIGIN','PAYMENT_FEE_BPS','PAYMENT_FIXED_FEE_KOBO','PLATFORM_MARKUP_BPS','REPORT_SIGNING_KEY_FILE']
    if values.get('SMS_ENABLED')=='true':required+=['AT_USERNAME','AT_API_KEY','AT_SENDER_ID']
    if values.get('OTA_ENABLED')=='true':required+=['OTA_SIGNING_KEY_FILE']
    required+=['LEGAL_TERMS_VERSION','LEGAL_PRIVACY_VERSION']
    missing=[name for name in required if not values.get(name)];invalid=[]
    for name in ('LEGAL_TERMS_VERSION','LEGAL_PRIVACY_VERSION'):
        if values.get(name) and (values[name].lower().startswith('preview') or len(values[name])>100):invalid.append(name+' must identify an approved published legal document, not a preview')
    if not values.get('VTPASS_ELECTRICITY_SERVICES_JSON') and not values.get('VTPASS_ELECTRICITY_SERVICE_ID'):missing.append('VTPASS_ELECTRICITY_SERVICES_JSON (or single service ID)')
    for name in ['SUPABASE_URL','SUPABASE_AUTH_URL','APP_ORIGIN','AT_SMS_URL']:
        if values.get(name):
            u=urlparse(values[name])
            if u.scheme!='https' or not u.hostname or u.username or u.password or u.query or u.fragment:invalid.append(name+' must use HTTPS without URL credentials, query or fragment')
            if name=='APP_ORIGIN' and u.path not in ('','/'):invalid.append('APP_ORIGIN must be an origin without a path')
    if values.get('DATABASE_URL') and not values['DATABASE_URL'].startswith(('postgresql://','postgresql+psycopg://','postgres://')):invalid.append('DATABASE_URL must be PostgreSQL')
    if values.get('DEVICE_HMAC_ENCRYPTION_KEY'):
        try:Fernet(values['DEVICE_HMAC_ENCRYPTION_KEY'].encode())
        except (ValueError,TypeError):invalid.append('DEVICE_HMAC_ENCRYPTION_KEY is not a Fernet key')
    fees={}
    for name in ['PAYMENT_FEE_BPS','PAYMENT_FIXED_FEE_KOBO','PLATFORM_MARKUP_BPS']:
        if values.get(name):
            try:
                fees[name]=int(values[name])
                if fees[name]<0:raise ValueError()
            except (ValueError,TypeError):invalid.append(name+' must be a nonnegative integer')
    if fees.get('PAYMENT_FEE_BPS',0)+fees.get('PLATFORM_MARKUP_BPS',0)>=10000:invalid.append('Percentage fees must leave a positive electricity value')
    if values.get('VTPASS_ELECTRICITY_SERVICES_JSON'):
        try:
            services=json.loads(values['VTPASS_ELECTRICITY_SERVICES_JSON'])
            if not isinstance(services,list) or not services or any(not isinstance(s,dict) or set(s)!={'id','name'} or not isinstance(s['id'],str) or not s['id'] or not isinstance(s['name'],str) or not s['name'] for s in services) or len({s['id'] for s in services})!=len(services):raise ValueError()
        except (ValueError,TypeError,KeyError):invalid.append('VTPASS_ELECTRICITY_SERVICES_JSON must contain unique approved id/name entries')
    fingerprints=[]
    for name in ('REPORT_SIGNING_KEY_FILE','OTA_SIGNING_KEY_FILE'):
        if not values.get(name):continue
        try:
            path=Path(values[name]);key=serialization.load_pem_private_key(path.read_bytes(),password=None)
            if not isinstance(key,rsa.RSAPrivateKey) or key.key_size<3072:raise ValueError()
            if path.stat().st_mode&0o077:invalid.append(name+' must not be readable by other users or groups')
            fingerprints.append(key.public_key().public_bytes(serialization.Encoding.DER,serialization.PublicFormat.SubjectPublicKeyInfo))
        except (OSError,ValueError,TypeError):invalid.append(name+' must identify a readable private RSA key of at least 3072 bits')
    if len(fingerprints)==2 and fingerprints[0]==fingerprints[1]:invalid.append('Report and firmware signing keys must be distinct')
    for name in ('OTA_ENABLED','SMS_ENABLED'):
        if values.get(name) not in (None,'','true','false'):invalid.append(name+' must be lowercase true or false')
    return missing,invalid

def check_database(url):
    import psycopg
    failures=[]
    try:
        with psycopg.connect(url.replace('postgresql+psycopg://','postgresql://'),connect_timeout=5) as conn:
            conn.execute('SET TRANSACTION READ ONLY')
            applied=dict(conn.execute('SELECT name,sha256 FROM public.schema_migrations').fetchall())
            for path in sorted((root/'database/migrations').glob('*.sql')):
                if path.name not in applied:failures.append('Pending migration: '+path.name)
                elif applied[path.name]!=hashlib.sha256(path.read_bytes()).hexdigest():failures.append('Applied migration checksum differs: '+path.name)
    except psycopg.Error:failures.append('Database schema could not be verified. Check connectivity and run the migration tool; credentials were not logged.')
    return failures

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--database',action='store_true',help='Read-only validation of applied migration names/checksums');a=p.parse_args()
    load_dotenv(root/'.env');load_dotenv(root/'apps/api/.env');missing,invalid=validate(os.environ)
    for name in missing:print('Missing:',name)
    for name in invalid:print('Invalid:',name)
    db_errors=check_database(os.environ['DATABASE_URL']) if a.database and os.environ.get('DATABASE_URL') else []
    for error in db_errors:print(error)
    if not missing and not invalid and not db_errors:print('Configuration formats'+(' and applied migration checksums' if a.database else '')+' passed. Merchant activation, actual hardware and remaining implementation/launch gates are not approved by this check.')
    sys.exit(1 if missing or invalid or db_errors else 0)
