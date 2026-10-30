import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { tariffPublication } from './test-fixtures/tariff-publication.mjs';

const require = createRequire(import.meta.url);
const renderer = require('../server/public-pages-renderer/renderer.cjs');

test('production SSR renders the actual published tariff without a loader', async () => {
    const publication = tariffPublication();
    assert.equal(renderer.isTariffPublication(publication), true);
    const html = renderer.renderPricingPage(publication);
    assert.match(html, /Единый тариф преподавателя/);
    assert.match(html, /990/);
    assert.match(html, /30 дней/);
    assert.match(html, /следующие 2/);
    assert.doesNotMatch(html, /Загружаем действующую стоимость/);
    assert.match(html, /tel:\+79515220669/);
});

test('a new publication changes SSR prices without rebuilding', async () => {
    const first = renderer.renderPricingPage(tariffPublication(990));
    const second = renderer.renderPricingPage(tariffPublication(1490, 3));
    assert.notEqual(first, second);
    assert.match(second, /1(?:\s|\u00a0|&#xA0;)?490/);
    assert.match(second, /Редакция v3/);
});

test('drafts and invalid prices cannot become a public tariff snapshot', () => {
    const draft = tariffPublication();
    draft.status = 'draft';
    assert.equal(renderer.isTariffPublication(draft), false);
    assert.equal(renderer.isTariffPublication(tariffPublication(-1)), false);
    assert.equal(renderer.isTariffPublication({ content: {} }), false);
});

test('admin-supplied tariff text is HTML escaped', async () => {
    const publication = tariffPublication();
    publication.content.individual.summary = '<script>alert("xss")</script>';
    const html = renderer.renderPricingPage(publication);
    assert.doesNotMatch(html, /<script>alert/);
    assert.match(html, /&lt;script&gt;/);
});

test('legal documents are rendered in full before JavaScript executes', async () => {
    const html = await readFile(new URL('../dist/legal/offer.html', import.meta.url), 'utf8');
    assert.match(html, /<h1>Публичная оферта/);
    assert.match(html, /Отключение автоматического продления/);
    assert.doesNotMatch(html, /Загружаем документ/);
});

test('404 renderer is a real error page, not the homepage', async () => {
    const html = await readFile(new URL('../dist/404.html', import.meta.url), 'utf8');
    assert.match(html, /<h1[^>]*>Страница не найдена/);
    assert.doesNotMatch(html, /ПОШЛИ УЧИТЬСЯ/);
});

test('live identity changes footer, contact pages and schema without rebuilding', async () => {
    const { default: defaults } = await import('../shared/platform-identity.json', { with: { type: 'json' } });
    const identity = { ...defaults, city: 'Новый город', supportEmail: 'new@example.ru', supportPhone: '+7 900 111-22-33', shortLegalName: 'ИП Новое имя', legalName: 'ИП Новое имя' };
    for (const pathname of ['/', '/about', '/students', '/teachers', '/pricing', '/requisites', '/support', '/payment-and-refunds']) {
        const html = await renderer.renderSitePage(pathname, identity, pathname === '/pricing' ? tariffPublication() : undefined);
        assert.match(html, /Новый город/);
        assert.match(html, /new@example.ru/);
        assert.match(html, /tel:\+79001112233/);
        assert.match(html, /ИП Новое имя/);
        const schema = renderer.siteStructuredData(pathname, identity)['@graph'][0];
        assert.equal(schema.email, 'new@example.ru');
        assert.equal(schema.address.addressLocality, 'Новый город');
    }
});

test('identity values are escaped in SSR and never become markup', async () => {
    const { default: defaults } = await import('../shared/platform-identity.json', { with: { type: 'json' } });
    const html = await renderer.renderSitePage('/requisites', { ...defaults, city: '<img src=x onerror=alert(1)>', legalName: '</dd><script>alert(1)</script>' });
    assert.doesNotMatch(html, /<script>alert|<img src=x/);
    assert.match(html, /&lt;img/);
});

test('current contact changes do not rewrite accepted legal document text', async () => {
    const { default: defaults } = await import('../shared/platform-identity.json', { with: { type: 'json' } });
    const html = await renderer.renderSitePage('/legal/offer', { ...defaults, legalName: 'Новое юридическое имя', inn: '999999999999' });
    assert.match(html, /615001269006/);
    assert.match(html, /Внуков/);
    assert.match(html, /Публичная оферта/);
});

test('renderer rejects arbitrary filesystem paths', async () => {
    await assert.rejects(async () => renderer.renderSitePage('/../../etc/passwd', {}), /Unknown public page/);
});
