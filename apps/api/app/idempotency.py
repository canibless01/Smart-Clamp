from functools import wraps
import hashlib
from flask import request,g,make_response,jsonify
from .db import transaction,one,query,json_text,DomainError

def idempotent(fn):
    @wraps(fn)
    def wrapped(*args,**kwargs):
        if request.method in ('GET','HEAD'):return fn(*args,**kwargs)
        key=request.headers.get('Idempotency-Key','')
        if not key or len(key)>128:raise DomainError('idempotency_required','A unique Idempotency-Key is required for this operation.')
        uid=getattr(g,'actor',{}).get('id');scope=request.method+':'+request.path;owner=uid or 'public'
        digest=hashlib.sha256(request.get_data()).hexdigest()
        with transaction() as c:
            query(c,'SELECT pg_advisory_xact_lock(hashtextextended(:scope,0))',scope=owner+scope+key)
            cached=one(c,"SELECT * FROM idempotency_keys WHERE coalesce(payer_id::text,'public')=:owner AND scope=:scope AND key=:key AND expires_at>now()",owner=owner,scope=scope,key=key)
            if cached:
                if cached['body_hash']!=digest:raise DomainError('idempotency_conflict','This request key was already used for different details.',409)
                return jsonify(cached['response']),cached['status_code']
            query(c,"DELETE FROM idempotency_keys WHERE coalesce(payer_id::text,'public')=:owner AND scope=:scope AND key=:key AND expires_at<=now()",owner=owner,scope=scope,key=key)
            response=make_response(fn(*args,**kwargs))
            if response.status_code<400:
                query(c,'INSERT INTO idempotency_keys(payer_id,scope,key,body_hash,response,status_code) VALUES(:uid,:scope,:key,:hash,CAST(:response AS jsonb),:code)',uid=uid,scope=scope,key=key,hash=digest,response=json_text(response.get_json()),code=response.status_code)
            return response
    return wrapped
