import uuid, time, hashlib, json, hmac, base64
from flask import request, jsonify, g
from .. import require_auth, api_error, make_token, verify_token

# idempotency helper: 24h binding payer+request hash
def check_idempotency(key, body_hash):
    from flask import current_app
    stores = current_app.stores
    if not key:
        return None
    entry = stores['idempotency'].get(key)
    if entry and entry['body_hash'] != body_hash:
        return api_error('idempotency_conflict','Idempotency-Key reuse with different body',409)
    if entry:
        return jsonify(entry['response']), entry['status']
    return None

def save_idempotency(key, body_hash, response, status):
    if not key: return
    from flask import current_app
    current_app.stores['idempotency'][key] = {'body_hash':body_hash,'response':response,'status':status,'at':time.time()}

def register_all(app):
    from .public import bp as public_bp
    from .auth import bp as auth_bp
    from .buildings import bp as buildings_bp
    from .devices import bp as devices_bp
    from .payments import bp as payments_bp
    from .dashboards import bp as dashboards_bp
    from .ops import bp as ops_bp
    from .misc import bp as misc_bp

    app.register_blueprint(public_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(buildings_bp)
    app.register_blueprint(devices_bp)
    app.register_blueprint(payments_bp)
    app.register_blueprint(dashboards_bp)
    app.register_blueprint(ops_bp)
    app.register_blueprint(misc_bp)

    # Device ingestion routes (no bearer, HMAC)
    from .ingest import bp as ingest_bp
    app.register_blueprint(ingest_bp)

    # NOTE: before_request / after_request for request_id are now in app/__init__.py
    # to avoid duplicate handlers. Do not register again here.
