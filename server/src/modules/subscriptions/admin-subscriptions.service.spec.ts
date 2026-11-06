import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UserRole, UserStatus } from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { AdminSubscriptionsService } from './admin-subscriptions.service';
import { ListAdminSubscriptionsQueryDto } from './dto/list-admin-subscriptions-query.dto';

const admin: SessionUser = {
    id: 1, role: UserRole.ADMIN, status: UserStatus.ACTIVE, email: 'admin@example.test',
    fullName: 'Администратор', phone: null, avatarUrl: null, emailVerifiedAt: new Date(), profileCompleted: true,
};
const now = new Date('2026-11-02T15:00:00Z');
const row = {
    id: 3, amountKopecks: 99000, status: 'paid', isTest: false, extraBlocks: 0,
    createdAt: now, paidAt: now,
    user: { id: 3, fullName: 'Преподаватель', email: 'teacher@example.test' },
    period: { startsAt: now, endsAt: new Date('2026-12-02T15:00:00Z'), students: 2 },
    receiptJob: {
        id: 1, state: 'scheduled', dueAt: new Date('2026-12-02T15:00:00Z'),
        submittedAt: null, registeredAt: null, nextAttemptAt: new Date('2026-12-02T15:00:00Z'),
        attempts: 0, lastCode: null, holdReason: null,
    },
    liveDetails: { secret: 'must-not-leak' }, fiscalData: { private: 'must-not-leak' },
};
function setup(rows: unknown[] = [row]) {
    const order = {
        count: vi.fn().mockResolvedValue(1), findMany: vi.fn().mockResolvedValue(rows),
        aggregate: vi.fn().mockResolvedValue({ _sum: { amountKopecks: 99000 }, _count: { _all: 1 } }),
    };
    const service = new AdminSubscriptionsService({ subscriptionOrder: order } as unknown as PrismaService);
    return { order, service };
}
const query = (values = {}) => plainToInstance(ListAdminSubscriptionsQueryDto, values);

