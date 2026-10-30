import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { INDEXABLE_PUBLIC_ROUTES, SITE_URL } from '../src/components/Seo/seoConfig.js';
import { PLATFORM_IDENTITY } from '../src/config/platformIdentity.js';

const execute = promisify(execFile);

export async function requestPage(url, local = false) {
    const args = ['-sS', '--connect-timeout', '8', '--max-time', '25', '-D', '-'];
    if (local) {
        args.push('--noproxy', '*');
        for (const host of ['gostudyonline.ru', 'www.gostudyonline.ru']) {
            for (const port of [80, 443]) args.push('--resolve', `${host}:${port}:127.0.0.1`);
        }
    }
    args.push('--write-out', '\nGOSTUDY_HTTP:%{http_code}', url);
    const { stdout } = await execute('curl', args, { maxBuffer: 4 * 1024 * 1024 });
    const cut = stdout.lastIndexOf('\nGOSTUDY_HTTP:');
    let body = stdout.slice(0, cut);
    const status = Number(stdout.slice(cut + '\nGOSTUDY_HTTP:'.length));
    let headers = '';
    while (body.startsWith('HTTP/')) {
        const match = /\r?\n\r?\n/.exec(body);
        if (!match) throw new Error('Unexpected HTTP response');
        headers = body.slice(0, match.index);
        body = body.slice(match.index + match[0].length);
    }
    return { status, body, headers };
}

export async function checkSeoDeployment({ local = false } = {}) {
    const failures = [];
    let count = 0;
    function check(ok, message) {
        if (!ok) failures.push(message);
    }
    async function get(route) {
        count += 1;
        return requestPage(route.startsWith('http') ? route : `${SITE_URL}${route}`, local);
    }
    // Run sequentially: this is a deployment smoke test, not a load test.
    for (const route of INDEXABLE_PUBLIC_ROUTES) {
        const page = await get(route);
        check(page.status === 200, `${route}: expected 200, got ${page.status}`);
        check(/<h1(?:\s|>)/i.test(page.body), `${route}: H1 missing`);
        check(page.body.includes(`rel="canonical" href="${SITE_URL}${route}"`), `${route}: wrong canonical`);
        check(/name="robots" content="index, follow"/.test(page.body), `${route}: unexpected robots`);
        if (['/', '/support', '/requisites'].includes(route)) {
            check(page.body.includes(PLATFORM_IDENTITY.supportPhoneHref), `${route}: public phone missing`);
        }
        if (route === '/pricing') {
            check(!page.body.includes('Загружаем действующую стоимость'), '/pricing: only a loader was returned');
            const encoded = page.body.match(/<script id="gostudy-tariff-publication" type="application\/json">([\s\S]*?)<\/script>/);
            const api = await get('/api/v1/tariffs/public');
            if (encoded && api.status === 200) {
                const snapshot = JSON.parse(encoded[1]);
                const active = JSON.parse(api.body).data;
                check(snapshot.id === active?.id && snapshot.version === active?.version,
                    '/pricing: HTML publication differs from the active DB publication');
                check(snapshot.content.individual.price_rubles === active?.content?.individual?.price_rubles,
                    '/pricing: price differs from the active DB publication');
            } else check(false, '/pricing: no initial publication, or public API is unavailable');
        }
    }

    for (const route of ['/legal/offer', '/legal/privacy', '/legal/agreement', '/legal/tariffs']) {
        const page = await get(route);
        check(page.status === 200 && /<h1(?:\s|>)/.test(page.body), `${route}: document HTML missing`);
        check(/name="robots" content="noindex/.test(page.body), `${route}: noindex missing`);
        check(page.body.includes(`rel="canonical" href="${SITE_URL}${route}"`), `${route}: wrong canonical`);
        check(!page.body.includes('Загружаем документ'), `${route}: only a loader was returned`);
    }
    for (const route of ['/login', '/register', '/account', '/admin/login', '/classroom/1']) {
        const page = await get(route);
        check(page.status === 200, `${route}: SPA route unavailable`);
        check(/name="robots" content="noindex/.test(page.body), `${route}: initial noindex missing`);
        check(!page.body.includes(`rel="canonical" href="${SITE_URL}/"`), `${route}: points to homepage canonical`);
    }
    for (const [route, target] of [
        ['/about.html', '/about'], ['/pricing/', '/pricing'],
        ['/agreement', '/legal/agreement'], ['/offer', '/legal/offer'],
        ['/legal/offer.html', '/legal/offer'],
    ]) {
        const page = await get(route);
        check(page.status === 301, `${route}: expected a server-side 301`);
        const location = /^location:\s*([^\r\n]+)/im.exec(page.headers)?.[1];
        check(location && new URL(location, SITE_URL).href === `${SITE_URL}${target}`, `${route}: wrong redirect destination`);
    }
    for (const route of ['/404', '/not-existing-seo-check', '/legal/not-existing-document']) {
        const page = await get(route);
        check(page.status === 404, `${route}: expected a real HTTP 404`);
        check(page.body.includes('Страница не найдена'), `${route}: branded 404 is missing`);
    }
    const robots = await get('/robots.txt');
    const sitemap = await get('/sitemap.xml');
    check(robots.status === 200 && robots.body.includes(`Sitemap: ${SITE_URL}/sitemap.xml`), 'robots.txt is invalid');
    check(!/Disallow:\s*\/(?:login|account|admin|classroom)/.test(robots.body), 'robots.txt prevents reading noindex');
    check(sitemap.status === 200, 'sitemap.xml is unavailable');
    const listed = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
    check(JSON.stringify(listed) === JSON.stringify(INDEXABLE_PUBLIC_ROUTES.map(p => SITE_URL + p)), 'sitemap URL list differs from the page registry');
    for (const url of ['http://gostudyonline.ru/', 'https://www.gostudyonline.ru/']) {
        const page = await get(url);
        check(page.status === 301 && /^location:\s*https:\/\/gostudyonline\.ru\//im.test(page.headers), `${url}: main-host redirect is invalid`);
    }
    if (failures.length) throw new Error(`Live SEO check failed:\n- ${failures.join('\n- ')}`);
    console.log(`Live SEO check: OK (${count} read-only HTTP checks)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    await checkSeoDeployment({ local: process.argv.includes('--local') });
}
