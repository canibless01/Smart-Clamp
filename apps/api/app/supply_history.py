"""Bounded sampled supply coverage. Missing observations never become outage hours."""
from datetime import datetime,timezone,timedelta
from flask import Blueprint,g,request,jsonify,current_app
from .live_auth import authenticated
from .db import transaction,one,device,reading_since,DomainError
bp=Blueprint('supply_history',__name__)

def summarize(c,d,start,end,since,threshold):
    result=one(c,"""WITH source AS (
      SELECT occurred_at_ms AS at,voltage_mv,quality,clock_quality,id
      FROM readings WHERE device_id=:id AND occurred_at_ms>=:start AND occurred_at_ms<:end
      AND (CAST(:since AS timestamptz) IS NULL OR occurred_at_ms>=extract(epoch FROM CAST(:since AS timestamptz))*1000)
    ), intervals AS (
      SELECT *,lead(at) OVER w AS next_at,lead(voltage_mv) OVER w AS next_voltage,
      lead(quality) OVER w AS next_quality,lead(clock_quality) OVER w AS next_clock
      FROM source WINDOW w AS (ORDER BY at,id)
    ), eligible AS (
      SELECT *,CASE WHEN quality='valid' AND next_quality='valid' AND clock_quality='trusted' AND next_clock='trusted'
      AND voltage_mv IS NOT NULL AND next_voltage IS NOT NULL AND next_at>at AND next_at-at<=180000
      AND (voltage_mv>=:threshold)=(next_voltage>=:threshold) THEN next_at-at ELSE 0 END AS covered_ms
      FROM intervals
    ) SELECT count(*) AS observations,
      coalesce(sum(covered_ms) FILTER(WHERE voltage_mv>=:threshold),0) AS present_ms,
      coalesce(sum(covered_ms) FILTER(WHERE voltage_mv<:threshold),0) AS absent_ms
      FROM eligible""",id=d['id'],start=int(start.timestamp()*1000),end=int(end.timestamp()*1000),since=since,threshold=threshold)
    total=int((end-start).total_seconds()*1000);present=int(result['present_ms']);absent=int(result['absent_ms']);covered=present+absent
    return {'period_start':start,'period_end':end,'present_seconds':present/1000 if covered else None,
            'absent_seconds':absent/1000 if covered else None,'unknown_seconds':(total-covered)/1000,
            'coverage':covered/total,'observations':result['observations'],'period_seconds':total/1000}

@bp.get('/api/v1/devices/<device_id>/supply-history')
@authenticated
def supply_history(device_id):
    try:days=int(request.args.get('days','7'))
    except (ValueError,TypeError):raise DomainError('validation_error','Choose 1, 7 or 30 days.')
    if days not in (1,7,30):raise DomainError('validation_error','Choose 1, 7 or 30 days.')
    # This detects observed supply presence, not safe operating voltage/protection limits.
    try:threshold=int(current_app.config.get('SUPPLY_PRESENT_MIN_MV','50000'))
    except (TypeError,ValueError):raise DomainError('supply_threshold_unconfigured','The supply-presence threshold is invalid.',503)
    if not 0<threshold<=300000:raise DomainError('supply_threshold_unconfigured','The supply-presence threshold is invalid.',503)
    end=datetime.now(timezone.utc);start=end-timedelta(days=days)
    with transaction() as c:
        d=device(c,g.actor,device_id);since=reading_since(c,g.actor,d)
        current=summarize(c,d,start,end,since,threshold);previous=summarize(c,d,start-timedelta(days=days),start,since,threshold)
    return jsonify(current=current,previous=previous,method='paired_voltage_samples',threshold_mv=threshold,max_gap_seconds=180,
                   limitations=['Only adjacent valid, trusted-time voltage readings in the same supply state and at most 180 seconds apart count as sampled coverage.',
                                'Unobserved gaps and transitions remain unknown. These are sampled supply hours, not guaranteed continuous availability or utility credit.',
                                'The presence threshold does not change protection limits. Relay OFF is not a supply outage.'])
