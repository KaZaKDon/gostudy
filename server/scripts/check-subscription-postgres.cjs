/* Run AFTER server build, against the dedicated disposable DB only. No Robokassa network calls. */
require('reflect-metadata');
const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const { resolve } = require('node:path');
const { randomUUID } = require('node:crypto');
const { Client } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { ConfigService } = require('@nestjs/config');
const { PrismaClient } = require('../dist/generated/prisma/client');
const { LiveSubscriptionsService } = require('../dist/modules/subscriptions/live-subscriptions.service');
const { SubscriptionReceiptWorker } = require('../dist/modules/subscriptions/subscription-receipt.worker');
const { signature } = require('../dist/modules/subscriptions/robokassa-signature');

async function main() {
    const connectionString = process.env.GOSTUDY_SUBSCRIPTION_TEST_DATABASE_URL;
    if (!connectionString || new URL(connectionString).pathname !== '/gostudy_subscription_check') {
        throw new Error('Set GOSTUDY_SUBSCRIPTION_TEST_DATABASE_URL for the dedicated gostudy_subscription_check database');
    }
    const schema = `subscription_check_${randomUUID().replaceAll('-', '')}`;
    const db = new Client({ connectionString });
    let prisma; let created = false;
    await db.connect();
    try {
        assert.equal((await db.query('SELECT current_database() AS name')).rows[0].name, 'gostudy_subscription_check');
        await db.query(`CREATE SCHEMA "${schema}"`); created = true;
        await db.query(`SET search_path TO "${schema}"`);
        await db.query('CREATE TABLE users (id INTEGER PRIMARY KEY); INSERT INTO users VALUES (1800000000)');
        await db.query(await readFile(resolve(__dirname, '../prisma/migrations/20261030120000_subscription_test_payments/migration.sql'), 'utf8'));
        await db.query(`INSERT INTO subscription_orders(user_id,amount_kopecks,tariff,extra_blocks,is_test)
            VALUES (1800000000,99000,'{}',0,true)`);
        await db.query(await readFile(resolve(__dirname, '../prisma/migrations/20261031120000_subscription_live_pilot/migration.sql'), 'utf8'));
        assert.equal((await db.query('SELECT is_test FROM subscription_orders WHERE id=1')).rows[0].is_test, true);
        await assert.rejects(db.query(`INSERT INTO subscription_orders(user_id,amount_kopecks,tariff,extra_blocks,is_test)
            VALUES (1800000000,99000,'{}',0,false)`));
        prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }, { schema }) });
        const config = new ConfigService({ ROBOKASSA_MERCHANT_LOGIN: 'fixture',
            ROBOKASSA_LIVE_PASSWORD1: 'fixture-one', ROBOKASSA_LIVE_PASSWORD2: 'fixture-two',
            ROBOKASSA_LIVE_ENABLED: 'true', ROBOKASSA_LIVE_REVIEWED: 'true', ROBOKASSA_FISCAL_WORKER_ENABLED: 'true',
            ROBOKASSA_LIVE_TEACHER_IDS: '1800000000' });
        const tariff = { title: 'Fixture', price_rubles: 990, period_days: 30, students_included: 2,
            extra_block_students: 2, extra_block_price_rubles: 400 };
        const user = { id: 1800000000, role: 'TEACHER', email: 'fixture@example.test', emailVerifiedAt: new Date() };
        const version = 'a'.repeat(64);
        const service = new LiveSubscriptionsService(prisma, config,
            { publicTariffs: async () => ({ data: { id: 1, version: 1, content: { individual: tariff } } }) },
            { snapshot: async () => ({ version, documents: [] }) });
        const checkout = async (blocks) => (await service.checkout(user, blocks, 1, version, { ipAddress: null, userAgent: null })).data.fields;
        const callback = (fields) => ({ InvId: fields.InvId, OutSum: fields.OutSum,
            SignatureValue: signature([fields.OutSum, fields.InvId], 'fixture-two') });
        const first = await checkout(0);
        const repeated = await checkout(0); assert.equal(repeated.InvId, first.InvId);
        await Promise.all(Array.from({ length: 12 }, () => service.result(callback(first))));
        assert.equal(await prisma.subscriptionPeriod.count(), 1);
        assert.equal(await prisma.subscriptionReceiptJob.count(), 1);
        assert.equal(await prisma.subscriptionTrial.count(), 0);
        const a = await checkout(1); const b = await checkout(2);
        await Promise.all([service.result(callback(a)), service.result(callback(b))]);
        const periods = await prisma.subscriptionPeriod.findMany({ orderBy: { startsAt: 'asc' } });
        assert.equal(periods.length, 3);
        for (let i = 1; i < periods.length; i++) assert.equal(periods[i].startsAt.getTime(), periods[i - 1].endsAt.getTime());
        assert.deepEqual(periods.map((p) => p.students).sort((x, y) => x - y), [2, 4, 6]);
        // A failure creating a fiscal job must roll back the paid state AND period.
        const failed = await checkout(3);
        await db.query(`CREATE FUNCTION reject_receipt_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture'; END; $$;
            CREATE TRIGGER reject_receipt_fixture BEFORE INSERT ON subscription_receipt_jobs FOR EACH ROW EXECUTE FUNCTION reject_receipt_fixture()`);
        await assert.rejects(service.result(callback(failed)));
        assert.equal((await prisma.subscriptionOrder.findUnique({ where: { id: Number(failed.InvId) } })).status, 'pending');
        assert.equal(await prisma.subscriptionPeriod.count(), 3);
        await db.query('DROP TRIGGER reject_receipt_fixture ON subscription_receipt_jobs');
        // Concurrent worker processes must claim one job only. Mock provider; no real fiscal requests.
        await prisma.subscriptionReceiptJob.updateMany({ data: { dueAt: new Date(0), nextAttemptAt: new Date(0) } });
        const calls = [];
        const gateway = { send: async (operation, payload) => { calls.push(`${operation}:${payload.id}`); return { ResultCode: '0' }; } };
        const w1 = new SubscriptionReceiptWorker(prisma, config, gateway);
        const w2 = new SubscriptionReceiptWorker(prisma, config, gateway);
        await Promise.all([w1.tick(), w2.tick()]);
        assert.equal(calls.length, 3); assert.equal(new Set(calls).size, 3);
        console.log('PostgreSQL: migration, legacy test rows, callback concurrency, queued periods, rollback and worker claims — OK');
    } finally {
        if (prisma) await prisma.$disconnect();
        if (created) await db.query(`DROP SCHEMA "${schema}" CASCADE`);
        await db.end();
    }
}
main().catch(() => { console.error('PostgreSQL subscription check failed. No gateway requests were sent. Check test DB access and schema migration.'); process.exitCode = 1; });
