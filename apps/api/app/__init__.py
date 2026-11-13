import os,uuid,hashlib
from pathlib import Path
from datetime import datetime,date
from decimal import Decimal
from flask import Flask,jsonify,request,g
from flask.json.provider import DefaultJSONProvider
from flask_cors import CORS
from werkzeug.exceptions import BadRequest,RequestEntityTooLarge
from sqlalchemy.exc import IntegrityError,SQLAlchemyError
from dotenv import load_dotenv
from .db import DomainError,init_database,transaction,rows

class JSONProvider(DefaultJSONProvider):
    def default(self,o):
        if isinstance(o,(datetime,date)):return o.isoformat()
        if isinstance(o,(uuid.UUID,Decimal)):return str(o)
        return super().default(o)

def create_app(settings=None):
    root=Path(__file__).resolve().parents[3]
    load_dotenv(root/'.env',override=False);load_dotenv(root/'apps/api/.env',override=False)
    app=Flask(__name__);app.json=JSONProvider(app);app.config.update(os.environ)
    if settings:app.config.update(settings)
    app.config['MAX_CONTENT_LENGTH']=3*1024*1024
    expected_migrations={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (root/'database/migrations').glob('*.sql')}
    init_database(app)
    origins=app.config.get('CORS_ORIGINS','').split(',')
    if any(origins):CORS(app,resources={r'/api/*':{'origins':[o.strip() for o in origins if o.strip()]}},supports_credentials=False)
    @app.before_request
    def start():
        g.request_id=str(uuid.uuid4())
        if request.path!='/api/v1/ops/firmware/artifacts' and request.content_length and request.content_length>65536:
            raise DomainError('request_too_large','This request exceeds the endpoint limit.',413)
        if request.is_json:
            raw=request.get_data(cache=True)
            if request.path!='/api/v1/ops/firmware/artifacts' and len(raw)>65536:raise DomainError('request_too_large','This request exceeds the endpoint limit.',413)
            if raw and not request.path.startswith('/api/v1/webhooks/') and not isinstance(request.get_json(),dict):raise DomainError('invalid_json','A JSON object is required.')
    @app.after_request
    def finish(response):
        response.headers['X-Request-Id']=getattr(g,'request_id','')
        response.headers['Cache-Control']='no-store'
        response.headers['X-Content-Type-Options']='nosniff'
        return response
    @app.errorhandler(DomainError)
    def domain_error(e):return jsonify(code=e.code,message=e.message,request_id=getattr(g,'request_id','')),e.status
    @app.errorhandler(IntegrityError)
    def conflict(e):return jsonify(code='conflict',message='This operation conflicts with an existing record.',request_id=g.request_id),409
    @app.errorhandler(SQLAlchemyError)
    def database_error(e):
        app.logger.error('Database operation failed; request_id=%s type=%s',g.request_id,type(e).__name__)
        return jsonify(code='database_unavailable',message='The database is unavailable or migrations are incomplete.',request_id=g.request_id),503
    @app.errorhandler(404)
    def not_found(e):return jsonify(code='not_found',message='Resource not found.',request_id=getattr(g,'request_id','')),404
    @app.errorhandler(BadRequest)
    def invalid_json(e):return jsonify(code='invalid_json',message='A valid JSON object is required.',request_id=getattr(g,'request_id','')),400
    @app.errorhandler(RequestEntityTooLarge)
    def too_large(e):return jsonify(code='request_too_large',message='This request exceeds the endpoint limit.',request_id=getattr(g,'request_id','')),413
    @app.get('/api/v1/health')
    def health():
        try:
            with transaction() as c:
                applied={r['name']:r['sha256'] for r in rows(c,'SELECT name,sha256 FROM schema_migrations')}
                ready=bool(expected_migrations) and all(applied.get(name)==digest for name,digest in expected_migrations.items())
        except Exception:return jsonify(status='unavailable',database='unavailable'),503
        return jsonify(status='api_ready' if ready else 'migration_required',database='connected',schema='current' if ready else 'incomplete_or_changed',worker='not_checked',merchant_and_hardware='not_checked'),200 if ready else 503
    @app.get('/api/v1/openapi.yaml')
    def spec():return app.response_class((root/'contracts/runtime-openapi.yaml').read_text(),mimetype='application/yaml')
    from .live_auth import bp as auth
    from .live_resources import bp as resources
    from .live_devices import bp as devices
    from .live_payments import bp as payments
    from .live_workflows import bp as workflows
    from .firmware import bp as firmware
    from .reports import bp as reports
    for bp in(auth,resources,devices,payments,workflows,firmware,reports):app.register_blueprint(bp)
    return app
