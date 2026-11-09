import os, uuid, hashlib, json, time, hmac, base64
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from sqlalchemy import create_engine, text
import jwt

JWT_SECRET = os.environ.get('JWT_SECRET', 'dev-secret-not-for-prod')
DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///smartclamp.db')

def create_app():
    app = Flask(__name__)
    app.config['JWT_SECRET'] = JWT_SECRET
    app.config['DATABASE_URL'] = DATABASE_URL

    CORS(app, supports_credentials=True)

    # Simple in-memory stores for demo when DB not ready
    app.stores = {
        'users': {},  # phone -> user
        'buildings': {},
        'rooms': {},
        'devices': {},
        'payments': {},
        'quotes': {},
        'idempotency': {},  # key -> response
        'inbox': {},  # device dedup
        'wallets': {},
        'commands': {},
        'outbox': [],
    }

    # Register routes
    from .routes import register_all
    register_all(app)

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'code':'not_found','message':'Not found','request_id':str(uuid.uuid4())}),404

    @app.errorhandler(500)
    def internal(e):
        return jsonify({'code':'internal','message':'Internal error','request_id':str(uuid.uuid4())}),500

    return app

def make_token(user_id, role, phone):
    payload = {
        'sub': user_id,
        'role': role,
        'phone': phone,
        'exp': int(time.time())+3600,
        'iat': int(time.time()),
        'iss':'smartclamp',
        'aud':'smartclamp-web'
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

def verify_token(token):
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=['HS256'], audience='smartclamp-web', issuer='smartclamp')
        return data
    except jwt.PyJWTError:
        return None

def require_auth():
    auth = request.headers.get('Authorization','')
    if not auth.startswith('Bearer '):
        return None
    token = auth[7:]
    return verify_token(token)

def api_error(code, message, status, retry_after=None):
    body = {'code':code,'message':message,'request_id':str(uuid.uuid4())}
    if retry_after: body['retry_after_seconds']=retry_after
    return jsonify(body), status
