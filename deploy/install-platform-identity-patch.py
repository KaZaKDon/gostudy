#!/usr/bin/env python3
"""Install this patch after verifying the original source files; keep runtime configuration."""

import argparse
from datetime import datetime, timezone
import grp
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import pwd
import shutil


def digest(data):
    return hashlib.sha256(data.replace(b'\r\n', b'\n').removeprefix(b'\xef\xbb\xbf')).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--target', type=Path, default=Path('/srv/gostudy/app'))
    args = parser.parse_args()
    if os.geteuid() != 0:
        raise SystemExit('Запустите установку через sudo.')
    source = Path(__file__).resolve().parents[1]
    target = args.target.resolve()
    if json.loads((target / 'package.json').read_text())['name'] != 'gostudy':
        raise SystemExit('Целевая папка не является проектом GoStudy.')
    manifest_path = source / 'deploy/platform-identity-patch.json'
    manifest = json.loads(manifest_path.read_text())
    for name, hashes in manifest['files'].items():
        relative = PurePosixPath(name)
        if relative.is_absolute() or '..' in relative.parts:
            raise SystemExit('Некорректный путь в архиве.')
        if digest((source / name).read_bytes()) != hashes['after']:
            raise SystemExit('Нарушена целостность архива: ' + name)
        destination = target / name
        if not destination.resolve().is_relative_to(target) or destination.is_symlink():
            raise SystemExit('Небезопасный путь назначения: ' + name)
        if destination.exists():
            actual = digest(destination.read_bytes())
            allowed = {hashes['after'], hashes.get('before')}
            if actual not in allowed:
                raise SystemExit('Файл отличается от проверенной версии. Изменений нет: ' + name)
        elif hashes.get('before'):
            raise SystemExit('Отсутствует исходный файл. Изменений нет: ' + name)

    uid = pwd.getpwnam('ubuntu').pw_uid
    gid = grp.getgrnam('gostudy').gr_gid
    backup = target.parent / 'backups' / ('platform-identity-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
    backup.mkdir(parents=True, mode=0o700)
    for name in list(manifest['files']) + ['deploy/platform-identity-patch.json']:
        destination = target / name
        if destination.exists():
            saved = backup / name
            saved.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(destination, saved)
        missing = []
        parent = destination.parent
        while not parent.exists():
            missing.append(parent)
            parent = parent.parent
        for parent in reversed(missing):
            parent.mkdir(mode=0o2750)
            os.chown(parent, uid, gid)
            parent.chmod(0o2750)
        shutil.copyfile(source / name, destination)
        os.chown(destination, uid, gid)
        destination.chmod(0o640)
    print('Реквизиты и контакты: исходники установлены')
    print('Резервная копия исходников: ' + str(backup))


if __name__ == '__main__':
    main()
