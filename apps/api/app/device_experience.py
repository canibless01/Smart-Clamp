"""Persistent transitions from authenticated device data, never browser timers."""
from datetime import datetime,timezone,timedelta
from flask import current_app
from .db import one,rows,query

def transition(c,device_id,key,state,at,owner_id,alert_type=None,message=None):
    previous=one(c,'SELECT state,observed_at FROM device_experience_state WHERE device_id=:id AND signal_key=:key FOR UPDATE',id=device_id,key=key)
    if previous and at<=previous['observed_at']:return
    query(c,'INSERT INTO device_experience_state(device_id,signal_key,state,observed_at) VALUES(:id,:key,:state,:at) ON CONFLICT(device_id,signal_key) DO UPDATE SET state=:state,observed_at=:at',id=device_id,key=key,state=state,at=at)
    if alert_type and (not previous or previous['state']!=state):
        from .work import notify
        notify(c,owner_id,'device.'+key,message,'signal:'+str(device_id)+':'+key+':'+at.isoformat(),channels=[],details={'alert_type':alert_type,'device_id':str(device_id),'observed_at':at.isoformat(),'advisory_only':key in ('voltage','current')})

def electrical(c,r,device):
    at=r['occurred_at_ms'];now=datetime.now(timezone.utc)
    if r['quality']!='valid' or r['clock_quality']!='trusted' or at is None or not 0<=now.timestamp()*1000-at<180000:return
    observed=datetime.fromtimestamp(at/1000,timezone.utc)
    for key,metric,low_name,high_name,low_type,high_type in [('voltage','voltage_mv','VOLTAGE_WARNING_LOW_MV','VOLTAGE_WARNING_HIGH_MV','under_voltage','over_voltage'),('current','current_ma','CURRENT_WARNING_LOW_MA','CURRENT_WARNING_HIGH_MA','under_current','over_current')]:
        value=r[metric]
        try:
            low=int(current_app.config.get(low_name,''));high=int(current_app.config.get(high_name,''))
            if not 0<=low<high:continue
        except (ValueError,TypeError):continue
        if value is None:continue
        state='low' if value<low else 'high' if value>high else 'normal'
        code=low_type if state=='low' else high_type if state=='high' else None
        transition(c,device['id'],key,state,observed,device['owner_id'],code,'Recorded '+key+' is '+state+' relative to your configured advisory band. Review the installation; this does not confirm a protective relay action.')

def connection(c,device):
    now=datetime.now(timezone.utc)
    transition(c,device['id'],'connection','online',now,device['owner_id'],'device_online' if device.get('last_seen_at') and now-device['last_seen_at']>timedelta(seconds=180) else None,'The device has reconnected. Current supply and relay feedback remain separate.')

def check_offline():
    from .db import transaction
    with transaction() as c:
        # The device row lock serializes this transition with authenticated inbox writes.
        for device in rows(c,"SELECT id,owner_id,last_seen_at FROM devices WHERE last_seen_at IS NOT NULL AND last_seen_at<now()-interval '180 seconds' AND NOT EXISTS(SELECT 1 FROM device_experience_state s WHERE s.device_id=devices.id AND s.signal_key='connection' AND s.state='offline' AND s.observed_at>=devices.last_seen_at+interval '180 seconds') ORDER BY last_seen_at DESC LIMIT 500 FOR UPDATE SKIP LOCKED"):
            transition(c,device['id'],'connection','offline',device['last_seen_at']+timedelta(seconds=180),device['owner_id'],'device_offline','No device contact for three minutes. Last-known readings remain available; this does not establish a supply outage.')
