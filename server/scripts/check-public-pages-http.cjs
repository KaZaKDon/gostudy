require('reflect-metadata');
const assert = require('node:assert/strict');
const { Test } = require('@nestjs/testing');
const { ConfigService } = require('@nestjs/config');
const helmet = require('helmet');
const { PublicPagesController } = require('../dist/modules/public-pages/public-pages.controller');
const { PublicPagesService } = require('../dist/modules/public-pages/public-pages.service');
const { PublicPageRendererService } = require('../dist/modules/public-pages/public-page-renderer.service');
const { TariffsService } = require('../dist/modules/tariffs/tariffs.service');

async function main() {
    const { tariffPublication } = await import('../../scripts/test-fixtures/tariff-publication.mjs');
    let current = tariffPublication();
    let unavailable = false;
    const moduleRef = await Test.createTestingModule({
        controllers: [PublicPagesController],
        providers: [
            PublicPagesService, PublicPageRendererService,
            { provide: ConfigService, useValue: new ConfigService({}) },
            { provide: TariffsService, useValue: {
                publicTariffs: async () => {
                    if (unavailable) throw new Error('Simulated DB failure, not production');
                    return { success: true, data: current };
                },
            } },
        ],
    }).compile();
    const app = moduleRef.createNestApplication({ logger: false });
    app.use(helmet());
    app.setGlobalPrefix('api/v1');
    try {
        await app.listen(0, '127.0.0.1');
        const url = `${await app.getUrl()}/api/v1/public-pages/pricing`;
        const response = await fetch(url);
        const html = await response.text();
        assert.equal(response.status, 200);
        assert.match(response.headers.get('content-type'), /text\/html/);
        assert.equal(response.headers.get('cache-control'), 'no-store');
        assert.match(html, /Единый тариф преподавателя/);
        assert.match(html, /990/);
        assert.match(html, /gostudy-tariff-publication/);
        assert.doesNotMatch(html, /Загружаем действующую стоимость/);
        assert.doesNotMatch(html, /<script>\s*try/);

        current = tariffPublication(1490, 3);
        const changed = await fetch(url).then(r => r.text());
        assert.match(changed, /1(?:\s|\u00a0|&#xA0;)?490/);
        assert.match(changed, /Редакция v3/);

        unavailable = true;
        const failure = await fetch(url);
        assert.equal(failure.status, 503);
        assert.equal(failure.headers.get('retry-after'), '60');
        assert.match(failure.headers.get('x-robots-tag'), /noindex/);
        assert.doesNotMatch(await failure.text(), /Simulated DB failure/);
        console.log('Public tariff HTTP: OK (SSR, live price changes, CSP-compatible bootstrap, safe 503; no database connection)');
    } finally {
        await app.close();
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
