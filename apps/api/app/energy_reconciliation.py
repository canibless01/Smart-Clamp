"""Read-only measured energy comparison. Never a debit, theft verdict or relay action."""
from datetime import datetime,timezone,timedelta
from flask import Blueprint,g,request,jsonify
from .db import transaction,building,one,rows,DomainError
from .live_auth import authenticated
from .business_rules import resolve
from .idempotency import idempotent
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

@bp.route('/api/v1/buildings/<building_id>/topology',methods=['GET','POST'])
@authenticated
@idempotent
def topology(building_id):
    from .db import query,uuid_string,audit
    with transaction() as c:
        b=building(c,g.actor,building_id)
        # A topology edit is a metadata declaration, never a commissioning certificate.
        if request.method=='POST':
            b=one(c,'SELECT * FROM buildings WHERE id=:id FOR UPDATE',id=building_id)
        devices=rows(c,"SELECT d.id,d.profile,d.room_id,r.label AS room_label,d.install_state,d.calibration_status FROM devices d LEFT JOIN rooms r ON r.id=d.room_id WHERE coalesce(d.building_id,r.building_id)=:bid ORDER BY d.id LIMIT 257"+(' FOR UPDATE OF d' if request.method=='POST' else ''),bid=building_id)
        ids=[str(d['id']) for d in devices]
        edges=rows(c,'SELECT id,parent_device_id,parent_meter_id,child_device_id,valid_from FROM topology_edges WHERE child_device_id=ANY(CAST(:ids AS uuid[])) AND valid_to IS NULL ORDER BY child_device_id',ids=ids)
        if request.method=='GET':return jsonify(version=b['topology_version'],devices=devices[:256],devices_truncated=len(devices)>256,edges=edges,physical_wiring_verified=False)
        data=request.get_json() or {}
        if set(data)-{'expected_version','parent_device_id','child_device_ids','reason'}:raise DomainError('validation_error','Unsupported topology field.')
        if type(data.get('expected_version')) is not int or data['expected_version']!=b['topology_version']:raise DomainError('version_conflict','The building topology changed. Refresh before saving.',409)
        if len(devices)>256:raise DomainError('topology_capacity','This building needs a reviewed larger topology workflow.',422)
        parent=uuid_string(data.get('parent_device_id'));children=data.get('child_device_ids')
        if not isinstance(children,list) or not 1<=len(children)<=64:raise DomainError('validation_error','Select between one and 64 measured branches.')
        children=[uuid_string(did) for did in children]
        if len(set(children))!=len(children) or parent in children:raise DomainError('validation_error','The incoming source and each branch must be different devices.')
        if any(did not in ids for did in [parent]+children):raise DomainError('not_found','Every source must belong to this building.',404)
        if next(d for d in devices if str(d['id'])==parent)['room_id'] is not None:raise DomainError('validation_error','Choose a dedicated incoming device, not a room device.')
        reason=data.get('reason')
        if not isinstance(reason,str) or not 10<=len(reason.strip())<=2000:raise DomainError('validation_error','Explain the recorded wiring in 10–2000 characters.')
        # Refuse external links instead of silently taking a source from another topology.
        crossing=one(c,'SELECT id FROM topology_edges WHERE valid_to IS NULL AND((parent_device_id=ANY(CAST(:ids AS uuid[])) AND NOT(child_device_id=ANY(CAST(:ids AS uuid[])))) OR(child_device_id=ANY(CAST(:ids AS uuid[])) AND(parent_meter_id IS NOT NULL OR NOT(parent_device_id=ANY(CAST(:ids AS uuid[])))))) LIMIT 1',ids=ids)
        if crossing:raise DomainError('external_topology_requires_review','Existing external or meter-source links require reviewed migration before replacement.',409)
        if any(edge['valid_from']>datetime.now(timezone.utc) for edge in edges):raise DomainError('topology_pending','A future topology record requires review before replacement.',409)
        now=one(c,'SELECT clock_timestamp() AS at')['at']
        query(c,'UPDATE topology_edges SET valid_to=:at WHERE child_device_id=ANY(CAST(:ids AS uuid[])) AND valid_to IS NULL',ids=ids,at=now)
        for child in children:query(c,'INSERT INTO topology_edges(parent_device_id,child_device_id,valid_from) VALUES(:parent,:child,:at)',parent=parent,child=child,at=now)
        version=one(c,'UPDATE buildings SET topology_version=topology_version+1,updated_at=now() WHERE id=:id RETURNING topology_version',id=building_id)['topology_version']
        audit(c,g.actor['id'],'building_topology_recorded',building_id,{'previous_version':b['topology_version'],'version':version,'old_edges':edges,'parent_device_id':parent,'child_device_ids':children,'reason':reason.strip(),'physical_wiring_verified':False})
    return jsonify(version=version,status='recorded',physical_wiring_verified=False)
