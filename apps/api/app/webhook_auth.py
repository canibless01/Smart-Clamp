"""Current Paystack timestamped signatures, with explicit legacy-mode compatibility."""
import hashlib,hmac,re,time
from flask import current_app
from .db import DomainError
from .providers import config

def verify_paystack(raw,headers,now=None):
    modern=headers.get('Paystack-Signature','')
    secrets=[current_app.config.get(k) for k in ('PAYSTACK_WEBHOOK_SECRET','PAYSTACK_WEBHOOK_PREVIOUS_SECRET') if current_app.config.get(k)]
    if modern or secrets:
        # Once modern signing is configured, never downgrade to an untimestamped
        # legacy signature when the modern header is missing or malformed.
        stamp=None;signatures=[]
        for part in modern.split(','):
            key,separator,value=part.strip().partition('=')
            if not separator:continue
            if key=='t':
                if stamp is not None or not re.fullmatch(r'[0-9]{1,12}',value):raise DomainError('webhook_unauthorized','Payment webhook authentication failed.',401)
                stamp=int(value)
            elif key=='v1':
                kid,sep,signature=value.partition(':')
                if sep and re.fullmatch(r'whk_[A-Za-z0-9_-]+',kid) and re.fullmatch(r'[0-9a-f]{128}',signature):signatures.append(signature)
        if stamp is not None and abs((time.time() if now is None else now)-stamp)<=300:
            signed=str(stamp).encode()+b'.'+raw
            for secret in secrets:
                expected=hmac.new(secret.encode(),signed,hashlib.sha512).hexdigest()
                if any(hmac.compare_digest(expected,signature) for signature in signatures):return
    else:
        signature=headers.get('x-paystack-signature','')
        expected=hmac.new(config('PAYSTACK_SECRET_KEY').encode(),raw,hashlib.sha512).hexdigest()
        if re.fullmatch(r'[0-9a-f]{128}',signature) and hmac.compare_digest(expected,signature):return
    raise DomainError('webhook_unauthorized','Payment webhook authentication failed.',401)
