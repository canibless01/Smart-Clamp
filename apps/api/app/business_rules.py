"""Typed, immutable, scoped operating rules. No credentials or privilege bypass switches."""
import json,re
from datetime import datetime,timezone
from flask import Blueprint,current_app,g,request,jsonify
from .db import transaction,one,rows,query,json_text,uuid_string,audit,DomainError
from .live_auth import authenticated,staff
from .idempotency import idempotent
bp=Blueprint('business_rules',__name__)
# Bounds protect representation/approved software capacity; values are not invented prices.
SPECS={
 'reconciliation.collection_delay_ms':dict(label='Closed energy window collection delay (ms)',kind='int',default=None,nullable=True,min=0,max=900000),
 'reconciliation.consecutive_windows':dict(label='Consecutive qualified energy review windows',kind='int',default=None,nullable=True,min=2,max=96),
 'reconciliation.max_gap_ms':dict(label='Energy comparison maximum sample gap (ms)',kind='int',default=None,nullable=True,min=1000,max=900000),
 'reconciliation.boundary_skew_ms':dict(label='Energy comparison permitted boundary skew (ms)',kind='int',default=None,nullable=True,min=0,max=60000),
 'reconciliation.tolerance_bps':dict(label='Energy comparison approved tolerance (basis points)',kind='int',default=None,nullable=True,min=0,max=10000),
 'roles.agent.enabled':dict(label='Agent programme',kind='bool',env='ROLE_AGENT_ENABLED',default=False,available=False,scopes=['global']),
 'roles.referrer.enabled':dict(label='Referrer programme',kind='bool',env='ROLE_REFERRER_ENABLED',default=False,available=False,scopes=['global']),
 'features.automation':dict(label='Budget/schedule rollout',kind='bool',env='AUTOMATION_ENABLED',default=False),
 'features.pro_relay_control':dict(label='Resident relay-control rollout',kind='bool',default=False,legacy='pro_relay_control'),
 'features.public_reports':dict(label='Public report sharing',kind='bool',default=True),
 'payments.platform_markup_bps':dict(label='Platform markup (basis points)',kind='int',env='PLATFORM_MARKUP_BPS',default=None,min=0,max=9999,nullable=True),
 'payments.fee_bps':dict(label='Payment fee (basis points)',kind='int',env='PAYMENT_FEE_BPS',default=None,min=0,max=9999,nullable=True),
 'payments.fixed_fee_kobo':dict(label='Fixed payment fee (kobo)',kind='int',env='PAYMENT_FIXED_FEE_KOBO',default=None,min=0,max=100000000,nullable=True),
 'billing.plan_prices':dict(label='Approved monthly plan prices',kind='prices',env='BILLING_PLAN_PRICES_JSON',default={'currency':'NGN','basic':None,'basic_pro':None,'pro':None},scopes=['global','region','organisation']),
 'billing.discount_bps':dict(label='Approved quarterly/yearly discounts',kind='discounts',env='BILLING_DISCOUNT_BPS_JSON',default={'quarterly':None,'yearly':None},scopes=['global','region','organisation']),
 'billing.grace_days':dict(label='Subscription grace period (days)',kind='int',env='BILLING_GRACE_DAYS',default=None,min=0,max=90,nullable=True,scopes=['global','region','organisation']),
 'reports.link_lifetime_days':dict(label='Report sharing lifetime (days)',kind='int',env='REPORT_SHARE_DAYS',default=7,min=1,max=31),
 'advisory.voltage_band_mv':dict(label='Voltage advisory band (mV)',kind='band',env='VOLTAGE_ADVISORY_BAND_JSON',default=None,nullable=True,min=1,max=1000000),
 'advisory.current_band_ma':dict(label='Current advisory band (mA)',kind='band',env='CURRENT_ADVISORY_BAND_JSON',default=None,nullable=True,min=0,max=1000000000),
}
SCOPES=('global','region','organisation','building','device')

def spec(key):
 if key not in SPECS:raise DomainError('unknown_rule','This setting is not registered.',404)
 return SPECS[key]

def validate(key,value,publishing=False):
 s=spec(key);kind=s['kind']
 if value is None and s.get('nullable'):return None
 if kind=='bool':
  if type(value) is not bool:raise DomainError('invalid_rule','Choose enabled or disabled.')
  if publishing and value and s.get('available') is False:raise DomainError('feature_not_implemented','This deferred programme cannot be enabled before its implementation is available.',422)
 elif kind=='int':
  if type(value) is not int or not s['min']<=value<=s['max']:raise DomainError('invalid_rule','Enter a whole value within the displayed bounds.')
 elif kind=='band':
  if not isinstance(value,list) or len(value)!=2 or any(type(v) is not int for v in value) or not s['min']<=value[0]<value[1]<=s['max']:raise DomainError('invalid_rule','Supply an increasing integer band within the declared bounds.')
 elif kind in ('prices','discounts'):
  keys={'currency','basic','basic_pro','pro'} if kind=='prices' else {'quarterly','yearly'}
  if not isinstance(value,dict) or set(value)!=keys or(kind=='prices' and value['currency']!='NGN'):raise DomainError('invalid_rule','Supply the complete supported price/discount structure.')
  for k,v in value.items():
   if k=='currency':continue
   if v is not None and(type(v) is not int or not 0<=v<=(1000000000000 if kind=='prices' else 10000)):raise DomainError('invalid_rule','Monetary amounts and discounts must be bounded integer minor units, or unconfirmed.')
 return value

