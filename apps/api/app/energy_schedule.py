"""Opt-in durable window scheduling. No synthetic readings, money or relay actions."""
from datetime import datetime,timezone,timedelta
from flask import Blueprint,g,request,jsonify
from .db import transaction,building,one,rows,query,audit,DomainError
from .live_auth import authenticated
from .idempotency import idempotent
from .business_rules import resolve
from .energy_history import context,record_window
bp=Blueprint('energy_schedule',__name__)
RULES=('collection_delay_ms','max_gap_ms','boundary_skew_ms','tolerance_bps','consecutive_windows')
def policy(c,b,now=None):return {key:resolve(c,'reconciliation.'+key,context(b),at=now)['value'] for key in RULES}
def public_schedule(row):
    return {key:row[key] for key in ('enabled','minutes','version','next_window_end_ms','last_record_id','last_recorded_at','last_error')} if row else {'enabled':False,'minutes':15,'version':0,'next_window_end_ms':None,'last_record_id':None,'last_recorded_at':None,'last_error':None}

@bp.route('/api/v1/buildings/<building_id>/energy-reconciliation/schedule',methods=['GET','POST'])
@authenticated
@idempotent
def schedule(building_id):
    with transaction() as c:
        b=building(c,g.actor,building_id)
        if request.method=='POST':
            b=one(c,'SELECT * FROM buildings WHERE id=:id AND landlord_id=:uid FOR UPDATE',id=building_id,uid=g.actor['id'])
            if not b:raise DomainError('not_found','Building not found.',404)
        settings=policy(c,b);ready=all(value is not None for value in settings.values())
        row=one(c,'SELECT * FROM energy_comparison_schedules WHERE building_id=:id',id=building_id)
        if request.method=='POST':
            data=request.get_json() or {}
            if set(data)-{'enabled','minutes','expected_version'}:raise DomainError('validation_error','Unsupported schedule field.')
            if type(data.get('enabled')) is not bool or type(data.get('minutes')) is not int or data['minutes'] not in (15,60,1440):raise DomainError('validation_error','Choose automatic recording on/off and a supported period.')
            if type(data.get('expected_version')) is not int or data['expected_version']!=(row['version'] if row else 0):raise DomainError('version_conflict','This schedule changed. Reload before saving.',409)
            if data['enabled'] and not ready:raise DomainError('comparison_policy_unconfigured','An administrator must approve all comparison and consecutive-window rules before enabling automatic recording.',409)
            now=datetime.now(timezone.utc);now_ms=int(now.timestamp()*1000);span=data['minutes']*60000
            reset=data['enabled'] and(not row or not row['enabled'] or row['minutes']!=data['minutes'])
            end=((now_ms+span-1)//span)*span+span if reset else row['next_window_end_ms'] if row else None
            due=datetime.fromtimestamp((end+settings['collection_delay_ms'])/1000,timezone.utc) if data['enabled'] else now
            saved=one(c,"""INSERT INTO energy_comparison_schedules(building_id,enabled,minutes,version,next_window_end_ms,next_check_at,updated_by)
              VALUES(:id,:enabled,:minutes,1,:end,:due,:uid) ON CONFLICT(building_id) DO UPDATE SET enabled=excluded.enabled,minutes=excluded.minutes,version=energy_comparison_schedules.version+1,next_window_end_ms=excluded.next_window_end_ms,next_check_at=excluded.next_check_at,updated_by=excluded.updated_by,updated_at=now(),last_error=NULL,last_record_id=CASE WHEN :reset THEN NULL ELSE energy_comparison_schedules.last_record_id END,last_recorded_at=CASE WHEN :reset THEN NULL ELSE energy_comparison_schedules.last_recorded_at END RETURNING *""",id=building_id,enabled=data['enabled'],minutes=data['minutes'],end=end,due=due,uid=g.actor['id'],reset=reset)
            audit(c,g.actor['id'],'energy_comparison_schedule_changed',building_id,{'before':public_schedule(row),'after':public_schedule(saved),'starts_new_window':reset})
            row=saved
    return jsonify(schedule=public_schedule(row),can_enable=ready,missing_rules=[key for key,value in settings.items() if value is None],
        limitations=['Enabling starts the first full new UTC-aligned window; it does not manufacture earlier history.','Saved scheduling is not proof the worker is running. Last recorded evidence remains unknown until processing succeeds.','A comparison never charges a resident or changes a relay.'])

def process_due(limit=5,now=None):
    now=now or datetime.now(timezone.utc);now_ms=int(now.timestamp()*1000);processed=0
    with transaction() as c:candidates=rows(c,'SELECT building_id,version FROM energy_comparison_schedules WHERE enabled AND next_check_at<=:now ORDER BY next_check_at,building_id LIMIT :limit',now=now,limit=max(1,min(100,limit)))
    for candidate in candidates:
        bid=candidate['building_id'];version=candidate['version']
        try:
            with transaction() as c:
                # Same lock order as topology/schedule writers; multiple workers skip busy buildings.
                b=one(c,'SELECT * FROM buildings WHERE id=:id FOR UPDATE SKIP LOCKED',id=bid)
                if not b:continue
                row=one(c,'SELECT * FROM energy_comparison_schedules WHERE building_id=:id AND enabled AND next_check_at<=:now FOR UPDATE SKIP LOCKED',id=bid,now=now)
                if not row:continue
                version=row['version']
                if str(row['updated_by'])!=str(b['landlord_id']):
                    query(c,"UPDATE energy_comparison_schedules SET enabled=false,version=version+1,last_error='owner_changed' WHERE building_id=:id",id=bid)
                    audit(c,None,'energy_comparison_schedule_paused',bid,{'reason':'owner_changed'});continue
                settings=policy(c,b,now)
                if any(value is None for value in settings.values()):
                    query(c,"UPDATE energy_comparison_schedules SET last_error='comparison_policy_unconfigured',next_check_at=:retry WHERE building_id=:id",id=bid,retry=now+timedelta(seconds=60));continue
                end=row['next_window_end_ms'];due=datetime.fromtimestamp((end+settings['collection_delay_ms'])/1000,timezone.utc)
                if due>now:
                    query(c,'UPDATE energy_comparison_schedules SET next_check_at=:due WHERE building_id=:id',id=bid,due=due);continue
                recorded,_=record_window(c,b,row['minutes'],end,None,'automatic',version)
                next_end=end+row['minutes']*60000;next_due=max(now,datetime.fromtimestamp((next_end+settings['collection_delay_ms'])/1000,timezone.utc))
                query(c,'UPDATE energy_comparison_schedules SET next_window_end_ms=:end,next_check_at=:due,last_record_id=:record,last_recorded_at=:now,last_error=NULL WHERE building_id=:id',id=bid,end=next_end,due=next_due,record=recorded['id'],now=now)
                processed+=1
        except Exception as exc:
            code=exc.code if isinstance(exc,DomainError) else type(exc).__name__
            with transaction() as c:query(c,'UPDATE energy_comparison_schedules SET last_error=:error,next_check_at=:retry WHERE building_id=:id AND version=:version AND enabled',id=bid,version=version,error=code[:100],retry=now+timedelta(seconds=60))
    return processed

def worker_settings(values):
    result=[]
    for name,default,minimum,maximum in [('ENERGY_COMPARISON_SCHEDULER_BATCH_SIZE',5,1,100),('ENERGY_COMPARISON_SCHEDULER_TICK_SECONDS',30,1,300)]:
        raw=str(values.get(name,default))
        if not raw.isdigit() or not minimum<=int(raw)<=maximum:raise ValueError(name+' is outside its supported integer bounds')
        result.append(int(raw))
    return tuple(result)
