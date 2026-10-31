#!/usr/bin/env python3
"""Install only verified source files; never touch credentials, DB, uploads or manifests."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib, json, os, shutil, sys

source = Path(__file__).resolve().parent.parent
target = Path(sys.argv[1] if len(sys.argv) == 2 else '/srv/gostudy/app').resolve()
if not (target / 'server/prisma/schema.prisma').is_file():
    raise SystemExit('Не найдены исходники GoStudy в ' + str(target))
items = json.loads((source / 'deploy/robokassa-test-patch.json').read_text())
def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else None
changes = []
for item in items:
    rel = Path(item['path'])
    if rel.is_absolute() or '..' in rel.parts:
        raise SystemExit('Некорректный путь')
    dest = target / rel
    if dest.resolve() != dest or (source / rel).is_symlink():
        raise SystemExit('Символические ссылки не поддерживаются: ' + str(rel))
    if digest(source / rel) != item['after']:
        raise SystemExit('Повреждён файл патча: ' + str(rel))
    actual = digest(dest)
    if actual == item['after']:
        continue
    if actual != item['before']:
        raise SystemExit('Файл отличается от проверенного архива. Установка остановлена: ' + str(rel))
    changes.append(item)
if not changes:
    print('Патч уже установлен')
    raise SystemExit(0)
backup = target.parent / 'backups' / ('robokassa-test-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
backup.mkdir(parents=True, mode=0o700)
owner = target.stat()
for item in changes:
    rel = Path(item['path'])
    dest = target / rel
    if dest.exists():
        saved = backup / rel
        saved.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(dest, saved)
    parent = dest.parent
    missing = []
    while not parent.exists():
        missing.append(parent)
        parent = parent.parent
    for directory in reversed(missing):
        directory.mkdir(mode=0o2750)
        os.chown(directory, owner.st_uid, owner.st_gid)
    shutil.copyfile(source / rel, dest)
    os.chown(dest, owner.st_uid, owner.st_gid)
    dest.chmod(0o640)
print('Исходники тестовой оплаты установлены. Резервная копия: ' + str(backup))
print('Миграция, сборка, настройки Robokassa и перезапуск ещё не выполнены.')
