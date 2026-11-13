"""Create separate local signing/encryption keys without printing or overwriting secrets."""
import argparse,os,pathlib
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa,ec

def write_private(path,content):
    fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    with os.fdopen(fd,'wb') as file:file.write(content)

def bootstrap(path):
    path.mkdir(mode=0o700,parents=False,exist_ok=False)
    for name in ('firmware','reports'):
        key=rsa.generate_private_key(public_exponent=65537,key_size=3072)
        write_private(path/(name+'-private.pem'),key.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption()))
        write_private(path/(name+'-public.pem'),key.public_key().public_bytes(serialization.Encoding.PEM,serialization.PublicFormat.SubjectPublicKeyInfo))
    env='DEVICE_HMAC_ENCRYPTION_KEY='+Fernet.generate_key().decode()+'\nOTA_SIGNING_KEY_FILE='+str((path/'firmware-private.pem').resolve())+'\nREPORT_SIGNING_KEY_FILE='+str((path/'reports-private.pem').resolve())+'\nOTA_ENABLED=false\nSMS_ENABLED=false\n'
    vapid=ec.generate_private_key(ec.SECP256R1())
    write_private(path/'vapid-private.pem',vapid.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption()))
    env+='PUSH_ENCRYPTION_KEY='+Fernet.generate_key().decode()+'\nVAPID_PRIVATE_KEY_FILE='+str((path/'vapid-private.pem').resolve())+'\nWEB_PUSH_ENABLED=false\n'
    write_private(path/'server-secrets.env',env.encode())

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output-dir',type=pathlib.Path,required=True);a=p.parse_args()
    try:bootstrap(a.output_dir)
    except FileExistsError:p.error('Output directory already exists. Preserve existing keys; use a new directory only for a reviewed rotation.')
    print('Separate private keys and server-secrets.env created. Store securely and configure deployment secret mounts; do not commit them.')
