import os,uuid
from pathlib import Path
from datetime import datetime,date
from decimal import Decimal
from flask import Flask,jsonify,request,g
from flask.json.provider import DefaultJSONProvider
from flask_cors import CORS
from sqlalchemy.exc import IntegrityError,SQLAlchemyError
from dotenv import load_dotenv
from .db import DomainError,init_database,transaction,scalar

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
    app.config['MAX_CONTENT_LENGTH']=65536
    init_database(app)
    origins=app.config.get('CORS_ORIGINS','').split(',')
    if any(origins):CORS(app,resources={r'/api/*':{'origins':[o.strip() for o in origins if o.strip()]}},supports_credentials=False)
    @app.before_request
    def start():g.request_id=str(uuid.uuid4())
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
    @app.get('/api/v1/health')
    def health():
        try:
            with transaction() as c:ready=scalar(c,"SELECT to_regclass('public.provider_events') IS NOT NULL")
        except Exception:return jsonify(status='unavailable',database='unavailable'),503
        return jsonify(status='ready' if ready else 'migration_required',database='connected'),200 if ready else 503
    @app.get('/api/v1/openapi.yaml')
    def spec():return app.response_class((root/'contracts/runtime-openapi.yaml').read_text(),mimetype='application/yaml')
    from .live_auth import bp as auth
    from .live_resources import bp as resources
    from .live_devices import bp as devices
    from .live_payments import bp as payments
    from .live_workflows import bp as workflows
    for bp in(auth,resources,devices,payments,workflows):app.register_blueprint(bp)
    return app
