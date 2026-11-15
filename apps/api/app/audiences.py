"""Server-resolved notice categories. Geography is explicit, never inferred from an address."""
from flask import Blueprint,g,request,jsonify
from .db import one,rows,query,scalar,transaction,uuid_string,json_text,audit,DomainError
from .live_auth import authenticated,staff
from .idempotency import idempotent

bp=Blueprint('audiences',__name__)
PROFILES={'house_full','pole_device','pole_gateway','building_hub','transformer','ir_reader'}
ROLES={'homeowner','tenant','landlord'}

def criteria(value):
    if not isinstance(value,dict) or set(value)-{'building_id','area_id','region','profile','role','account_state'}:raise DomainError('validation_error','Choose supported audience categories.')
    result={key:v for key,v in value.items() if v not in (None,'')}
    if any(not isinstance(v,str) for v in result.values()):raise DomainError('validation_error','Audience categories require listed string values.')
    for key in ('building_id','area_id'):
        if key in result:result[key]=uuid_string(result[key])
    if 'region' in result and (not isinstance(result['region'],str) or not 1<=len(result['region'])<=80):raise DomainError('validation_error','Choose a listed region.')
    if 'profile' in result and result['profile'] not in PROFILES or 'role' in result and result['role'] not in ROLES or result.get('account_state','all') not in ('all','overdue_bills'):raise DomainError('validation_error','Choose a supported account category.')
    return result

def devices(c,filters,org):
    if org and filters.get('account_state')=='overdue_bills':raise DomainError('scope_denied','Utility message scope does not expose private bill responsibility.',403)
    result=rows(c,"""SELECT d.id FROM devices d LEFT JOIN device_service_areas da ON da.device_id=d.id LEFT JOIN service_areas a ON a.id=da.area_id
      WHERE (CAST(:org AS uuid) IS NULL OR EXISTS(SELECT 1 FROM utility_device_scopes s WHERE s.device_id=d.id AND s.organization_id=CAST(:org AS uuid) AND s.revoked_at IS NULL))
      AND (:bill_mode OR d.owner_id IS NOT NULL OR EXISTS(SELECT 1 FROM occupancies o WHERE o.room_id=d.room_id AND o.end_at IS NULL))
      AND (CAST(:building AS uuid) IS NULL OR d.building_id=CAST(:building AS uuid)) AND (CAST(:area AS uuid) IS NULL OR a.id=CAST(:area AS uuid))
      AND (CAST(:region AS text) IS NULL OR a.region=:region) AND (CAST(:profile AS text) IS NULL OR d.profile::text=:profile)
      ORDER BY d.id LIMIT 5001""",org=org,building=filters.get('building_id'),area=filters.get('area_id'),region=filters.get('region'),profile=filters.get('profile'),bill_mode=filters.get('account_state')=='overdue_bills')
    if len(result)>5000:raise DomainError('audience_too_large','Narrow this audience by building, region or area.',422)
    return [str(row['id']) for row in result]

def recipients(c,ids,org,filters):
    # Import here to share the established ownership/occupancy/utility-consent rules.
    from .communications import audience
    if filters.get('account_state')=='overdue_bills':
        people=[str(row['id']) for row in rows(c,"SELECT DISTINCT r.user_id AS id FROM bill_responsibilities r JOIN bills b ON b.id=r.bill_id JOIN profiles p ON p.id=r.user_id WHERE p.onboarding_completed_at IS NOT NULL AND b.status='overdue' AND b.amount_kobo>0 AND ((b.subject_type='device' AND b.subject_id=ANY(CAST(:devices AS uuid[]))) OR (b.subject_type='building' AND EXISTS(SELECT 1 FROM devices d WHERE d.id=ANY(CAST(:devices AS uuid[])) AND d.building_id=b.subject_id)) OR (b.subject_type='room' AND EXISTS(SELECT 1 FROM devices d WHERE d.id=ANY(CAST(:devices AS uuid[])) AND d.room_id=b.subject_id))) ORDER BY r.user_id LIMIT 5001",devices=ids)]
        if len(people)>5000:raise DomainError('audience_too_large','Narrow the overdue-bill audience.',422)
    else:people=audience(c,ids,org,maximum=5000)
    if filters.get('role'):people=[str(row['id']) for row in rows(c,'SELECT id FROM profiles WHERE id=ANY(CAST(:ids AS uuid[])) AND role::text=:role ORDER BY id',ids=people,role=filters['role'])]
    return sorted(people)

def resolve(c,value,org):
    filters=criteria(value);ids=devices(c,filters,org)
    return ids,recipients(c,ids,org,filters)

