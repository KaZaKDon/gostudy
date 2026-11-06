import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { SubscriptionReceiptWorker } from './subscription-receipt.worker';
import { prepaymentReceipt } from './subscription-receipt';

const tariff = { publication_id: 1, version: 1, title: 'Тариф', price_rubles: 990, period_days: 30,
    students_included: 2, extra_block_students: 2, extra_block_price_rubles: 400 };
describe('Durable final receipt workflow', () => {
    let job: any; let gateway: any; let worker: SubscriptionReceiptWorker; let db: any;
    beforeEach(() => {
        job = { id: 1, orderId: 1, state: 'scheduled', dueAt: new Date(0), nextAttemptAt: new Date(0), leaseUntil: null,
            order: { isTest: false, status: 'paid', amountKopecks: 99000,
                liveDetails: { schema: 1, merchant: 'gostudy', email: 'test@example.test', siteUrl: 'https://gostudyonline.ru/', receipt: prepaymentReceipt(tariff, 0) } } };
        db = { $queryRaw: vi.fn(), subscriptionReceiptJob: {
            findFirst: vi.fn(async () => ['scheduled', 'submitted'].includes(job.state) && job.nextAttemptAt <= new Date()
                && (!job.leaseUntil || job.leaseUntil < new Date()) ? { ...job } : null),
            update: vi.fn(async ({ data }) => { Object.assign(job, data); }),
            updateMany: vi.fn(async ({ where, data }) => {
                if (where.leaseToken !== job.leaseToken || (where.state && where.state !== job.state)) return { count: 0 };
                Object.assign(job, data); return { count: 1 };
            }),
        } };
        db.$transaction = async (fn: any) => fn(db);
        gateway = { send: vi.fn(async () => ({ ResultCode: '0' })) };
        worker = new SubscriptionReceiptWorker(db, new ConfigService({ ROBOKASSA_FISCAL_WORKER_ENABLED: 'true',
            ROBOKASSA_MERCHANT_LOGIN: 'gostudy', ROBOKASSA_LIVE_PASSWORD1: 'live-one', ROBOKASSA_LIVE_PASSWORD2: 'live-two' }), gateway);
    });
    it('persists submission before Attach and confirms only through Status Done', async () => {
        gateway.send.mockImplementationOnce(async () => { expect(job.state).toBe('submitted'); expect(job.submittedAt).toBeInstanceOf(Date); return { ResultCode: '0' }; });
        await worker.tick(); expect(job.state).toBe('submitted');
        job.nextAttemptAt = new Date(0);
        gateway.send.mockResolvedValue({ Code: '0', Statuses: [{ Code: 'Done', FnNumber: '123', FiscalDocumentNumber: '5' }] });
        await worker.tick(); expect(job.state).toBe('registered');
        expect(gateway.send.mock.calls.map((c: any) => c[0])).toEqual(['Attach', 'Status']);
        expect(job.fiscalData[0].fn).toBe('123');
    });
    it('after a lost Attach response polls status and never repeats Attach', async () => {
        gateway.send.mockRejectedValueOnce(new Error('timeout'));
        await worker.tick(); expect(job.state).toBe('submitted');
        job.nextAttemptAt = new Date(0); gateway.send.mockResolvedValue({ Code: '0', Statuses: [{ Code: 'Wait' }] });
        await worker.tick(); expect(job.state).toBe('submitted');
        expect(gateway.send.mock.calls.map((c: any) => c[0])).toEqual(['Attach', 'Status']);
    });
    it('recovers an expired process lease using status, without duplicate Attach', async () => {
        job.state = 'submitted'; job.submittedAt = new Date(); job.leaseUntil = new Date(0);
        gateway.send.mockResolvedValue({ Code: '0', Statuses: [{ Code: 'Done' }] });
        await worker.tick(); expect(gateway.send.mock.calls[0][0]).toBe('Status'); expect(job.state).toBe('registered');
    });
    it('puts unknown status after 24 hours into manual review', async () => {
        job.state = 'submitted'; job.submittedAt = new Date(Date.now() - 25 * 3600000);
        gateway.send.mockResolvedValue({ Code: '0', Statuses: [{ Code: 'None' }] });
        await worker.tick(); expect(job.state).toBe('review');
    });
    it('skips held jobs and active leases', async () => {
        job.state = 'held'; await worker.tick(); expect(gateway.send).not.toHaveBeenCalled();
        job.state = 'scheduled'; job.leaseUntil = new Date(Date.now() + 60000); await worker.tick(); expect(gateway.send).not.toHaveBeenCalled();
    });
    it('never fiscalizes a test order', async () => {
        job.order.isTest = true; await worker.tick(); expect(job.state).toBe('review'); expect(gateway.send).not.toHaveBeenCalled();
    });
});
