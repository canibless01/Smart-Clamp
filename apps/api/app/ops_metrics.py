"""Actual operational aggregates; modem byte counters are never inferred from JSON size."""
import re
from datetime import datetime,timezone
from .db import one,rows,query,DomainError

def ingest_transport(c,d,p,inbox_id):
    if 'transport' not in p:return
    value=p['transport']
    if p.get('kind')!='heartbeat' or d['profile'] not in ('pole_gateway','building_hub'):
        raise DomainError('transport_profile_unavailable','Cellular reporting requires a gateway heartbeat.',422)
    if not isinstance(value,dict) or set(value)-{'counter_session','rx_bytes','tx_bytes','signal_dbm','network_type'}:
        raise DomainError('invalid_transport_report','Use the bounded modem counter fields.')
    if not isinstance(value.get('counter_session'),str) or not re.fullmatch('[0-9a-f]{32}',value['counter_session']):raise DomainError('invalid_transport_report','A modem counter-session identifier is required.')
    for key in ('rx_bytes','tx_bytes'):
        if type(value.get(key)) is not int or not 0<=value[key]<=9223372036854775807:raise DomainError('invalid_transport_report','Byte counters must be bounded nonnegative integers.')
    signal=value.get('signal_dbm')
    if signal is not None and(type(signal) is not int or not -150<=signal<=-20):raise DomainError('invalid_transport_report','Signal strength must be dBm or null.')
    if value.get('network_type','unknown') not in ('2g','3g','4g','nb_iot','unknown'):raise DomainError('invalid_transport_report','Network type is unsupported.')
    at=p.get('occurred_at_ms');clock=p.get('clock_quality','unknown')
    if clock not in ('trusted','estimated','unknown') or(at is not None and(type(at) is not int or at<0 or at>int(datetime.now(timezone.utc).timestamp()*1000)+60000)) or(clock=='trusted' and at is None):raise DomainError('invalid_transport_report','Modem source time or confidence is invalid.')
    latest=one(c,"SELECT rx_bytes,tx_bytes,occurred_at_ms FROM device_transport_reports WHERE device_id=:id AND counter_session=:session AND clock_quality='trusted' ORDER BY occurred_at_ms DESC LIMIT 1",id=d['id'],session=value['counter_session'])
    if latest and clock=='trusted' and at>=latest['occurred_at_ms'] and(value['rx_bytes']<latest['rx_bytes'] or value['tx_bytes']<latest['tx_bytes']):raise DomainError('transport_counter_reset','Start a new modem counter session after a counter reset.',409)
    query(c,'INSERT INTO device_transport_reports(device_id,inbox_id,counter_session,occurred_at_ms,clock_quality,rx_bytes,tx_bytes,signal_dbm,network_type) VALUES(:id,:inbox,:session,:at,:clock,:rx,:tx,:signal,:network)',id=d['id'],inbox=inbox_id,session=value['counter_session'],at=at,clock=clock,rx=value['rx_bytes'],tx=value['tx_bytes'],signal=signal,network=value.get('network_type','unknown'))

def snapshot(c):
    users=one(c,"SELECT count(*) AS registered,count(*) FILTER(WHERE onboarding_completed_at IS NOT NULL) AS onboarded,count(*) FILTER(WHERE created_at>=now()-interval '24 hours') AS joined_24h FROM profiles")
    profiles=rows(c,"SELECT profile,count(*) AS devices,count(*) FILTER(WHERE last_seen_at>=now()-interval '180 seconds') AS recently_connected,count(*) FILTER(WHERE install_state='commissioned' AND calibration_status='qualified') AS qualified FROM devices GROUP BY profile ORDER BY profile")
    commands=rows(c,"SELECT CASE WHEN status IN('pending','pending_delivery') AND expires_at<=now() THEN 'expired' ELSE status END AS status,count(*) AS count FROM commands WHERE created_at>=now()-interval '24 hours' GROUP BY 1 ORDER BY 1")
    outbox=rows(c,"SELECT status,count(*) AS count,min(created_at) AS oldest_created_at FROM outbox WHERE status<>'done' GROUP BY status ORDER BY status")
    # The serialized JSON text size is application storage context, not wire/modem traffic.
    ingest=one(c,"SELECT count(*) AS packets,coalesce(sum(octet_length(payload_bytes::text)),0) AS stored_json_bytes FROM device_inbox WHERE received_at>=now()-interval '24 hours'")
    modems=rows(c,"""SELECT DISTINCT ON(device_id) device_id,occurred_at_ms,clock_quality,received_at,rx_bytes,tx_bytes,signal_dbm,network_type,
      clock_quality='trusted' AND occurred_at_ms BETWEEN extract(epoch FROM now())*1000-180000 AND extract(epoch FROM now())*1000 AS current
      FROM device_transport_reports ORDER BY device_id,occurred_at_ms DESC NULLS LAST,received_at DESC LIMIT 100""")
    traffic=one(c,"""WITH ordered AS (
      SELECT device_id,counter_session,occurred_at_ms,rx_bytes,tx_bytes,
       lag(rx_bytes) OVER w AS prior_rx,lag(tx_bytes) OVER w AS prior_tx,lag(occurred_at_ms) OVER w AS prior_at
      FROM device_transport_reports WHERE clock_quality='trusted' AND occurred_at_ms BETWEEN extract(epoch FROM now()-interval '24 hours')*1000 AND extract(epoch FROM now())*1000
      WINDOW w AS(PARTITION BY device_id,counter_session ORDER BY occurred_at_ms,id)
    ), sessions AS (
      SELECT device_id,counter_session,bool_and(prior_rx IS NULL OR (rx_bytes>=prior_rx AND tx_bytes>=prior_tx AND occurred_at_ms>prior_at)) AS consistent,
       count(prior_rx) AS intervals,sum(rx_bytes-prior_rx) AS rx,sum(tx_bytes-prior_tx) AS tx
      FROM ordered GROUP BY device_id,counter_session
    ) SELECT count(*) FILTER(WHERE consistent AND intervals>0) AS measured_sessions,
      sum(rx) FILTER(WHERE consistent AND intervals>0) AS rx_bytes,sum(tx) FILTER(WHERE consistent AND intervals>0) AS tx_bytes,
      count(*) FILTER(WHERE NOT consistent) AS inconsistent_sessions FROM sessions""")
    return {'users':dict(users),'profiles':profiles,'commands_24h':commands,'outbox':outbox,'ingest_24h':dict(ingest),'modems':modems,'modem_24h':dict(traffic),
            'limitations':['Stored JSON byte size is not cellular traffic or SIM billing.','Modem deltas require at least two trusted-time reports in the same counter session; missing/reset intervals are not zero.','A modem heartbeat does not confirm grid supply, calibration or relay position.']}
