import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { parseNginx, updateNginxSeo } from './nginx-seo-config.mjs';

const includePath = '/srv/gostudy/app/deploy/nginx/gostudy-seo.conf';
const original = `server {
    server_name gostudyonline.ru;
    root /var/www/gostudy;
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/gostudyonline.ru/fullchain.pem;
    add_header Strict-Transport-Security "max-age=31536000" always;
    error_page 404 /404.html;
    location = /404.html { internal; }
    location = / { try_files /index.html =404; }
    location = /index.html { add_header Cache-Control "no-cache"; }
    location /api/ { proxy_pass http://127.0.0.1:3002; }
    location = /api/v1/classroom/events { proxy_buffering off; proxy_read_timeout 1h; }
    location ~ ^/(about|students|teachers|pricing|payment-and-refunds|requisites|support)/?$ { try_files /$1.html =404; }
    location ~ ^/(login|register|password-reset|profile-start|account|verify-email|agreement|privacy|rules|offer|payment|refund|404)/?$ { try_files /index.html =404; }
    location ~ ^/legal/(agreement|marketing-consent|offer|parent-child-data-consent|personal-data-consent|privacy|rules|tariffs)/?$ { try_files /index.html =404; }
    location ~ ^/classroom/[^/]+/?$ { try_files /index.html =404; }
    location ~ ^/admin(?:/.*)?$ { try_files /index.html =404; }
    location /assets/ { try_files $uri =404; expires 1y; }
    location ~ \\.php$ { return 404; }
    location / { try_files $uri $uri.html =404; }
}
server { listen 80; server_name gostudyonline.ru www.gostudyonline.ru; return 301 https://gostudyonline.ru$request_uri; }
server { listen 443 ssl; server_name www.gostudyonline.ru; return 301 https://gostudyonline.ru$request_uri; }
`;

test('updates only GoStudy SEO routes and preserves TLS, API, SSE and redirects', () => {
    const updated = updateNginxSeo(original, includePath);
    assert.equal(updated.changed, true);
    assert.match(updated.content, /include \/srv\/gostudy\/app\/deploy\/nginx\/gostudy-seo.conf;/);
    for (const retained of [
        'ssl_certificate /etc/letsencrypt/live/gostudyonline.ru/fullchain.pem;',
        'add_header Strict-Transport-Security "max-age=31536000" always;',
        'location /api/ { proxy_pass http://127.0.0.1:3002; }',
        'location = /api/v1/classroom/events { proxy_buffering off; proxy_read_timeout 1h; }',
        'location /assets/ { try_files $uri =404; expires 1y; }',
        'return 301 https://gostudyonline.ru$request_uri;',
    ]) assert.ok(updated.content.includes(retained));
    assert.doesNotMatch(updated.content, /try_files \/index.html/);
    assert.equal(parseNginx(updated.content).length, 3);
});

test('installation is idempotent', () => {
    const once = updateNginxSeo(original, includePath).content;
    assert.deepEqual(updateNginxSeo(once, includePath), { content: once, changed: false });
});

test('refuses to overwrite custom route security directives', () => {
    const customized = original.replace('try_files /index.html =404;', 'auth_basic "Private"; try_files /index.html =404;');
    assert.throws(() => updateNginxSeo(customized, includePath), /Custom nginx directives/);
});

test('refuses ambiguous or unfamiliar server configuration', () => {
    assert.throws(() => updateNginxSeo(original + original, includePath), /Expected one/);
    assert.throws(() => updateNginxSeo(original.replace('/var/www/gostudy', '/var/www/other'), includePath), /Expected one/);
    assert.throws(() => updateNginxSeo(original, '/path with spaces'), /include path/);
    assert.throws(() => parseNginx('server {'), /Incomplete/);
});

test('quoted braces and comments do not confuse the structural reader', () => {
    const parsed = parseNginx('server { # ignore }\n add_header Example "{ quoted }"; }');
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].children[0].header, 'add_header Example "{ quoted }"');
});

test('deployment snippet contains all required routes and no TLS or DB replacement', async () => {
    const snippet = await readFile(new URL('../deploy/nginx/gostudy-seo.conf', import.meta.url), 'utf8');
    parseNginx(snippet);
    assert.match(snippet, /api\/v1\/public-pages\/pricing/);
    assert.match(snippet, /try_files \/spa.html =404/);
    assert.match(snippet, /api\/v1\/public-pages\/site\?path=\$uri/);
    assert.match(snippet, /location = \/404 \{ return 404; \}/);
    assert.doesNotMatch(snippet, /ssl_certificate|DATABASE_URL|migrate|seed/);
});
