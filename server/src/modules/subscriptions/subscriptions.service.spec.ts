import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { SubscriptionsService } from './subscriptions.service';
import { signature } from './robokassa-signature';

const tariff = { publication_id: 1, version: 3, title: 'Учитель', price_rubles: 990,
    period_days: 30, students_included: 2, extra_block_students: 2, extra_block_price_rubles: 400 };
const user = { id: 12, role: 'TEACHER', email: 'teacher@example.test', emailVerifiedAt: new Date() };
const config = { ROBOKASSA_TEST_ENABLED: 'true', ROBOKASSA_MERCHANT_LOGIN: 'gostudy',
    ROBOKASSA_TEST_PASSWORD1: 'first', ROBOKASSA_TEST_PASSWORD2: 'second', ROBOKASSA_TEST_TEACHER_IDS: '12' };
const callback = (OutSum = '990.000000') => ({ OutSum, InvId: '1', SignatureValue: signature([OutSum, '1'], 'second') });

// Mutable store exercises actual service control flow, keeping gateway and DB boundaries explicit.
describe('Subscription service', () => {
    let service: SubscriptionsService;
    let order: any;
    let trial: any;
    let tx: any;
    beforeEach(() => {
        order = { id: 1, userId: 12, isTest: true, status: 'pending', amountKopecks: 99000, tariff, extraBlocks: 0 };
        trial = null;
        tx = {
            $queryRaw: vi.fn().mockResolvedValue([]),
            subscriptionOrder: {
                findUnique: vi.fn(async () => order),
                findFirst: vi.fn(async () => null),
                create: vi.fn(async ({ data }) => ({ id: 1, ...data })),
                update: vi.fn(async ({ data }) => { order = { ...order, ...data }; return order; }),
            },
            subscriptionTrial: {
                findUnique: vi.fn(async () => trial),
                upsert: vi.fn(async ({ create, update }) => { trial = trial ? { ...trial, ...update } : create; return trial; }),
            },
        };
        service = new SubscriptionsService({ $transaction: async (fn: any) => fn(tx) } as any,
            new ConfigService(config), { publicTariffs: async () => ({ data: {
                id: 1, version: 3, content: { individual: tariff },
            } }) } as any);
    });
    it('acknowledges the same callback twice but grants only one period', async () => {
        expect(await service.result(callback())).toBe('OK1');
        const expiry = trial.expiresAt;
        expect(await service.result(callback())).toBe('OK1');
        expect(trial.expiresAt).toEqual(expiry);
        expect(tx.subscriptionTrial.upsert).toHaveBeenCalledTimes(1);
        expect(tx.subscriptionOrder.update).toHaveBeenCalledTimes(1);
    });
    it('rejects signed wrong amounts before updating a subscription', async () => {
        await expect(service.result(callback('1.00'))).rejects.toThrow('Параметры');
        expect(tx.subscriptionTrial.upsert).not.toHaveBeenCalled();
    });
    it('rejects a bad signature without accessing the transaction', async () => {
        await expect(service.result({ ...callback(), SignatureValue: '0'.repeat(32) })).rejects.toThrow('подпись');
        expect(tx.$queryRaw).not.toHaveBeenCalled();
    });
    it('rejects unknown orders and non-test records', async () => {
        order = null;
        await expect(service.result(callback())).rejects.toThrow('не найден');
        order = { isTest: false };
        await expect(service.result(callback())).rejects.toThrow('Параметры');
    });
    it('quotes server price and always issues IsTest=1 without recurring', async () => {
        const response = await service.checkout(user as any, 1, 3);
        expect(response.data.fields.OutSum).toBe('1390.00');
        expect(response.data.fields.IsTest).toBe('1');
        expect(response.data.fields).not.toHaveProperty('Recurring');
        expect(tx.subscriptionOrder.create.mock.calls[0][0].data.tariff.version).toBe(3);
    });
    it('requires the current tariff version and verified teacher identity', async () => {
        await expect(service.checkout(user as any, 0, 1)).rejects.toThrow('Тариф изменился');
        await expect(service.checkout({ ...user, role: 'STUDENT' } as any, 0, 3)).rejects.toThrow('преподавателю');
        await expect(service.checkout({ ...user, emailVerifiedAt: null } as any, 0, 3)).rejects.toThrow('преподавателю');
        expect(tx.subscriptionOrder.create).not.toHaveBeenCalled();
    });
    it('rejects teachers outside the explicitly configured test accounts', async () => {
        await expect(service.checkout({ ...user, id: 13 } as any, 0, 3)).rejects.toThrow('не включён');
    });
    it('is disabled with default configuration', async () => {
        const disabled = new SubscriptionsService({} as any, new ConfigService({}), {} as any);
        await expect(disabled.checkout(user as any, 0, 3)).rejects.toThrow('не настроена');
    });
    it('reuses a recent pending attempt on repeated checkout', async () => {
        tx.subscriptionOrder.findFirst.mockResolvedValue(order);
        await service.checkout(user as any, 0, 3);
        expect(tx.subscriptionOrder.create).not.toHaveBeenCalled();
    });
});
