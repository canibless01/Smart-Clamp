"""Hardware-independent display declaration; never a relay permission grant."""
import json,math
from pathlib import Path
from .db import DomainError,one,query,json_text
REGISTRY=json.loads((Path(__file__).resolve().parents[3]/'contracts/datastreams.json').read_text())
def save_manifest(c,device,payload,inbox_id):
    manifest=payload.get('manifest')
    if manifest is None:return
    if not isinstance(manifest,dict) or set(manifest)-{'version','schema_version','calibration_version','channels'}:raise DomainError('invalid_manifest','Unsupported channel manifest fields.')
    version=manifest.get('version');channels=manifest.get('channels');calibration=manifest.get('calibration_version')
    if type(version) is not int or version<1 or type(manifest.get('schema_version')) is not int or manifest.get('schema_version')!=1 or not isinstance(calibration,str) or not 1<=len(calibration)<=100 or not isinstance(channels,dict) or len(channels)>len(REGISTRY):raise DomainError('invalid_manifest','Versioned channels and calibration reference are required.')
    for name,channel in channels.items():
        if name not in REGISTRY or not isinstance(channel,dict) or set(channel)-{'unit','range','resolution','sample_interval_ms','has_calibration','warning_band'}:raise DomainError('invalid_manifest','Unsupported channel declaration.')
        if channel.get('unit')!=REGISTRY[name]['unit']:raise DomainError('invalid_manifest','Channel unit does not match the datastream registry.')
        limits=channel.get('range')
        if limits is not None and (not isinstance(limits,list) or len(limits)!=2 or any(type(v) not in(int,float) or not math.isfinite(v) for v in limits) or limits[0]>=limits[1]):raise DomainError('invalid_manifest','Channel range must contain finite increasing bounds.')
        band=channel.get('warning_band')
        if band is not None and (not isinstance(band,list) or len(band)!=2 or any(type(v) not in(int,float) or not math.isfinite(v) for v in band) or band[0]>=band[1] or limits is None or band[0]<limits[0] or band[1]>limits[1]):raise DomainError('invalid_manifest','Advisory band must fit the declared channel range.')
        for field in ('resolution','sample_interval_ms'):
            if field in channel and(type(channel[field]) not in(int,float) or not math.isfinite(channel[field]) or channel[field]<=0):raise DomainError('invalid_manifest','Channel resolution and interval must be positive.')
        if 'has_calibration' in channel and type(channel['has_calibration']) is not bool:raise DomainError('invalid_manifest','Calibration status must be explicit.')
    previous=one(c,'SELECT version,channels,calibration_version FROM device_channel_manifests WHERE device_id=:id FOR UPDATE',id=device['id'])
    if previous and version<=previous['version']:
        if version==previous['version'] and channels==previous['channels'] and calibration==previous['calibration_version']:return
        raise DomainError('manifest_version_conflict','A newer manifest version is required.',409)
    query(c,'INSERT INTO device_channel_manifests(device_id,version,schema_version,channels,calibration_version,inbox_id) VALUES(:id,:version,1,CAST(:channels AS jsonb),:calibration,:inbox) ON CONFLICT(device_id) DO UPDATE SET version=:version,channels=CAST(:channels AS jsonb),calibration_version=:calibration,inbox_id=:inbox,updated_at=now()',id=device['id'],version=version,channels=json_text(channels),calibration=calibration,inbox=inbox_id)
