"""Strict preference validation and shared alert presentation metadata."""
import json,re
from pathlib import Path
from .db import DomainError
CATALOG=json.loads((Path(__file__).resolve().parents[3]/'contracts/alert-types.json').read_text())
ALIASES={'supply.lost':'supply_lost','supply.restored':'supply_restored','payment.confirmed':'topup_success','wallet.low':'low_credit','wallet.zero':'credit_empty','relay.changed':'relay_changed','device.offline':'device_offline','device.online':'device_online','tamper':'tamper','protection':'protection'}
def alert_details(key,details=None):
    code=(details or {}).get('alert_type') or ALIASES.get(key,'info')
    if code not in CATALOG:code='info'
    return {'alert_type':code,**CATALOG[code],**{k:v for k,v in (details or {}).items() if k not in ('severity','iconId','soundId','hapticPattern','label','alert_type')}}
def validate_sensory(value):
    allowed={'audio_enabled','muted','haptics_enabled','volume','per_type','quiet_hours'}
    if not isinstance(value,dict) or set(value)-allowed:raise DomainError('validation_error','Unknown sensory preference.')
    for key in ('audio_enabled','muted','haptics_enabled'):
        if key in value and type(value[key]) is not bool:raise DomainError('validation_error','Sensory switches require booleans.')
    if 'volume' in value and (type(value['volume']) not in(int,float) or not 0<=value['volume']<=1):raise DomainError('validation_error','Volume must be between zero and one.')
    types=value.get('per_type',{})
    if not isinstance(types,dict) or set(types)-set(CATALOG) or any(type(v) is not bool for v in types.values()):raise DomainError('validation_error','Select supported alert types.')
    quiet=value.get('quiet_hours')
    if 'quiet_hours' in value:
        if not isinstance(quiet,dict) or set(quiet)!={'enabled','start','end'} or type(quiet['enabled']) is not bool or any(not isinstance(quiet[k],str) or not re.fullmatch(r'(?:[01]\d|2[0-3]):[0-5]\d',quiet[k]) for k in ('start','end')):raise DomainError('validation_error','Quiet hours require an explicit switch and HH:mm times.')
    return value