def device_scope(c,device_id):
 if not device_id:return {}
 d=one(c,"""SELECT d.id,coalesce(d.building_id,r.building_id) AS building_id,b.organization_id,
  coalesce(a.region,b.region) AS region FROM devices d LEFT JOIN rooms r ON r.id=d.room_id
  LEFT JOIN buildings b ON b.id=coalesce(d.building_id,r.building_id)
  LEFT JOIN device_service_areas ds ON ds.device_id=d.id LEFT JOIN service_areas a ON a.id=ds.area_id
  WHERE d.id=:id""",id=device_id)
 if not d:return {}
 return {k:str(d[k]) for k in ('building_id','organization_id','region') if d[k] is not None}|{'device_id':str(d['id'])}

def resolve(c,key,context=None,at=None):
 s=spec(key);ctx=context or {};at=at or datetime.now(timezone.utc)
 priority=[('device',ctx.get('device_id')),('building',ctx.get('building_id')),('organisation',ctx.get('organization_id')),('region',ctx.get('region')),('global','')]
 for kind,ref in priority:
  if ref is None or kind not in s.get('scopes',SCOPES):continue
  row=one(c,'SELECT id,version,value,effective_from FROM business_rule_versions WHERE rule_key=:key AND scope_type=:kind AND scope_ref=:ref AND effective_from<=:at ORDER BY version DESC LIMIT 1',key=key,kind=kind,ref=ref,at=at)
  if row:
   value=validate(key,row['value']);return {'key':key,'value':False if s.get('available') is False else value,'configured_value':value,'source':'rule','id':str(row['id']),'version':row['version'],'scope_type':kind,'scope_ref':ref,'effective_from':row['effective_from']}
 raw=current_app.config.get(s.get('env','')) if s.get('env') else None
 source='default';value=s['default']
 if raw is not None and raw!='':
  source='environment'
  try:
   if s['kind']=='bool':
    if str(raw).lower() not in ('true','false'):raise ValueError()
    value=str(raw).lower()=='true'
   elif s['kind']=='int':
    if not re.fullmatch('[0-9]+',str(raw)):raise ValueError()
    value=int(raw)
   else:value=json.loads(raw) if isinstance(raw,str) else raw
  except (ValueError,TypeError):raise DomainError('rule_configuration_invalid','A business environment default is invalid: '+key,503)
 elif s.get('legacy'):
  legacy=one(c,'SELECT enabled_globally FROM feature_flags WHERE key=:key',key=s['legacy'])
  if legacy:source='legacy_flag';value=legacy['enabled_globally']
 value=validate(key,value)
 return {'key':key,'value':False if s.get('available') is False else value,'configured_value':value,'source':source,'id':None,'version':0,'scope_type':'global','scope_ref':''}

def value(c,key,context=None):return resolve(c,key,context)['value']

def scope_ref(c,key,kind,ref):
 if kind not in spec(key).get('scopes',SCOPES):raise DomainError('invalid_rule_scope','This setting does not support that scope.')
 if kind=='global':
  if ref not in ('',None):raise DomainError('invalid_rule_scope','Global settings do not have a scope reference.')
  return ''
 if not isinstance(ref,str) or not 1<=len(ref)<=150:raise DomainError('invalid_rule_scope','Supply a bounded scope reference.')
 if kind=='region':
  exists=one(c,'SELECT region FROM service_areas WHERE region=:ref UNION SELECT region FROM buildings WHERE region=:ref LIMIT 1',ref=ref)
 else:
  table={'organisation':'organizations','building':'buildings','device':'devices'}[kind];ref=uuid_string(ref);exists=one(c,'SELECT id FROM '+table+' WHERE id=:id',id=ref)
 if not exists:raise DomainError('not_found','The selected scope does not exist.',404)
 return ref

@bp.get('/api/v1/ops/settings')
@authenticated
def catalogue():
 staff('internal_ops','internal_engineering','internal_superadmin')
 with transaction() as c:
  definitions=[{'key':key,**s,'scopes':s.get('scopes',SCOPES),'resolved':resolve(c,key)} for key,s in SPECS.items()]
  audit(c,g.actor['id'],'business_settings_viewed')
 return jsonify(items=definitions,can_edit=g.actor['role']=='internal_superadmin',precedence=['device','building','organisation','region','global','environment/default'])

