import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { LiveSubscriptionsService } from './live-subscriptions.service';
import { signature } from './robokassa-signature';
import { prepaymentReceipt } from './subscription-receipt';
import { RobokassaCallbackService } from './robokassa-callback.service';
import { liveCheckoutEnabled, liveCredentials } from './robokassa-live-settings';

const tariff = { publication_id: 2, version: 4, title: 'Тариф', price_rubles: 990, period_days: 30,
    students_included: 2, extra_block_students: 2, extra_block_price_rubles: 400 };
const user = { id: 3, role: 'TEACHER', email: 'test@example.test', emailVerifiedAt: new Date() };
const terms = { version: 'a'.repeat(64), documents: [{ path: '/legal/offer', version: '1.3', sha256: 'hash', text: 'Accepted text' }] };
const settings = { ROBOKASSA_LIVE_ENABLED: 'true', ROBOKASSA_LIVE_REVIEWED: 'true', ROBOKASSA_FISCAL_WORKER_ENABLED: 'true',
    ROBOKASSA_LIVE_TEACHER_IDS: '3', ROBOKASSA_MERCHANT_LOGIN: 'gostudy',
    ROBOKASSA_LIVE_PASSWORD1: 'live-one', ROBOKASSA_LIVE_PASSWORD2: 'live-two',
    ROBOKASSA_TEST_PASSWORD1: 'test-one', ROBOKASSA_TEST_PASSWORD2: 'test-two' };
const callback = (pass = 'live-two', sum = '990.000000', id = '1') => ({ InvId: id, OutSum: sum, SignatureValue: signature([sum, id], pass) });

