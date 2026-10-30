import { copyFile, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

import { parseNginx, updateNginxSeo } from './nginx-seo-config.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configPath = '/etc/nginx/sites-available/gostudy';
const snippetPath = path.join(projectRoot, 'deploy/nginx/gostudy-seo.conf');
const source = await readFile(configPath, 'utf8');
const snippet = await readFile(snippetPath, 'utf8');
parseNginx(snippet);
const result = updateNginxSeo(source, snippetPath);

if (!process.argv.includes('--apply')) {
    console.log(result.changed ? 'GoStudy nginx SEO update: ready (no changes made)' : 'GoStudy nginx SEO update: already installed');
    process.exit(0);
}
if (process.getuid?.() !== 0) throw new Error('Run the installer with sudo');

execFileSync('nginx', ['-t'], { stdio: 'inherit' });
const backup = `${configPath}.pre-seo-${Date.now()}`;
await copyFile(configPath, backup);
const metadata = await stat(configPath);

try {
    if (result.changed) {
        const temporary = `${configPath}.seo-${process.pid}`;
        await writeFile(temporary, result.content, { mode: metadata.mode & 0o777 });
        await rename(temporary, configPath);
    }
    execFileSync('nginx', ['-t'], { stdio: 'inherit' });
    execFileSync('systemctl', ['reload', 'nginx'], { stdio: 'inherit' });
    console.log(`GoStudy nginx SEO update: OK. Backup: ${backup}`);
} catch (error) {
    await copyFile(backup, configPath);
    execFileSync('nginx', ['-t'], { stdio: 'inherit' });
    execFileSync('systemctl', ['reload', 'nginx'], { stdio: 'inherit' });
    throw error;
}
