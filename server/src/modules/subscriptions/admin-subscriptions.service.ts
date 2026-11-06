import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import { UserRole } from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import type { ListAdminSubscriptionsQueryDto } from './dto/list-admin-subscriptions-query.dto';

// Do not expose liveDetails (consents, IP, signatures) or raw fiscalData.
const ORDER_SELECT = {
    id: true, amountKopecks: true, status: true, isTest: true,
    extraBlocks: true, paidAt: true, createdAt: true,
    user: { select: { id: true, fullName: true, email: true } },
    period: { select: { startsAt: true, endsAt: true, students: true } },
    receiptJob: { select: {
        id: true, state: true, dueAt: true, submittedAt: true,
        registeredAt: true, nextAttemptAt: true, attempts: true,
        lastCode: true, holdReason: true,
    } },
} as const;
type OrderRecord = Prisma.SubscriptionOrderGetPayload<{ select: typeof ORDER_SELECT }>;

@Injectable()
export class AdminSubscriptionsService {
    constructor(private readonly prisma: PrismaService) {}

    async list(actor: SessionUser, query: ListAdminSubscriptionsQueryDto) {
        if (actor.role !== UserRole.ADMIN) throw new ForbiddenException('Только администратор');
        const now = new Date();
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const where = this.filters(query, now);
        const paidWhere: Prisma.SubscriptionOrderWhereInput = { AND: [where, { status: 'paid' }] };
        const [total, rows, paid, pendingCount, activeCount] = await Promise.all([
            this.prisma.subscriptionOrder.count({ where }),
            this.prisma.subscriptionOrder.findMany({
                where, select: ORDER_SELECT,
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                skip: (page - 1) * limit, take: limit,
            }),
            this.prisma.subscriptionOrder.aggregate({
                where: paidWhere, _sum: { amountKopecks: true }, _count: { _all: true },
            }),
            this.prisma.subscriptionOrder.count({ where: { AND: [where, { status: 'pending' }] } }),
            this.prisma.subscriptionOrder.count({ where: { AND: [paidWhere, {
                period: { is: { startsAt: { lte: now }, endsAt: { gt: now } } },
            }] } }),
        ]);
        return { success: true, data: {
            items: rows.map((row) => this.serialize(row, now)),
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
            summary: {
                paid_count: paid._count._all, paid_kopecks: paid._sum.amountKopecks ?? 0,
                pending_count: pendingCount, active_periods: activeCount,
            },
            as_of: now.toISOString(),
        } };
    }

    private filters(query: ListAdminSubscriptionsQueryDto, now: Date): Prisma.SubscriptionOrderWhereInput {
        const where: Prisma.SubscriptionOrderWhereInput = {};
        if (query.mode !== 'all') where.isTest = query.mode === 'test';
        if (query.payment_status) where.status = query.payment_status;
        const q = query.q?.trim();
        if (q) {
            const id = /^\d+$/.test(q) ? Number(q) : 0;
            where.OR = [
                { user: { is: { fullName: { contains: q, mode: 'insensitive' } } } },
                { user: { is: { email: { contains: q, mode: 'insensitive' } } } },
                ...(Number.isSafeInteger(id) && id > 0 && id <= 2147483647 ? [{ id }, { userId: id }] : []),
            ];
        }
        if (query.paid_from && query.paid_to && query.paid_from > query.paid_to) {
            throw new BadRequestException('Начало диапазона оплаты позже окончания');
        }
        if (query.paid_from || query.paid_to) {
            // Calendar filters and UI both use Europe/Moscow, including the last day.
            where.paidAt = {
                ...(query.paid_from ? { gte: new Date(`${query.paid_from}T00:00:00+03:00`) } : {}),
                ...(query.paid_to ? { lt: new Date(new Date(`${query.paid_to}T00:00:00+03:00`).getTime() + 86400000) } : {}),
            };
        }
        const periods: Record<string, Prisma.SubscriptionPeriodWhereInput> = {
            active: { startsAt: { lte: now }, endsAt: { gt: now } },
            scheduled: { startsAt: { gt: now } }, expired: { endsAt: { lte: now } },
        };
        if (query.period_status) where.period = query.period_status === 'missing'
            ? { is: null } : { is: periods[query.period_status] };
        if (query.receipt_state) where.receiptJob = query.receipt_state === 'missing'
            ? { is: null } : { is: { state: query.receipt_state } };
        return where;
    }

    private serialize(row: OrderRecord, now: Date) {
        const p = row.period;
        const job = row.receiptJob;
        return {
            id: row.id, teacher: { id: row.user.id, full_name: row.user.fullName, email: row.user.email },
            amount_kopecks: row.amountKopecks, payment_status: row.status, is_test: row.isTest,
            extra_blocks: row.extraBlocks, created_at: row.createdAt, paid_at: row.paidAt,
            period: p ? {
                starts_at: p.startsAt, ends_at: p.endsAt, students: p.students,
                state: p.startsAt > now ? 'scheduled' : p.endsAt <= now ? 'expired' : 'active',
            } : null,
            // paid is payment confirmation, never confirmation of the first fiscal receipt.
            first_receipt_state: row.isTest ? 'not_applicable' : row.status === 'paid' ? 'provider_check' : 'awaiting_payment',
            final_receipt: job ? {
                id: job.id, state: job.state, due_at: job.dueAt,
                submitted_at: job.submittedAt, registered_at: job.registeredAt,
                next_attempt_at: job.nextAttemptAt, attempts: job.attempts,
                last_code: job.lastCode, hold_reason: job.holdReason,
                overdue: job.state !== 'registered' && job.dueAt <= now,
            } : null,
        };
    }
}
