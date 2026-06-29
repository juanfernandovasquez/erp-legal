import paramiko
import os
from pathlib import Path

HOST = '137.184.54.245'
USER = 'root'
PASS = 'KDB_2026_PROYECTO'
LOCAL_DIST = Path('frontend/dist')
REMOTE_DIR = '/opt/erp-legal/frontend/dist'
CONTAINER  = 'erp-legal-frontend'
NGINX_PATH = '/usr/share/nginx/html'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS)

sftp = ssh.open_sftp()

def upload_dir(local: Path, remote: str):
    try:
        sftp.mkdir(remote)
    except IOError:
        pass
    for item in local.iterdir():
        r = f"{remote}/{item.name}"
        if item.is_dir():
            upload_dir(item, r)
        else:
            print(f"  uploading {item.name}")
            sftp.put(str(item), r)

print("Uploading dist...")
upload_dir(LOCAL_DIST, REMOTE_DIR)
sftp.close()

print("Copying into container...")
_, stdout, stderr = ssh.exec_command(
    f"docker cp {REMOTE_DIR}/. {CONTAINER}:{NGINX_PATH}/"
)
print(stdout.read().decode())
err = stderr.read().decode()
if err:
    print("STDERR:", err)

print("Done. Nginx serves new build immediately.")
ssh.close()