@bp.route('/api/v1/ops/settings/<rule_key>',methods=['GET','POST'])
@authenticated
@idempotent
def rule(rule_key):
 staff('internal_ops','internal_engineering','internal_superadmin');s=spec(rule_key)
 data=(request.get_json() or {}) if request.method=='POST' else request.args
 kind=data.get('scope_type','global');ref=data.get('scope_ref','')
 with transaction() as c:
  ref=scope_ref(c,rule_key,kind,ref)
  history=rows(c,'SELECT id,version,value,effective_from,created_at,created_by,reason,restored_from_version FROM business_rule_versions WHERE rule_key=:key AND scope_type=:kind AND scope_ref=:ref ORDER BY version DESC LIMIT 100',key=rule_key,kind=kind,ref=ref)
  if request.method=='GET':
   audit(c,g.actor['id'],'business_rule_viewed',metadata={'key':rule_key,'scope_type':kind,'scope_ref':ref})
   context=device_scope(c,ref) if kind=='device' else {'building_id':ref} if kind=='building' else {'organization_id':ref} if kind=='organisation' else {'region':ref} if kind=='region' else {}
   if kind=='building':
    building=one(c,'SELECT organization_id,region FROM buildings WHERE id=:id',id=ref)
    context.update({k:str(building[k]) for k in ('organization_id','region') if building[k] is not None})
   return jsonify(key=rule_key,history=history,latest_version=history[0]['version'] if history else 0,resolved=resolve(c,rule_key,context))
  staff('internal_superadmin')
  query(c,'SELECT pg_advisory_xact_lock(hashtextextended(:key,0))',key='business-rule:'+rule_key+':'+kind+':'+ref)
  latest=one(c,'SELECT version,value FROM business_rule_versions WHERE rule_key=:key AND scope_type=:kind AND scope_ref=:ref ORDER BY version DESC LIMIT 1',key=rule_key,kind=kind,ref=ref)
  expected=data.get('expected_version')
  if type(expected) is not int or expected!=(latest['version'] if latest else 0):raise DomainError('version_conflict','The rule changed. Refresh before publishing.',409)
  reason=data.get('reason')
  if not isinstance(reason,str) or not 10<=len(reason.strip())<=2000:raise DomainError('invalid_rule','Explain this change in 10–2000 characters.')
  restored=data.get('restore_version')
  if restored is not None:
   if type(restored) is not int or restored<1:raise DomainError('invalid_rule','Choose a recorded version to restore.')
   old=one(c,'SELECT value FROM business_rule_versions WHERE rule_key=:key AND scope_type=:kind AND scope_ref=:ref AND version=:version',key=rule_key,kind=kind,ref=ref,version=restored)
   if not old:raise DomainError('not_found','The requested rule version was not found.',404)
   new=old['value']
  else:
   if 'value' not in data:raise DomainError('invalid_rule','A rule value is required.')
   new=data['value']
  new=validate(rule_key,new,publishing=True)
  if data.get('effective_from') is not None and not isinstance(data.get('effective_from'),str):raise DomainError('invalid_rule','Use a timezone-aware effective timestamp.')
  try:effective=datetime.fromisoformat(data['effective_from'].replace('Z','+00:00')) if data.get('effective_from') else datetime.now(timezone.utc)
  except (ValueError,AttributeError):raise DomainError('invalid_rule','Use an ISO timestamp with timezone.')
  if effective.tzinfo is None:raise DomainError('invalid_rule','Effective time needs a timezone.')
  row=one(c,'INSERT INTO business_rule_versions(rule_key,scope_type,scope_ref,version,value,effective_from,created_by,reason,restored_from_version) VALUES(:key,:kind,:ref,:version,CAST(:value AS jsonb),:effective,:uid,:reason,:restored) RETURNING id,version,effective_from',key=rule_key,kind=kind,ref=ref,version=expected+1,value=json_text(new),effective=effective,uid=g.actor['id'],reason=reason.strip(),restored=restored)
  audit(c,g.actor['id'],'business_rule_published',row['id'],{'key':rule_key,'scope_type':kind,'scope_ref':ref,'version':row['version'],'old':latest['value'] if latest else None,'new':new,'effective_from':effective.isoformat(),'restored_from_version':restored})
 return jsonify(dict(row)),201

@bp.get('/api/v1/public/business-settings')
def public_settings():
 with transaction() as c:
  prices=resolve(c,'billing.plan_prices');discounts=resolve(c,'billing.discount_bps')
 return jsonify(plan_prices=prices['value'],discount_bps=discounts['value'],source={'prices':prices['source'],'price_version':prices['version']},subscription_checkout_available=False)


def advisory_band(c,d,kind):
    """Installation declaration wins; a business default is only display/alert advice."""
    manifest=one(c,'SELECT channels FROM device_channel_manifests WHERE device_id=:id',id=d['id'])
    channel=manifest['channels'].get('voltage_v' if kind=='voltage' else 'current_a',{}) if manifest else {}
    if channel.get('warning_band'):return [value*1000 for value in channel['warning_band']]
    band=value(c,'advisory.'+kind+'_band_'+('mv' if kind=='voltage' else 'ma'),device_scope(c,d['id']))
    if band is not None:return band
    names=('VOLTAGE_WARNING_LOW_MV','VOLTAGE_WARNING_HIGH_MV') if kind=='voltage' else ('CURRENT_WARNING_LOW_MA','CURRENT_WARNING_HIGH_MA')
    try:
        low,high=[int(current_app.config.get(name,'')) for name in names]
        if 0<=low<high:return [low,high]
    except (ValueError,TypeError):pass
    return None
