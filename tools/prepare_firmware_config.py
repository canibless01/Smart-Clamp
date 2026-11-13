"""Combine factory identity with private transport settings for an ESP32 LittleFS image.
No device is flashed or commissioned by this tool. Inputs and output contain secrets.
"""
import argparse,json,os,pathlib,re,time
from urllib.parse import urlparse

def prepare(bundle,network):
    config={**bundle,**network}
    # Transport settings cannot replace factory identity, board, epochs or keys.
    for key in ('device_id','profile','board','key_epoch','config_epoch','telemetry_key_hex','command_key_hex'):
        if key in network:raise ValueError('Transport file must not override factory identity')
    if config.get('board')!='esp32dev' or config.get('profile') not in ('transformer','pole_gateway','pole_device','house_full','building_hub','ir_reader'):raise ValueError('Unsupported factory board/profile')
    keys=[config.get(k,'') for k in ('telemetry_key_hex','command_key_hex')]
    if any(not re.fullmatch(r'[0-9a-f]{64}',k) for k in keys) or keys[0]==keys[1]:raise ValueError('Distinct 32-byte factory keys are required')
    url=urlparse(config.get('api_origin',''))
    if url.scheme!='https' or not url.netloc or url.path not in ('','/') or url.query or url.fragment or url.username:raise ValueError('API origin must be an HTTPS origin without a path or credentials')
    if not isinstance(config.get('wifi_ssid'),str) or not config['wifi_ssid'] or not isinstance(config.get('wifi_password'),str):raise ValueError('Wi-Fi commissioning settings are required')
    if '-----BEGIN CERTIFICATE-----' not in config.get('tls_ca_pem',''):raise ValueError('Provision the real API TLS trust anchor')
    # This bring-up image cannot qualify production electrical operation or rollback.
    config['commissioned']=False;config['calibration_status']='uncalibrated';config['bootstrap_unix_s']=int(time.time())
    if config.get('ota_qualified') is True:raise ValueError('Qualification cannot be granted by the bring-up configuration tool')
    config['ota_qualified']=False
    return config

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--identity',type=pathlib.Path,required=True);p.add_argument('--transport',type=pathlib.Path,required=True);p.add_argument('--output',type=pathlib.Path,required=True);a=p.parse_args()
    try:config=prepare(json.loads(a.identity.read_text()),json.loads(a.transport.read_text()))
    except (ValueError,OSError) as e:p.error(str(e))
    a.output.parent.mkdir(parents=True,exist_ok=True)
    fd=os.open(a.output,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    with os.fdopen(fd,'w') as f:json.dump(config,f,indent=2)
    print('Private commissioning configuration written. No hardware qualification or flash performed.')
