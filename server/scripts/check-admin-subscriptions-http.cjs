require('reflect-metadata');
const assert = require('node:assert/strict');
const root = require('node:path').resolve(__dirname, '..') + '/';
const { Test } = require(root + 'node_modules/@nestjs/testing');
const { ValidationPipe, UnauthorizedException } = require(root + 'node_modules/@nestjs/common');
const { AdminSubscriptionsController } = require(root + 'dist/modules/subscriptions/admin-subscriptions.controller');
const { AdminSubscriptionsService } = require(root + 'dist/modules/subscriptions/admin-subscriptions.service');
const { PrismaService } = require(root + 'dist/common/prisma/prisma.service');
const { SessionAuthService } = require(root + 'dist/modules/auth/session-auth.service');
const { SessionAuthGuard } = require(root + 'dist/modules/auth/session-auth.guard');

(async () => {
    let reads = 0;
    const prisma = { subscriptionOrder: {
        count: async () => { reads++; return 0; }, findMany: async () => { reads++; return []; },
        aggregate: async () => { reads++; return { _sum: { amountKopecks: null }, _count: { _all: 0 } }; },
    } };
    const module = await Test.createTestingModule({
        controllers: [AdminSubscriptionsController],
        providers: [AdminSubscriptionsService, SessionAuthGuard,
            { provide: PrismaService, useValue: prisma },
            { provide: SessionAuthService, useValue: { authenticate: async (token) => {
                if (!token) throw new UnauthorizedException();
                return { id: 1, role: token === 'admin-test' ? 'ADMIN' : 'MODERATOR' };
            } } },
        ],
    }).compile();
    const app = module.createNestApplication({ logger: false });
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    await app.listen(0, '127.0.0.1');
    try {
        const url = (await app.getUrl()) + '/api/v1/admin/subscriptions';
        let response = await fetch(url);
        assert.equal(response.status, 401);
        response = await fetch(url, { headers: { 'X-Auth-Token': 'moderator-test' } });
        assert.equal(response.status, 403);
        assert.equal(reads, 0);
        response = await fetch(url + '?limit=999', { headers: { 'X-Auth-Token': 'admin-test' } });
        assert.equal(response.status, 400);
        assert.equal(reads, 0);
        response = await fetch(url + '?paid_from=2026-02-30', { headers: { 'X-Auth-Token': 'admin-test' } });
        assert.equal(response.status, 400);
        response = await fetch(url, { headers: { 'X-Auth-Token': 'admin-test' } });
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('cache-control'), 'no-store');
        assert.equal((await response.json()).success, true);
        response = await fetch(url, { method: 'POST', headers: { 'X-Auth-Token': 'admin-test' } });
        assert.equal(response.status, 404);
        console.log('HTTP OK: session required, moderator denied, query validation, admin GET, no-store, no mutation route');
    } finally { await app.close(); }
})().catch((error) => { console.error(error); process.exit(1); });
