#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (process.argv.length !== 3) throw new Error('Укажите путь к существующему проекту GoStudy');
const target = fs.realpathSync(path.resolve(process.argv[2]));
if (!fs.existsSync(path.join(target, 'server/prisma/schema.prisma'))) throw new Error('Не найден проект GoStudy');
const items = JSON.parse(fs.readFileSync(path.join(source, 'deploy/classroom-video-patch.json'), 'utf8'));
const digest = (file) => fs.existsSync(file) ? createHash('sha256').update(fs.readFileSync(file)).digest('hex') : null;
const changes = [];
for (const item of items) {
    if (!/^[a-zA-Z0-9_.\/-]+$/.test(item.path) || item.path.split('/').some((p) => p === '..' || p === '' || p === '.')) throw new Error('Некорректный путь патча');
    for (const base of [source, target]) {
        let current = base;
        for (const part of item.path.split('/')) {
            current = path.join(current, part);
            try { if (fs.lstatSync(current).isSymbolicLink()) throw new Error(`Символическая ссылка: ${item.path}`); }
            catch (error) { if (error.code !== 'ENOENT') throw error; }
        }
    }
    if (digest(path.join(source, item.path)) !== item.after) throw new Error(`Повреждён файл патча: ${item.path}`);
    const actual = digest(path.join(target, item.path));
    if (actual === item.after) continue;
    if (actual !== item.before) throw new Error(`Установка остановлена: файл отличается от архива GitHub — ${item.path}`);
    changes.push(item);
}
if (!changes.length) {
    console.log('Патч уже установлен. Настройки и база не изменены.');
    process.exit(0);
}
const backup = path.join(path.dirname(target), 'backups', `classroom-video-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`);
fs.mkdirSync(backup, { recursive: true, mode: 0o700 });
const owner = fs.statSync(target);
for (const item of changes) {
    const dest = path.join(target, item.path);
    if (fs.existsSync(dest)) {
        const saved = path.join(backup, item.path);
        fs.mkdirSync(path.dirname(saved), { recursive: true, mode: 0o700 });
        fs.copyFileSync(dest, saved);
    }
}
fs.writeFileSync(path.join(backup, 'changes.json'), JSON.stringify(changes, null, 2), { mode: 0o600 });
for (const item of changes) {
    const dest = path.join(target, item.path);
    const missing = [];
    let parent = path.dirname(dest);
    while (!fs.existsSync(parent)) { missing.push(parent); parent = path.dirname(parent); }
    for (const dir of missing.reverse()) {
        fs.mkdirSync(dir, { mode: 0o2750 });
        if (process.platform !== 'win32' && process.getuid() === 0) fs.chownSync(dir, owner.uid, owner.gid);
    }
    const temp = `${dest}.patch-${randomUUID()}`;
    try {
        fs.writeFileSync(temp, fs.readFileSync(path.join(source, item.path)), { flag: 'wx', mode: 0o640 });
        if (process.platform !== 'win32' && process.getuid() === 0) fs.chownSync(temp, owner.uid, owner.gid);
        fs.renameSync(temp, dest);
    } finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
}
console.log(`Размеры видеоокон обновлены. Резервная копия: ${backup}`);
console.log('Нужны проверка и сборка фронтенда. База, настройки и серверный код не изменены.');