describe('Live subscriptions', () => {
    let service: LiveSubscriptionsService;
    let tx: any;
    let order: any;
    let periods: any[];
    let config: ConfigService;
    beforeEach(() => {
        periods = [];
        const receipt = prepaymentReceipt(tariff, 0);
        order = { id: 1, userId: 3, status: 'pending', isTest: false, amountKopecks: 99000, tariff, extraBlocks: 0,
            liveDetails: { schema: 1, merchant: 'gostudy', email: user.email, receipt,
                receiptEncoded: encodeURIComponent(JSON.stringify(receipt)), consent: terms } };
        tx = { $queryRaw: vi.fn().mockResolvedValue([]),
            subscriptionOrder: { findUnique: vi.fn(async () => order), findFirst: vi.fn(async () => null),
                create: vi.fn(async ({ data }) => ({ id: 1, ...data })), update: vi.fn(async ({ data }) => { Object.assign(order, data); return order; }) },
            subscriptionPeriod: { findFirst: vi.fn(async () => periods.at(-1)), create: vi.fn(async ({ data }) => { periods.push(data); return data; }) },
            subscriptionReceiptJob: { create: vi.fn().mockResolvedValue({}) },
        };
        config = new ConfigService({ ...settings });
        service = new LiveSubscriptionsService({ $transaction: async (fn: any) => fn(tx) } as any, config,
            { publicTariffs: async () => ({ data: { id: 2, version: 4, content: { individual: tariff } } }) } as any,
            { snapshot: async () => terms } as any);
    });
    const checkout = (s: LiveSubscriptionsService, blocks = 0, version = 4, termsVersion = terms.version) =>
        s.checkout(user as any, blocks, version, termsVersion, { ipAddress: '127.0.0.1', userAgent: 'test' });
    it('uses server price, signed encoded Receipt and no recurring token', async () => {
        const { data: { fields } } = await checkout(service, 2);
        expect(fields.OutSum).toBe('1790.00');
        expect(fields.IsTest).toBe('0');
        expect(fields).not.toHaveProperty('Recurring');
        const receipt = JSON.parse(decodeURIComponent(fields.Receipt));
        expect(receipt.items[0]).toMatchObject({ sum: 1790, quantity: 1, payment_method: 'full_prepayment', payment_object: 'service', tax: 'none' });
        expect(receipt.items[0].name).toContain('6 учеников');
        expect(fields.SignatureValue).toBe(signature(['gostudy', '1790.00', '1', fields.Receipt], 'live-one'));
        expect(tx.subscriptionOrder.create.mock.calls[0][0].data.liveDetails.consent.documents[0].text).toBe('Accepted text');
    });
    it('rejects stale tariff/terms before persisting an invoice', async () => {
        await expect(checkout(service, 0, 3)).rejects.toThrow('изменились');
        await expect(checkout(service, 0, 4, 'b'.repeat(64))).rejects.toThrow('изменились');
        expect(tx.subscriptionOrder.create).not.toHaveBeenCalled();
    });
    it('requires verified teacher, named allowlist, enabled worker and reviewed settings', async () => {
        await expect(service.checkout({ ...user, role: 'STUDENT' } as any, 0, 4, terms.version, {} as any)).rejects.toThrow('преподавателя');
        await expect(service.checkout({ ...user, emailVerifiedAt: null } as any, 0, 4, terms.version, {} as any)).rejects.toThrow('преподавателя');
        config.set('ROBOKASSA_LIVE_TEACHER_IDS', '*');
        await expect(checkout(service)).rejects.toThrow('недоступна');
        config.set('ROBOKASSA_LIVE_TEACHER_IDS', '3'); config.set('ROBOKASSA_FISCAL_WORKER_ENABLED', 'false');
        await expect(checkout(service)).rejects.toThrow('недоступна');
        config.set('ROBOKASSA_FISCAL_WORKER_ENABLED', 'true'); config.set('ROBOKASSA_LIVE_REVIEWED', 'false');
        await expect(checkout(service)).rejects.toThrow('недоступна');
    });
    it('reuses the same pending order without changing consent snapshots', async () => {
        tx.subscriptionOrder.findFirst.mockResolvedValue(order);
        await checkout(service);
        expect(tx.subscriptionOrder.create).not.toHaveBeenCalled();
    });
    it('rejects wrong amount, test signature and test order without granting access', async () => {
        await expect(service.result(callback('live-two', '1.00'))).rejects.toThrow('не совпадают');
        await expect(service.result(callback('test-two'))).rejects.toThrow('подпись');
        order.isTest = true;
        await expect(service.result(callback())).rejects.toThrow('не совпадают');
        expect(periods).toHaveLength(0); expect(tx.subscriptionReceiptJob.create).not.toHaveBeenCalled();
    });
    it('acknowledges repeat callbacks once, even after checkout has been disabled', async () => {
        config.set('ROBOKASSA_LIVE_ENABLED', 'false');
        expect(await service.result(callback())).toBe('OK1');
        expect(await service.result(callback())).toBe('OK1');
        expect(periods).toHaveLength(1);
        expect(periods[0].endsAt - periods[0].startsAt).toBe(30 * 86400000);
        expect(tx.subscriptionReceiptJob.create).toHaveBeenCalledTimes(1);
        expect(tx.subscriptionReceiptJob.create.mock.calls[0][0].data.dueAt).toEqual(periods[0].endsAt);
    });
    it('queues a different paid invoice after the existing period and preserves its seats', async () => {
        await service.result(callback());
        const previous = { ...periods[0] };
        order = { ...order, id: 2, status: 'pending', extraBlocks: 1, amountKopecks: 139000,
            liveDetails: { ...order.liveDetails, receipt: prepaymentReceipt(tariff, 1) } };
        await service.result(callback('live-two', '1390.00', '2'));
        expect(periods[0]).toEqual(previous); expect(periods[1].startsAt).toEqual(previous.endsAt);
        expect(periods[1].students).toBe(4);
    });
    it('detects corrupted saved fiscal snapshot', async () => {
        order.liveDetails.receipt.items[0].tax = 'vat20';
        await expect(service.result(callback())).rejects.toThrow('Снимок');
        expect(periods).toHaveLength(0);
    });
    it('defaults off and rejects shared test/live secrets', () => {
        expect(liveCheckoutEnabled(new ConfigService({}), 3)).toBe(false);
        expect(() => liveCredentials(new ConfigService({ ...settings, ROBOKASSA_LIVE_PASSWORD2: 'test-two' }))).toThrow('отдельные');
    });
    it('dispatches based on signatures, never on IsTest from the browser', async () => {
        const test = { result: vi.fn(async () => 'TEST') }; const live = { result: vi.fn(async () => 'LIVE') };
        const dispatcher = new RobokassaCallbackService(config, test as any, live as any);
        expect(await dispatcher.result({ ...callback(), IsTest: '1' })).toBe('LIVE');
        expect(await dispatcher.result({ ...callback('test-two'), IsTest: '0' })).toBe('TEST');
        expect(() => dispatcher.result(callback('wrong'))).toThrow('подпись');
        config.set('ROBOKASSA_LIVE_PASSWORD2', 'test-two');
        expect(() => dispatcher.result(callback('test-two'))).toThrow('неоднозначная');
    });
});
