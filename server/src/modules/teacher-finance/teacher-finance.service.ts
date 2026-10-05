import {
    ForbiddenException,
    Injectable,
} from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import {
    LessonPaymentStatus,
    LessonPayoutStatus,
    TariffPublicationStatus,
    UserRole,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import type { ListTeacherFinanceQueryDto } from './dto/list-teacher-finance-query.dto';
import {
    calculateLessonSettlement,
    resolveTeacherFinanceStatus,
    roundMoney,
    type TeacherFinanceVisibleStatus,
} from './teacher-finance-calculation';

type DatabaseClient = PrismaService | Prisma.TransactionClient;

type SettlementSnapshotInput = {
    lessonId: number;
    teacherId: number;
    studentId: number;
    grossAmount: number;
};

type TariffTerms = {
    version: number | null;
    commissionPercent: number;
    minimumPayoutRubles: number;
    payoutFrequency: string;
};

type FinanceRow = Awaited<ReturnType<TeacherFinanceService['loadRows']>>[number];

const PAYMENT_DEADLINE_HOURS = 24;

@Injectable()
export class TeacherFinanceService {
    constructor(private readonly prisma: PrismaService) {}

    async createLessonSnapshot(
        database: DatabaseClient,
        input: SettlementSnapshotInput,
    ) {
        const terms = await this.currentTariffTerms(database);
        const amounts = calculateLessonSettlement(
            input.grossAmount,
            terms.commissionPercent,
        );

        return database.lessonSettlement.create({
            data: {
                lessonId: input.lessonId,
                teacherId: input.teacherId,
                studentId: input.studentId,
                grossAmount: amounts.grossAmount,
                commissionPercent: amounts.commissionPercent,
                commissionAmount: amounts.commissionAmount,
                teacherAmount: amounts.teacherAmount,
                tariffVersion: terms.version,
            },
        });
    }

    async markLessonCompleted(
        database: DatabaseClient,
        lessonId: number,
        completedAt: Date,
    ) {
        const paymentDueAt = new Date(
            completedAt.getTime() + PAYMENT_DEADLINE_HOURS * 60 * 60 * 1_000,
        );

        return database.lessonSettlement.updateMany({
            where: {
                lessonId,
                paymentStatus: LessonPaymentStatus.NOT_DUE,
            },
            data: {
                paymentStatus: LessonPaymentStatus.AWAITING_PAYMENT,
                payoutStatus: LessonPayoutStatus.NOT_READY,
                paymentDueAt,
            },
        });
    }

    async markLessonCancelled(database: DatabaseClient, lessonId: number) {
        return database.lessonSettlement.updateMany({
            where: {
                lessonId,
                paymentStatus: LessonPaymentStatus.NOT_DUE,
            },
            data: {
                paymentStatus: LessonPaymentStatus.WAIVED,
                payoutStatus: LessonPayoutStatus.NOT_READY,
                paymentDueAt: null,
            },
        });
    }

    async overview(
        user: SessionUser,
        query: ListTeacherFinanceQueryDto,
    ): Promise<Record<string, unknown>> {
        this.requireTeacher(user);
        const now = new Date();
        const [rows, terms] = await Promise.all([
            this.loadRows(user.id, query.period, now),
            this.currentTariffTerms(this.prisma),
        ]);
        const serializedRows = rows.map((row) => this.serializeRow(row, now));
        const filteredRows = query.status
            ? serializedRows.filter((row) => row.status === query.status)
            : serializedRows;
        const offset = (query.page - 1) * query.limit;
        const pageRows = filteredRows.slice(offset, offset + query.limit);

        return {
            success: true,
            data: {
                summary: this.buildSummary(rows, now),
                tariff: {
                    version: terms.version,
                    commission_percent: terms.commissionPercent,
                    minimum_payout_rubles: terms.minimumPayoutRubles,
                    payout_frequency: terms.payoutFrequency,
                    payment_deadline_hours: PAYMENT_DEADLINE_HOURS,
                },
                items: pageRows,
                pagination: {
                    page: query.page,
                    limit: query.limit,
                    total: filteredRows.length,
                    pages: Math.max(1, Math.ceil(filteredRows.length / query.limit)),
                },
                payouts: [],
                payouts_notice: 'История переводов появится после подключения платёжного оператора.',
                generated_at: now.toISOString(),
            },
        };
    }

    private async loadRows(
        teacherId: number,
        period: ListTeacherFinanceQueryDto['period'],
        now: Date,
    ) {
        const range = this.periodRange(period, now);

        return this.prisma.lessonSettlement.findMany({
            where: {
                teacherId,
                paymentStatus: { not: LessonPaymentStatus.NOT_DUE },
                lesson: range
                    ? { lessonDate: range }
                    : undefined,
            },
            orderBy: [
                { lesson: { lessonDate: 'desc' } },
                { id: 'desc' },
            ],
            include: {
                lesson: {
                    select: {
                        id: true,
                        title: true,
                        lessonTopic: true,
                        lessonDate: true,
                        durationMinutes: true,
                        status: true,
                        student: { select: { fullName: true } },
                        subject: { select: { name: true } },
                        dispute: { select: { status: true } },
                    },
                },
            },
        });
    }

    private serializeRow(row: FinanceRow, now: Date) {
        const status = resolveTeacherFinanceStatus({
            paymentStatus: row.paymentStatus,
            payoutStatus: row.payoutStatus,
            paymentDueAt: row.paymentDueAt,
            disputeStatus: row.lesson.dispute?.status,
        }, now);

        return {
            id: row.id,
            lesson_id: row.lessonId,
            lesson_date: row.lesson.lessonDate.toISOString(),
            title: row.lesson.lessonTopic
                || row.lesson.title
                || row.lesson.subject?.name
                || 'Занятие',
            subject_name: row.lesson.subject?.name || row.lesson.title || 'Предмет',
            student_name: row.lesson.student.fullName || 'Ученик',
            duration_minutes: row.lesson.durationMinutes,
            lesson_status: row.lesson.status.toLowerCase(),
            gross_amount: Number(row.grossAmount),
            commission_percent: Number(row.commissionPercent),
            commission_amount: Number(row.commissionAmount),
            teacher_amount: Number(row.teacherAmount),
            tariff_version: row.tariffVersion,
            payment_status: row.paymentStatus.toLowerCase(),
            payout_status: row.payoutStatus.toLowerCase(),
            status,
            payment_due_at: row.paymentDueAt?.toISOString() ?? null,
            paid_at: row.paidAt?.toISOString() ?? null,
            payout_paid_at: row.payoutPaidAt?.toISOString() ?? null,
            payment_comment: row.paymentComment,
            dispute_status: row.lesson.dispute?.status.toLowerCase() ?? null,
        };
    }

    private buildSummary(rows: FinanceRow[], now: Date) {
        const totals = {
            completedLessons: 0,
            grossAmount: 0,
            commissionAmount: 0,
            teacherAmount: 0,
            awaitingPaymentAmount: 0,
            overdueAmount: 0,
            payLaterAmount: 0,
            disputedAmount: 0,
            readyForPayoutAmount: 0,
            paidOutAmount: 0,
        };

        for (const row of rows) {
            const status = resolveTeacherFinanceStatus({
                paymentStatus: row.paymentStatus,
                payoutStatus: row.payoutStatus,
                paymentDueAt: row.paymentDueAt,
                disputeStatus: row.lesson.dispute?.status,
            }, now);
            const grossAmount = Number(row.grossAmount);
            const teacherAmount = Number(row.teacherAmount);
            const isFinancial = row.paymentStatus !== LessonPaymentStatus.NOT_DUE
                && row.paymentStatus !== LessonPaymentStatus.WAIVED
                && row.paymentStatus !== LessonPaymentStatus.REFUNDED;

            if (isFinancial) {
                totals.completedLessons += 1;
                totals.grossAmount += grossAmount;
                totals.commissionAmount += Number(row.commissionAmount);
                totals.teacherAmount += teacherAmount;
            }

            this.addStatusAmount(totals, status, grossAmount, teacherAmount);
        }

        return {
            completed_lessons: totals.completedLessons,
            gross_amount: roundMoney(totals.grossAmount),
            commission_amount: roundMoney(totals.commissionAmount),
            teacher_amount: roundMoney(totals.teacherAmount),
            awaiting_payment_amount: roundMoney(totals.awaitingPaymentAmount),
            overdue_amount: roundMoney(totals.overdueAmount),
            pay_later_amount: roundMoney(totals.payLaterAmount),
            disputed_amount: roundMoney(totals.disputedAmount),
            ready_for_payout_amount: roundMoney(totals.readyForPayoutAmount),
            paid_out_amount: roundMoney(totals.paidOutAmount),
        };
    }

    private addStatusAmount(
        totals: {
            awaitingPaymentAmount: number;
            overdueAmount: number;
            payLaterAmount: number;
            disputedAmount: number;
            readyForPayoutAmount: number;
            paidOutAmount: number;
        },
        status: TeacherFinanceVisibleStatus,
        grossAmount: number,
        teacherAmount: number,
    ) {
        if (status === 'awaiting_payment') totals.awaitingPaymentAmount += grossAmount;
        if (status === 'overdue') totals.overdueAmount += grossAmount;
        if (status === 'pay_later') totals.payLaterAmount += grossAmount;
        if (status === 'disputed') totals.disputedAmount += teacherAmount;
        if (status === 'ready_for_payout') totals.readyForPayoutAmount += teacherAmount;
        if (status === 'payout_paid') totals.paidOutAmount += teacherAmount;
    }

    private periodRange(
        period: ListTeacherFinanceQueryDto['period'],
        now: Date,
    ): { gte?: Date; lt?: Date } | null {
        if (period === 'all') return null;
        if (period === '90_days') {
            return { gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1_000) };
        }

        const currentMonth = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            1,
        ));

        if (period === 'previous_month') {
            return {
                gte: new Date(Date.UTC(
                    currentMonth.getUTCFullYear(),
                    currentMonth.getUTCMonth() - 1,
                    1,
                )),
                lt: currentMonth,
            };
        }

        return {
            gte: currentMonth,
            lt: new Date(Date.UTC(
                currentMonth.getUTCFullYear(),
                currentMonth.getUTCMonth() + 1,
                1,
            )),
        };
    }

    private async currentTariffTerms(
        database: DatabaseClient,
    ): Promise<TariffTerms> {
        const publication = await database.tariffPublication.findFirst({
            where: { status: TariffPublicationStatus.PUBLISHED },
            orderBy: [
                { effectiveFrom: 'desc' },
                { version: 'desc' },
            ],
            select: { version: true, content: true },
        });
        const content = this.record(publication?.content);
        const business = this.record(content.business);

        return {
            version: publication?.version ?? null,
            commissionPercent: this.number(business.commission_percent, 0),
            minimumPayoutRubles: this.number(business.minimum_payout_rubles, 0),
            payoutFrequency: typeof business.payout_frequency === 'string'
                ? business.payout_frequency
                : 'Раз в неделю',
        };
    }

    private record(value: unknown): Record<string, unknown> {
        return value && typeof value === 'object' && !Array.isArray(value)
            ? value as Record<string, unknown>
            : {};
    }

    private number(value: unknown, fallback: number): number {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    private requireTeacher(user: SessionUser) {
        if (user.role !== UserRole.TEACHER) {
            throw new ForbiddenException(
                'Финансовая сводка доступна только преподавателю',
            );
        }
    }
}