def options(c,orgs,utility):
    scopes=[str(o['id']) for o in orgs]
    areas=rows(c,"SELECT DISTINCT a.id,a.name,a.region FROM service_areas a WHERE NOT :utility OR EXISTS(SELECT 1 FROM device_service_areas da JOIN utility_device_scopes s ON s.device_id=da.device_id WHERE da.area_id=a.id AND s.organization_id=ANY(CAST(:orgs AS uuid[])) AND s.revoked_at IS NULL) ORDER BY a.region,a.name",utility=utility,orgs=scopes)
    buildings=rows(c,"SELECT DISTINCT b.id,b.name FROM buildings b WHERE NOT :utility OR EXISTS(SELECT 1 FROM devices d JOIN utility_device_scopes s ON s.device_id=d.id WHERE d.building_id=b.id AND s.organization_id=ANY(CAST(:orgs AS uuid[])) AND s.revoked_at IS NULL) ORDER BY b.name LIMIT 1000",utility=utility,orgs=scopes)
    if utility:
        for building in buildings:building['name']='Assigned building '+str(building['id'])[:8]
    return {'areas':areas,'regions':sorted(set(a['region'] for a in areas)),'buildings':buildings}

@bp.post('/api/v1/ops/service-areas')
@authenticated
@idempotent
def create_area():
    staff('internal_ops','internal_superadmin');d=request.get_json() or {};name=str(d.get('name','')).strip();region=str(d.get('region','')).strip()
    if not 1<=len(name)<=100 or not 1<=len(region)<=80:raise DomainError('validation_error','Enter an area and region name.')
    with transaction() as c:
        row=one(c,'INSERT INTO service_areas(name,region,created_by) VALUES(:name,:region,:uid) RETURNING id,name,region',name=name,region=region,uid=g.actor['id']);audit(c,g.actor['id'],'service_area_created',row['id'])
    return jsonify(dict(row)),201

@bp.route('/api/v1/ops/devices/<device_id>/service-area',methods=['GET','POST'])
@authenticated
@idempotent
def assign_area(device_id):
    staff('internal_ops','internal_superadmin');d=request.get_json() or {}
    with transaction() as c:
        if request.method=='GET':
            row=one(c,'SELECT a.area_id,a.version FROM device_service_areas a WHERE a.device_id=:id',id=uuid_string(device_id))
            return jsonify(dict(row) if row else {'area_id':None,'version':0})
        if not one(c,'SELECT id FROM devices WHERE id=:id',id=uuid_string(device_id)) or not one(c,'SELECT id FROM service_areas WHERE id=:id',id=uuid_string(d.get('area_id'))):raise DomainError('not_found','Device or area not found.',404)
        old=one(c,'SELECT version,area_id FROM device_service_areas WHERE device_id=:id FOR UPDATE',id=device_id)
        if old and d.get('expected_version')!=old['version']:raise DomainError('version_conflict','Refresh the existing area assignment.',409)
        row=one(c,'INSERT INTO device_service_areas(device_id,area_id,assigned_by) VALUES(:id,:area,:uid) ON CONFLICT(device_id) DO UPDATE SET area_id=excluded.area_id,assigned_by=excluded.assigned_by,version=device_service_areas.version+1,updated_at=now() RETURNING device_id,area_id,version',id=device_id,area=d['area_id'],uid=g.actor['id'])
        audit(c,g.actor['id'],'device_service_area_assigned',device_id,{'area_id':d['area_id'],'previous_area_id':str(old['area_id']) if old else None})
    return jsonify(dict(row)),201

@bp.route('/api/v1/ops/bills/<bill_id>/responsibilities',methods=['POST','DELETE'])
@authenticated
@idempotent
def assign_bill(bill_id):
    staff('internal_finance','internal_superadmin');d=request.get_json() or {};note=d.get('review_note','')
    if not isinstance(note,str) or not 10<=len(note.strip())<=2000:raise DomainError('validation_error','Record the reviewed bill responsibility evidence.')
    with transaction() as c:
        bill=one(c,'SELECT id FROM bills WHERE id=:id',id=uuid_string(bill_id));person=one(c,'SELECT id FROM profiles WHERE id=:id',id=uuid_string(d.get('user_id')))
        if not bill or not person:raise DomainError('not_found','Bill or account not found.',404)
        if request.method=='DELETE':
            query(c,'DELETE FROM bill_responsibilities WHERE bill_id=:bill AND user_id=:person',bill=bill_id,person=d['user_id'])
            audit(c,g.actor['id'],'bill_responsibility_released',bill_id,{'user_id':d['user_id'],'review_note':note.strip()})
            return jsonify(status='released')
        query(c,'INSERT INTO bill_responsibilities(bill_id,user_id,assigned_by,review_note) VALUES(:bill,:person,:uid,:note) ON CONFLICT DO NOTHING',bill=bill_id,person=d['user_id'],uid=g.actor['id'],note=note.strip());audit(c,g.actor['id'],'bill_responsibility_reviewed',bill_id,{'user_id':d['user_id'],'review_note':note.strip()})
    return jsonify(status='recorded'),201
