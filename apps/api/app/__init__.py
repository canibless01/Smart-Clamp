import os, uuid, hashlib, json, time, hmac, base64, logging
from pathlib import Path
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from sqlalchemy import create_engine, text
import jwt

# Load .env if present (python-dotenv)
try:
    from dotenv import load_dotenv
    # Load root .env plus apps/api/.env if they exist
    root_env = Path(__file__).resolve().parents[3] / ".env"
    api_env = Path(__file__).resolve().parents[1] / ".env"
    if root_env.exists():
        load_dotenv(root_env, override=False)
    if api_env.exists():
        load_dotenv(api_env, override=False)
except Exception:
    pass

JWT_SECRET = os.environ.get('JWT_SECRET', 'dev-secret-not-for-prod')
DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///smartclamp.db')
CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000')
LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')

logger = logging.getLogger('smartclamp.api')

def _create_engine():
    """Create SQLAlchemy engine with appropriate connect_args for sqlite/postgres."""
    db_url = DATABASE_URL
    # Normalize postgres:// -> postgresql://
    if db_url.startswith('postgres://'):
        db_url = db_url.replace('postgres://', 'postgresql://', 1)
    try:
        if db_url.startswith('sqlite'):
            engine = create_engine(db_url, connect_args={"check_same_thread": False}, future=True)
        else:
            engine = create_engine(db_url, pool_pre_ping=True, pool_size=5, max_overflow=10, future=True)
        # Test connection non-fatally
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info(f"Database connected: {db_url.split('@')[-1] if '@' in db_url else db_url}")
        return engine
    except Exception as e:
        logger.warning(f"Database unavailable ({db_url[:40]}...): {e} — falling back to in-memory stores for demo. Run migrations when ready.")
        return None

def create_app():
    app = Flask(__name__)
    app.config['JWT_SECRET'] = JWT_SECRET
    app.config['DATABASE_URL'] = DATABASE_URL

    # CORS: parse comma-separated origins
    origins = [o.strip() for o in CORS_ORIGINS.split(',') if o.strip()]
    CORS(app, supports_credentials=True, origins=origins, allow_headers=["Content-Type","Authorization","Idempotency-Key","X-Device-Signature","X-Paystack-Signature"], expose_headers=["X-Request-Id"])

    # Engine (lazy, may be None if DB not ready)
    app.db_engine = _create_engine()

    # Simple in-memory stores for demo when DB not ready or as cache
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
        'webhook_processed': {},
    }

    # Register routes
    from .routes import register_all
    register_all(app)

    @app.route('/api/v1/health', methods=['GET'])
    def health():
        db_ok = False
        if app.db_engine is not None:
            try:
                with app.db_engine.connect() as conn:
                    conn.execute(text("SELECT 1"))
                db_ok = True
            except Exception:
                pass
        return jsonify({
            'status': 'ok',
            'version': '2.0.0',
            'database': 'connected' if db_ok else 'in-memory (set DATABASE_URL and run migrations for persistence)',
            'timestamp': time.time(),
        })

    @app.route('/api/v1/openapi.yaml', methods=['GET'])
    def openapi():
        spec_path = Path(__file__).resolve().parents[3] / "contracts" / "openapi.yaml"
        if spec_path.exists():
            return spec_path.read_text(), 200, {'Content-Type': 'text/yaml'}
        return jsonify({'code':'not_found','message':'Spec not found','request_id':str(uuid.uuid4())}),404

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'code':'not_found','message':'Not found','request_id':str(uuid.uuid4())}),404

    @app.errorhandler(500)
    def internal(e):
        logger.exception("Internal error")
        return jsonify({'code':'internal','message':'Internal error','request_id':str(uuid.uuid4())}),500

    @app.before_request
    def idempotency_check():
        g.request_id = str(uuid.uuid4())
        # hash body for idempotency binding (24h payer+scope binding enforced per route)
        try:
            g.body_hash = hashlib.sha256(request.get_data() or b'').hexdigest()
        except Exception:
            g.body_hash = ""

    @app.after_request
    def add_request_id(resp):
        resp.headers['X-Request-Id'] = g.get('request_id', '')
        return resp

    return app

def make_token(user_id, role, phone):
    # Re-read JWT_SECRET at call time so tests with env override work
    secret = os.environ.get('JWT_SECRET', JWT_SECRET)
    payload = {
        'sub': user_id,
        'role': role,
        'phone': phone,
        'exp': int(time.time())+3600,
        'iat': int(time.time()),
        'iss':'smartclamp',
        'aud':'smartclamp-web'
    }
    return jwt.encode(payload, secret, algorithm='HS256')

def verify_token(token):
    secret = os.environ.get('JWT_SECRET', JWT_SECRET)
    try:
        data = jwt.decode(token, secret, algorithms=['HS256'], audience='smartclamp-web', issuer='smartclamp')
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
