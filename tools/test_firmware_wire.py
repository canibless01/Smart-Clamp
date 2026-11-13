"""Compile the firmware wire implementation against Python-generated HMAC/RSA fixtures."""
import base64,hashlib,hmac,json,pathlib,secrets,subprocess,tempfile
from cryptography.hazmat.primitives import serialization,hashes
from cryptography.hazmat.primitives.asymmetric import rsa,padding
root=pathlib.Path(__file__).resolve().parents[1]
include=root/'firmware/.pio/libdeps/house_full/ArduinoJson/src'
if not include.exists():raise SystemExit('Build the house_full PlatformIO target first to install pinned ArduinoJson.')
canonical=lambda p:json.dumps(p,sort_keys=True,separators=(',',':'),ensure_ascii=True).encode()
key=secrets.token_bytes(32);did='00000000-0000-4000-8000-000000000001';p={'device_id':did,'key_epoch':1,'kind':'heartbeat','seq':1}
encoded=base64.urlsafe_b64encode(canonical(p)).rstrip(b'=').decode();envelope={'device_id':did,'key_epoch':1,'payload_b64':encoded,'signature':hmac.new(key,f'SC1\n{did}\n1\n{encoded}'.encode(),hashlib.sha256).hexdigest()}
private=rsa.generate_private_key(public_exponent=65537,key_size=3072);manifest={'kind':'firmware_manifest','board':'esp32dev','profile':'house_full','sha256':'a'*64,'secure_version':1,'size_bytes':1024,'version':'wire-test'}
fixture={'key':key.hex(),'device_id':did,'envelope':envelope,'payload_sha256':hashlib.sha256(canonical(p)).hexdigest(),'manifest':manifest,'signature':base64.b64encode(private.sign(canonical(manifest),padding.PKCS1v15(),hashes.SHA256())).decode(),'public_key':private.public_key().public_bytes(serialization.Encoding.PEM,serialization.PublicFormat.SubjectPublicKeyInfo).decode()}
with tempfile.TemporaryDirectory(prefix='smartclamp-wire-') as tmp:
    out=pathlib.Path(tmp);(out/'fixture.json').write_text(json.dumps(fixture))
    subprocess.run(['c++','-std=c++17','-Wall','-Wextra','-Werror','-I'+str(root/'firmware/include'),'-I'+str(include),str(root/'firmware/tests/wire_test.cpp'),'-lcrypto','-o',str(out/'wire')],check=True)
    subprocess.run([str(out/'wire'),str(out/'fixture.json')],check=True)
