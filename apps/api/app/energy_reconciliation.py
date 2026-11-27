"""Read-only measured energy comparison. Never a debit, theft verdict or relay action."""
from datetime import datetime,timezone,timedelta
from flask import Blueprint,g,request,jsonify
from .db import transaction,building,one,rows,DomainError
from .live_auth import authenticated
from .business_rules import resolve
bp=Blueprint('energy_reconciliation',__name__)

def interval(samples,start,end,max_gap,skew):
    """A counter window must have bounded, qualified boundaries and no internal reset/gap."""
    before=[r for r in samples if r['occurred_at_ms']<=start]
    after=[r for r in samples if r['occurred_at_ms']<=end]
    if not before or not after:return None,'boundary_missing'
    first,last=before[-1],after[-1]
    if start-first['occurred_at_ms']>skew or end-last['occurred_at_ms']>skew or first['occurred_at_ms']>=last['occurred_at_ms']:return None,'boundary_unaligned'
    selected=[r for r in samples if first['occurred_at_ms']<=r['occurred_at_ms']<=last['occurred_at_ms']]
    if any(r['quality']!='valid' or r['clock_quality']!='trusted' or r['import_mwh'] is None for r in selected):return None,'unqualified_reading'
    if len({(r['config_epoch'],r['key_epoch']) for r in selected})!=1:return None,'epoch_changed'
    for a,b in zip(selected,selected[1:]):
        if b['occurred_at_ms']<=a['occurred_at_ms'] or b['occurred_at_ms']-a['occurred_at_ms']>max_gap:return None,'coverage_gap'
        if b['import_mwh']<a['import_mwh']:return None,'counter_reset'
    return {'energy_mwh':last['import_mwh']-first['import_mwh'],'start_ms':first['occurred_at_ms'],'end_ms':last['occurred_at_ms'],
            'observations':len(selected),'first_reading_id':str(first['id']),'last_reading_id':str(last['id']),
            'first_payload_sha256':first['payload_sha256'],'last_payload_sha256':last['payload_sha256']},None

@bp.get('/api/v1/buildings/<building_id>/energy-reconciliation')
@authenticated
def compare(building_id):
    try:minutes=int(request.args.get('minutes','15'))
    except ValueError:raise DomainError('validation_error','Choose a 15, 60 or 1440 minute comparison.')
    if minutes not in (15,60,1440):raise DomainError('validation_error','Choose a 15, 60 or 1440 minute comparison.')
    end=int(datetime.now(timezone.utc).timestamp()*1000);start=end-minutes*60000
    result={'status':'unknown','parent_mwh':None,'children_mwh':None,'difference_mwh':None,'difference_bps':None,'sources':[],
            'period_start_ms':start,'period_end_ms':end,'money_changed':False,'physical_wiring_verified':False,
            'limitations':['Recorded topology does not independently verify physical wiring or identify every unmonitored/common load.',
            'A difference can reflect timing, calibration, topology or common loads. It is not proof of theft.',
            'Approved boundary skew permits different actual source intervals; exact interval timestamps remain available. No interpolation is used.',
            'This comparison never allocates a gap to residents, changes credit or operates a relay.']}
    with transaction() as c:
        b=building(c,g.actor,building_id)
        ctx={'building_id':building_id,'region':b['region'],'organization_id':str(b['organization_id']) if b['organization_id'] else None}
        rules={key:resolve(c,'reconciliation.'+key,ctx) for key in ('max_gap_ms','boundary_skew_ms','tolerance_bps')}
        result['rules']=rules
        if any(r['value'] is None for r in rules.values()):return jsonify(**result,reason='comparison_policy_unconfigured')
        edges=rows(c,"""SELECT e.*,d.building_id,d.room_id FROM topology_edges e JOIN devices d ON d.id=e.child_device_id
            LEFT JOIN rooms r ON r.id=d.room_id WHERE coalesce(d.building_id,r.building_id)=:id AND e.valid_to IS NULL ORDER BY e.child_device_id LIMIT 65""",id=building_id)
        parents={str(e['parent_device_id']) for e in edges if e['parent_device_id']}
        if not edges or len(edges)>64 or len(parents)!=1 or any(e['parent_meter_id'] for e in edges):return jsonify(**result,reason='single_measured_parent_required')
        if any(int(e['valid_from'].timestamp()*1000)>start for e in edges):return jsonify(**result,reason='topology_changed_in_window')
        parent_id=next(iter(parents));ids=[parent_id]+[str(e['child_device_id']) for e in edges]
        parent=one(c,'SELECT d.id FROM devices d LEFT JOIN rooms r ON r.id=d.room_id WHERE d.id=:id AND coalesce(d.building_id,r.building_id)=:building',id=parent_id,building=building_id)
        if not parent:return jsonify(**result,reason='parent_outside_building')
        # The parent cannot have omitted branches in another building or a recently removed edge.
        all_edges=rows(c,'SELECT child_device_id,valid_from,valid_to FROM topology_edges WHERE parent_device_id=:id AND(valid_to IS NULL OR valid_to>to_timestamp(:start/1000.0))',id=parent_id,start=start)
        if {str(e['child_device_id']) for e in all_edges}!={str(e['child_device_id']) for e in edges} or any(e['valid_to'] for e in all_edges):return jsonify(**result,reason='incomplete_or_changed_topology')
        for did in ids:
            d=one(c,'SELECT install_state,calibration_status,persistent_counter_qualified FROM devices WHERE id=:id',id=did)
            if d['install_state']!='commissioned' or d['calibration_status']!='qualified' or not d['persistent_counter_qualified']:
                result['sources'].append({'device_id':did,'reason':'device_not_qualified'});continue
            samples=rows(c,"""SELECT r.id,r.occurred_at_ms,r.import_mwh,r.config_epoch,r.quality,r.clock_quality,i.key_epoch,i.payload_sha256
             FROM readings r JOIN device_inbox i ON i.id=r.inbox_id WHERE r.device_id=:id AND r.occurred_at_ms>=:start AND r.occurred_at_ms<=:end
             ORDER BY r.occurred_at_ms,r.id LIMIT 5001""",id=did,start=start-rules['boundary_skew_ms']['value'],end=end)
            reading,reason=interval(samples,start,end,rules['max_gap_ms']['value'],rules['boundary_skew_ms']['value']) if len(samples)<=5000 else (None,'observation_limit')
            result['sources'].append({'device_id':did,'role':'incoming' if did==parent_id else 'branch',**(reading or {'reason':reason})})
        if any('reason' in source for source in result['sources']):return jsonify(**result,reason='incomplete_measurement_coverage')
        incoming=result['sources'][0]['energy_mwh'];branches=sum(r['energy_mwh'] for r in result['sources'][1:]);delta=incoming-branches
        result.update(parent_mwh=incoming,children_mwh=branches,difference_mwh=delta)
        # A zero incoming measurement is genuine, but cannot define a relative drift ratio.
        if incoming==0:return jsonify(**result,reason='zero_incoming_reference')
        ratio=abs(delta)*10000/incoming
        result.update(difference_bps=ratio,status='review' if abs(delta)*10000>incoming*rules['tolerance_bps']['value'] else 'within_tolerance',reason=None)
    return jsonify(result)
