const assert = require('node:assert/strict');
const { Test } = require('@nestjs/testing');
const { ValidationPipe } = require('@nestjs/common');
process.env.NODE_ENV = 'test';
process.env.LEGAL_DOCUMENTS_DIR = require('node:path').resolve(__dirname, '../../shared/legal');
process.env.DATABASE_URL = 'postgresql://unused:unused@127.0.0.1:1/unused';
const { AppModule } = require('../dist/app.module');
const { PrismaService } = require('../dist/common/prisma/prisma.service');
const { TariffsService } = require('../dist/modules/tariffs/tariffs.service');
const defaults = require('../../shared/platform-identity.json');

async function main() {
    const { tariffPublication } = await import('../../scripts/test-fixtures/tariff-publication.mjs');
    let content = { ...defaults };
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(PrismaService).useValue({ platformIdentity: { findUnique: async () => ({ content, revision: 1 }) } })
        .overrideProvider(TariffsService).useValue({ publicTariffs: async () => ({ success: true, data: tariffPublication() }) })
        .compile();
    const app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    try {
        await app.listen(0, '127.0.0.1');
        const base = await app.getUrl();
        const request = (path, options) => fetch(base + '/api/v1/' + path, options);
        let response = await request('platform-identity');
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('cache-control'), 'no-store');
        assert.equal((await response.json()).data.city, 'г. Новочеркасск');
        for (const method of ['GET', 'PUT']) {
            response = await request('admin/platform-identity', { method });
            assert.equal(response.status, 401);
        }
        content = { ...content, city: 'Изменённый город', supportEmail: 'updated@example.ru' };
        for (const path of ['/', '/requisites', '/support', '/pricing', '/legal/offer']) {
            response = await request('public-pages/site?path=' + encodeURIComponent(path));
            assert.equal(response.status, 200, path);
            assert.equal(response.headers.get('cache-control'), 'no-store');
            const html = await response.text();
            assert.match(html, /updated@example.ru/, path);
            assert.match(html, /Изменённый город/, path);
            assert.doesNotMatch(html, /<script>alert/);
            if (path === '/legal/offer') assert.match(html, /615001269006/);
        }
        response = await request('public-pages/site?path=' + encodeURIComponent('/../../etc/passwd'));
        assert.equal(response.status, 404);
        console.log('Identity HTTP: OK (public data, current HTML/SEO, legal text, anonymous write protection, path allowlist)');
    } finally { await app.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
