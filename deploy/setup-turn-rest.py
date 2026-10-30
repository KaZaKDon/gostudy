#!/usr/bin/env python3
"""Configure Coturn and GoStudy with one server-side TURN REST secret."""

import argparse
from datetime import datetime, timezone
import grp
from ipaddress import IPv4Address
import os
from pathlib import Path
import pwd
import re
import secrets
import shutil
import subprocess
import tempfile


def environment(text, values, remove=()):
    keys = set(values) | set(remove)
    lines = [line for line in text.splitlines() if line.partition('=')[0].strip() not in keys]
    return '\n'.join(lines + [key + '=' + value for key, value in values.items()]) + '\n'


def atomic_write(path, text, mode, uid, gid):
    with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=path.parent, delete=False) as output:
        temporary = Path(output.name)
        try:
            output.write(text)
            output.flush()
            os.fchmod(output.fileno(), mode)
            os.fchown(output.fileno(), uid, gid)
            os.replace(temporary, path)
        finally:
            temporary.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--public-ip', required=True)
    parser.add_argument('--private-ip', required=True)
    args = parser.parse_args()
    if os.geteuid() != 0:
        raise SystemExit('Запустите эту команду через sudo.')
    public = IPv4Address(args.public_ip)
    private = IPv4Address(args.private_ip)
    if not public.is_global or not private.is_private or private.is_loopback:
        raise SystemExit('Проверьте публичный и внутренний IPv4-адреса.')
    if str(private) not in subprocess.check_output(['hostname', '-I'], text=True).split():
        raise SystemExit('Внутренний адрес отсутствует на этом сервере. Изменений нет.')

    os.umask(0o077)
    app = Path('/etc/gostudy/app.env')
    frontend = Path('/etc/gostudy/frontend.env')
    turn = Path('/etc/turnserver.conf')
    text = app.read_text(encoding='utf-8')
    stored_secret = next((line.partition('=')[2].strip() for line in text.splitlines()
                          if line.startswith('WEBRTC_TURN_AUTH_SECRET=')), '')
    if stored_secret and not re.fullmatch(r'[0-9a-f]{64}', stored_secret):
        raise SystemExit('Уже задан другой формат TURN-секрета. Автоматическая замена остановлена.')
    secret = stored_secret or secrets.token_hex(32)
    urls = ','.join('turn:' + str(public) + ':3478?transport=' + protocol
                    for protocol in ('udp', 'tcp'))
    turn_user = pwd.getpwnam('turnserver')
    turn_group = grp.getgrnam('turnserver').gr_gid
    app_group = grp.getgrnam('gostudy').gr_gid
    backup = Path('/var/backups/gostudy/turn-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
    backup.mkdir(parents=True, mode=0o700)
    for path in (app, frontend, turn):
        if path.exists():
            shutil.copy2(path, backup / (path.parent.name + '-' + path.name))

    app_text = environment(text, {
        'WEBRTC_TURN_URLS': urls,
        'WEBRTC_TURN_AUTH_SECRET': secret,
        'WEBRTC_TURN_TTL_SECONDS': '7200',
    })
    frontend_text = environment(frontend.read_text(encoding='utf-8') if frontend.exists() else '', {
        'VITE_NODE_API_BASE_URL': '/api/v1',
        'VITE_LESSON_SETTLEMENTS_ENABLED': 'false',
    }, remove=('VITE_WEBRTC_TURN_URL', 'VITE_WEBRTC_TURN_USERNAME', 'VITE_WEBRTC_TURN_CREDENTIAL'))
    turn_text = '\n'.join([
        'listening-port=3478',
        'listening-ip=' + str(private),
        'relay-ip=' + str(private),
        'external-ip=' + str(public) + '/' + str(private),
        'min-port=49160', 'max-port=49200',
        'realm=gostudyonline.ru', 'fingerprint',
        'use-auth-secret', 'static-auth-secret=' + secret, 'stale-nonce=600',
        'userdb=/var/lib/turn/turndb', 'pidfile=/run/coturn/turnserver.pid',
        'no-cli', 'no-tls', 'no-dtls', 'no-tcp-relay', 'no-multicast-peers',
        'user-quota=8', 'total-quota=40', 'max-bps=2500000', 'bps-capacity=12500000',
        'denied-peer-ip=0.0.0.0-0.255.255.255',
        'denied-peer-ip=10.0.0.0-10.255.255.255',
        'denied-peer-ip=100.64.0.0-100.127.255.255',
        'denied-peer-ip=127.0.0.0-127.255.255.255',
        'denied-peer-ip=169.254.0.0-169.254.255.255',
        'denied-peer-ip=172.16.0.0-172.31.255.255',
        'denied-peer-ip=192.168.0.0-192.168.255.255',
        'log-file=stdout', '',
    ])
    database_dir = Path('/var/lib/turn')
    database_dir.mkdir(mode=0o750, exist_ok=True)
    os.chown(database_dir, turn_user.pw_uid, turn_group)
    dropin = Path('/etc/systemd/system/coturn.service.d')
    dropin.mkdir(mode=0o755, parents=True, exist_ok=True)
    atomic_write(dropin / '10-gostudy.conf',
                 '[Service]\nRuntimeDirectory=coturn\nRuntimeDirectoryMode=0750\n', 0o644, 0, 0)
    atomic_write(app, app_text, 0o640, 0, app_group)
    atomic_write(frontend, frontend_text, 0o640, 0, app_group)
    atomic_write(turn, turn_text, 0o640, 0, turn_group)
    print('TURN REST: configured')
    print('Адреса: ' + str(public) + ' / ' + str(private))
    print('Сохранены настройки API, Coturn и сборки фронтенда.')
    print('Службы пока не перезапускались. Резервная копия: ' + str(backup))


if __name__ == '__main__':
    main()
