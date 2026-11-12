"""Check required configuration names without displaying credentials or implying launch approval."""
import os,sys
from pathlib import Path
from urllib.parse import urlparse
from dotenv import load_dotenv
from cryptography.fernet import Fernet
root=Path(__file__).resolve().parents[1];load_dotenv(root/'.env');load_dotenv(root/'apps/api/.env')
required=['DATABASE_URL','SUPABASE_URL','SUPABASE_ANON_KEY','DEVICE_HMAC_ENCRYPTION_KEY','PAYSTACK_SECRET_KEY','VTPASS_API_KEY','VTPASS_SECRET_KEY','APP_ORIGIN','PAYMENT_FEE_BPS','PAYMENT_FIXED_FEE_KOBO','PLATFORM_MARKUP_BPS']
missing=[name for name in required if not os.environ.get(name)];invalid=[]
if not os.environ.get('VTPASS_ELECTRICITY_SERVICES_JSON') and not os.environ.get('VTPASS_ELECTRICITY_SERVICE_ID'):missing.append('VTPASS_ELECTRICITY_SERVICES_JSON (or single service ID)')
for name in ['SUPABASE_URL','APP_ORIGIN']:
    if os.environ.get(name) and urlparse(os.environ[name]).scheme!='https':invalid.append(name+' must use HTTPS')
if os.environ.get('DATABASE_URL') and not os.environ['DATABASE_URL'].startswith(('postgresql://','postgresql+psycopg://','postgres://')):invalid.append('DATABASE_URL must be PostgreSQL')
if os.environ.get('DEVICE_HMAC_ENCRYPTION_KEY'):
    try:Fernet(os.environ['DEVICE_HMAC_ENCRYPTION_KEY'].encode())
    except (ValueError,TypeError):invalid.append('DEVICE_HMAC_ENCRYPTION_KEY is not a Fernet key')
for name in ['PAYMENT_FEE_BPS','PAYMENT_FIXED_FEE_KOBO','PLATFORM_MARKUP_BPS']:
    if os.environ.get(name):
        try:
            if int(os.environ[name])<0:raise ValueError()
        except ValueError:invalid.append(name+' must be a nonnegative integer')
for name in missing:print('Missing:',name)
for name in invalid:print('Invalid:',name)
if not missing and not invalid:print('Required configuration names and basic formats are present. This does not verify merchants, migrations, qualification or launch readiness.')
sys.exit(1 if missing or invalid else 0)
