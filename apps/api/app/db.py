"""PostgreSQL only: failed connections never become in-memory success."""
from contextlib import contextmanager
from datetime import date,datetime
from decimal import Decimal
from uuid import UUID
import json
from flask import current_app,g
from sqlalchemy import create_engine,text

class DomainError(Exception):
    def __init__(self,code,message,status=400):
        super().__init__(message);self.code=code;self.message=message;self.status=status

def init_database(app):
    url=app.config.get('DATABASE_URL','')
    app.db_engine=None
    if not url:return
    if url.startswith('postgres://'):url=url.replace('postgres://','postgresql+psycopg://',1)
    elif url.startswith('postgresql://'):url=url.replace('postgresql://','postgresql+psycopg://',1)
    if not url.startswith('postgresql+psycopg://'):raise ValueError('DATABASE_URL must be PostgreSQL; no fallback database is supported')
    app.db_engine=create_engine(url,pool_pre_ping=True,pool_size=5,max_overflow=5,connect_args={'connect_timeout':5})

@contextmanager
def transaction():
    if current_app.db_engine is None:raise DomainError('database_not_configured','Database configuration is required.',503)
    if getattr(g,'db_connection',None) is not None:
        yield g.db_connection
        return
    with current_app.db_engine.begin() as conn:
        g.db_connection=conn
        try:yield conn
        finally:g.db_connection=None

def query(conn,sql,**params):return conn.execute(text(sql),params)
def one(conn,sql,**params):return query(conn,sql,**params).mappings().first()
def rows(conn,sql,**params):return [dict(r) for r in query(conn,sql,**params).mappings()]
def scalar(conn,sql,**params):return query(conn,sql,**params).scalar()
def json_text(value):return json.dumps(value,default=encode,separators=(',',':'),sort_keys=True)
def encode(value):
    if isinstance(value,(UUID,Decimal)):return str(value)
    if isinstance(value,(date,datetime)):return value.isoformat()
    raise TypeError(type(value).__name__)
def audit(conn,actor,action,target=None,metadata=None):
    query(conn,'INSERT INTO audit_log(actor_id,action,target_id,metadata) VALUES(:actor,:action,:target,CAST(:metadata AS jsonb))',actor=actor,action=action,target=target,metadata=json_text(metadata or {}))
def outbox(conn,event,aggregate,payload):
    query(conn,"INSERT INTO outbox(aggregate_type,aggregate_id,event_type,payload) VALUES('device',:id,:event,CAST(:payload AS jsonb))",id=aggregate,event=event,payload=json_text(payload))
def uuid_string(value):
    try:return str(UUID(str(value)))
    except (ValueError,TypeError,AttributeError):raise DomainError('invalid_id','A valid resource reference is required.',400)

def device(conn,actor,device_id,write=False):
    did=uuid_string(device_id)
    row=one(conn,"""SELECT d.* FROM devices d WHERE d.id=:id AND (
      d.owner_id=:uid OR EXISTS(SELECT 1 FROM occupancies o WHERE o.room_id=d.room_id AND o.tenant_id=:uid AND o.end_at IS NULL)
      OR (:readonly AND (EXISTS(SELECT 1 FROM buildings b LEFT JOIN rooms r ON r.building_id=b.id WHERE b.landlord_id=:uid AND (b.id=d.building_id OR r.id=d.room_id))
      OR EXISTS(SELECT 1 FROM device_viewers v WHERE v.device_id=d.id AND v.viewer_user_id=:uid AND v.revoked_at IS NULL AND(v.expires_at IS NULL OR v.expires_at>now())))))""",id=did,uid=actor['id'],readonly=not write)
    if not row:raise DomainError('not_found','Device not found.',404)
    return dict(row)

def building(conn,actor,bid):
    row=one(conn,'SELECT * FROM buildings WHERE id=:id AND landlord_id=:uid',id=uuid_string(bid),uid=actor['id'])
    if not row:raise DomainError('not_found','Building not found.',404)
    return dict(row)