describe('AdminSubscriptionsService', () => {
    beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); });
    afterEach(() => { vi.useRealTimers(); });

    it.each([UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT, UserRole.MODERATOR])('denies %s before accessing financial data', async (role) => {
        const { service, order } = setup();
        await expect(service.list({ ...admin, role }, query())).rejects.toThrow('Только администратор');
        expect(order.findMany).not.toHaveBeenCalled();
        expect(order.count).not.toHaveBeenCalled();
    });

    it('shows real order with a paid period without pretending the first receipt is registered', async () => {
        const { service, order } = setup();
        const result = await service.list(admin, query());
        expect(order.findMany.mock.calls[0][0]).toMatchObject({ where: { isTest: false }, skip: 0, take: 20 });
        expect(result.data.items[0]).toMatchObject({
            id: 3, amount_kopecks: 99000, payment_status: 'paid',
            teacher: { id: 3 }, period: { students: 2, state: 'active' },
            first_receipt_state: 'provider_check', final_receipt: { state: 'scheduled', overdue: false },
        });
        expect(result.data.summary).toMatchObject({ paid_kopecks: 99000 });
        expect(JSON.stringify(result)).not.toContain('must-not-leak');
        const selected = order.findMany.mock.calls[0][0].select;
        expect(selected).not.toHaveProperty('liveDetails');
        expect(selected.receiptJob.select).not.toHaveProperty('fiscalData');
    });

    it('preserves a pending order without making up a period or a fiscal receipt', async () => {
        const { service } = setup([{ ...row, status: 'pending', paidAt: null, period: null, receiptJob: null }]);
        expect((await service.list(admin, query())).data.items[0]).toMatchObject({
            payment_status: 'pending', paid_at: null, period: null, final_receipt: null, first_receipt_state: 'awaiting_payment',
        });
    });

    it('marks queued and expired periods accurately at the boundary', async () => {
        const future = { ...row, period: { ...row.period, startsAt: new Date(now.getTime() + 1) } };
        const expired = { ...row, id: 4, period: { ...row.period, endsAt: now }, receiptJob: { ...row.receiptJob, dueAt: now } };
        const { service } = setup([future, expired]);
        const items = (await service.list(admin, query())).data.items;
        expect(items[0].period?.state).toBe('scheduled');
        expect(items[1].period?.state).toBe('expired');
        expect(items[1].final_receipt?.overdue).toBe(true);
    });

    it('does not flag an already registered receipt as overdue', async () => {
        const { service } = setup([{ ...row, receiptJob: { ...row.receiptJob, dueAt: now, state: 'registered', registeredAt: now } }]);
        expect((await service.list(admin, query())).data.items[0].final_receipt?.overdue).toBe(false);
    });

    it('filters by teacher or order ID and handles an arbitrarily large numeric search without database overflow', async () => {
        const { service, order } = setup();
        await service.list(admin, query({ q: '3', page: 2, limit: 10 }));
        expect(order.findMany.mock.calls[0][0]).toMatchObject({ skip: 10, take: 10, where: { OR: expect.arrayContaining([{ id: 3 }, { userId: 3 }]) } });
        await service.list(admin, query({ q: '999999999999999999999999' }));
        expect(order.findMany.mock.calls[1][0].where.OR).toHaveLength(2);
    });

    it('applies inclusive Moscow dates, real-payment filter, receipt state and active period together', async () => {
        const { service, order } = setup();
        await service.list(admin, query({ paid_from: '2026-11-02', paid_to: '2026-11-02', payment_status: 'paid', period_status: 'active', receipt_state: 'review' }));
        expect(order.findMany.mock.calls[0][0].where).toMatchObject({
            isTest: false, status: 'paid', paidAt: { gte: new Date('2026-11-01T21:00:00Z'), lt: new Date('2026-11-02T21:00:00Z') },
            period: { is: { startsAt: { lte: now }, endsAt: { gt: now } } }, receiptJob: { is: { state: 'review' } },
        });
        expect(order.aggregate.mock.calls[0][0].where.AND[0]).toEqual(order.findMany.mock.calls[0][0].where);
    });

    it('supports test and all modes explicitly, missing periods and missing receipt jobs', async () => {
        const { service, order } = setup([{ ...row, isTest: true }]);
        const result = await service.list(admin, query({ mode: 'test', period_status: 'missing', receipt_state: 'missing' }));
        expect(order.findMany.mock.calls[0][0].where).toEqual({ isTest: true, period: { is: null }, receiptJob: { is: null } });
        expect(result.data.items[0].first_receipt_state).toBe('not_applicable');
        await service.list(admin, query({ mode: 'all' }));
        expect(order.findMany.mock.calls[1][0].where).not.toHaveProperty('isTest');
    });

    it('returns zeros and no pages for an empty result', async () => {
        const { service, order } = setup([]);
        order.count.mockResolvedValue(0);
        order.aggregate.mockResolvedValue({ _sum: { amountKopecks: null }, _count: { _all: 0 } } as never);
        const result = await service.list(admin, query());
        expect(result.data.pagination).toMatchObject({ total: 0, pages: 0 });
        expect(result.data.summary).toEqual({ paid_count: 0, paid_kopecks: 0, pending_count: 0, active_periods: 0 });
    });

    it('rejects a reversed paid-date range before reading data', async () => {
        const { service, order } = setup();
        await expect(service.list(admin, query({ paid_from: '2026-12-02', paid_to: '2026-11-02' }))).rejects.toThrow('Начало диапазона');
        expect(order.findMany).not.toHaveBeenCalled();
    });
});

describe('ListAdminSubscriptionsQueryDto', () => {
    it.each([
        { limit: '101' }, { page: '0' }, { mode: 'prod' }, { receipt_state: 'done' },
        { paid_from: '2026-02-30' }, { paid_to: '2026-11-02T00:00:00Z' },
    ])('rejects invalid filters %j', async (values) => {
        expect((await validate(query(values))).length).toBeGreaterThan(0);
    });
    it('transforms pagination and validates the documented filter combination', async () => {
        const input = query({ page: '2', limit: '20', paid_from: '2026-11-02', mode: 'live', q: '3' });
        expect(await validate(input)).toHaveLength(0);
        expect(input.page).toBe(2);
    });
});
