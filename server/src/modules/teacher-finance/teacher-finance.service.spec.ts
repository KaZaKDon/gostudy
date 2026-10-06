import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
    LessonDisputeStatus,
    LessonPaymentStatus,
    LessonPayoutStatus,
    LessonStatus,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { TeacherFinancePolicyService } from './teacher-finance-policy.service';
import { TeacherFinanceService } from './teacher-finance.service';

const enabledPolicy = {
    isLessonSettlementsEnabled: () => true,
    publicState: () => ({
        enabled: true,
        mode: 'platform' as const,
        notice: 'Расчёты по занятиям проводятся через GoStudy.',
    }),
} as unknown as TeacherFinancePolicyService;

const disabledPolicy = {
    isLessonSettlementsEnabled: () => false,
    publicState: () => ({
        enabled: false,
        mode: 'direct' as const,
        notice: 'Оплата занятий производится напрямую.',
    }),
} as unknown as TeacherFinancePolicyService;

const teacher: SessionUser = {
    id: 7,
    role: UserRole.TEACHER,
    email: 'teacher@example.com',
    fullName: 'Анна Учитель',
    phone: null,
    avatarUrl: null,
    status: UserStatus.ACTIVE,
    emailVerifiedAt: new Date(),
    profileCompleted: true,
};

function financeRow(input: {
    id: number;
    gross: number;
    dueAt: Date | null;
    payment?: LessonPaymentStatus;
    payout?: LessonPayoutStatus;
    dispute?: LessonDisputeStatus | null;
}) {
    return {
        id: input.id,
        lessonId: 100 + input.id,
        teacherId: 7,
        studentId: 9,
        grossAmount: input.gross,
        commissionPercent: 15,
        commissionAmount: input.gross * 0.15,
        teacherAmount: input.gross * 0.85,
        tariffVersion: 3,
        paymentStatus: input.payment ?? LessonPaymentStatus.AWAITING_PAYMENT,
        payoutStatus: input.payout ?? LessonPayoutStatus.NOT_READY,
        paymentDueAt: input.dueAt,
        paidAt: null,
        payoutPaidAt: null,
        paymentComment: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lesson: {
            id: 100 + input.id,
            title: 'Математика',
            lessonTopic: `Тема ${input.id}`,
            lessonDate: new Date(`2026-09-${20 + input.id}T10:00:00.000Z`),
            durationMinutes: 60,
            status: LessonStatus.COMPLETED,
            student: { fullName: 'Иван Ученик' },
            subject: { name: 'Математика' },
            dispute: input.dispute ? { status: input.dispute } : null,
        },
    };
}

describe('TeacherFinanceService', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-09-27T12:00:00.000Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('stores the agreed lesson price and published commission snapshot', async () => {
        const database = {
            tariffPublication: {
                findFirst: vi.fn().mockResolvedValue({
                    version: 4,
                    content: {
                        business: {
                            commission_percent: 15,
                            minimum_payout_rubles: 500,
                            payout_frequency: 'Раз в неделю',
                        },
                    },
                }),
            },
            lessonSettlement: {
                create: vi.fn().mockResolvedValue({ id: 1 }),
            },
        };
        const service = new TeacherFinanceService(
            {} as PrismaService,
            enabledPolicy,
        );

        await service.createLessonSnapshot(database as never, {
            lessonId: 15,
            teacherId: 7,
            studentId: 9,
            grossAmount: 1_100,
        });

        expect(database.lessonSettlement.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                lessonId: 15,
                grossAmount: 1_100,
                commissionPercent: 15,
                commissionAmount: 165,
                teacherAmount: 935,
                tariffVersion: 4,
            }),
        });
    });

    it('starts the 24 hour payment deadline after lesson completion', async () => {
        const database = {
            lessonSettlement: {
                updateMany: vi.fn().mockResolvedValue({ count: 1 }),
            },
        };
        const service = new TeacherFinanceService(
            {} as PrismaService,
            enabledPolicy,
        );

        await service.markLessonCompleted(
            database as never,
            15,
            new Date('2026-09-27T10:00:00.000Z'),
        );

        expect(database.lessonSettlement.updateMany).toHaveBeenCalledWith({
            where: {
                lessonId: 15,
                paymentStatus: LessonPaymentStatus.NOT_DUE,
            },
            data: {
                paymentStatus: LessonPaymentStatus.AWAITING_PAYMENT,
                payoutStatus: LessonPayoutStatus.NOT_READY,
                paymentDueAt: new Date('2026-09-28T10:00:00.000Z'),
            },
        });
    });

    it('returns real summary amounts and prioritizes disputed lessons', async () => {
        const rows = [
            financeRow({
                id: 1,
                gross: 1_000,
                dueAt: new Date('2026-09-28T12:00:00.000Z'),
            }),
            financeRow({
                id: 2,
                gross: 2_000,
                dueAt: new Date('2026-09-26T12:00:00.000Z'),
                dispute: LessonDisputeStatus.OPEN,
            }),
            financeRow({
                id: 3,
                gross: 1_000,
                dueAt: null,
                payment: LessonPaymentStatus.PAID,
                payout: LessonPayoutStatus.READY,
            }),
        ];
        const prisma = {
            lessonSettlement: {
                findMany: vi.fn().mockResolvedValue(rows),
            },
            tariffPublication: {
                findFirst: vi.fn().mockResolvedValue({
                    version: 4,
                    content: {
                        business: {
                            commission_percent: 15,
                            minimum_payout_rubles: 500,
                            payout_frequency: 'Раз в неделю',
                        },
                    },
                }),
            },
        } as unknown as PrismaService;
        const service = new TeacherFinanceService(prisma, enabledPolicy);

        const result = await service.overview(teacher, {
            period: 'all',
            status: '',
            page: 1,
            limit: 20,
        });

        expect(result).toMatchObject({
            success: true,
            data: {
                summary: {
                    completed_lessons: 3,
                    gross_amount: 4_000,
                    commission_amount: 600,
                    teacher_amount: 3_400,
                    awaiting_payment_amount: 1_000,
                    disputed_amount: 1_700,
                    ready_for_payout_amount: 850,
                },
                items: [
                    { id: 1, status: 'awaiting_payment' },
                    { id: 2, status: 'disputed' },
                    { id: 3, status: 'ready_for_payout' },
                ],
            },
        });
    });

    it('keeps the commission model dormant when settlements are disabled', async () => {
        const database = {
            tariffPublication: {
                findFirst: vi.fn(),
            },
            lessonSettlement: {
                create: vi.fn(),
                updateMany: vi.fn(),
            },
        };
        const service = new TeacherFinanceService(
            {} as PrismaService,
            disabledPolicy,
        );

        await expect(service.createLessonSnapshot(database as never, {
            lessonId: 15,
            teacherId: 7,
            studentId: 9,
            grossAmount: 1_100,
        })).resolves.toBeNull();
        await expect(service.markLessonCompleted(
            database as never,
            15,
            new Date(),
        )).resolves.toEqual({ count: 0 });
        await expect(service.markLessonCancelled(
            database as never,
            15,
        )).resolves.toEqual({ count: 0 });

        expect(database.tariffPublication.findFirst).not.toHaveBeenCalled();
        expect(database.lessonSettlement.create).not.toHaveBeenCalled();
        expect(database.lessonSettlement.updateMany).not.toHaveBeenCalled();
    });

    it('returns subscription terms instead of settlement history while disabled', async () => {
        const prisma = {
            tariffPublication: {
                findFirst: vi.fn().mockResolvedValue({
                    version: 5,
                    content: {
                        individual: {
                            price_rubles: 1_190,
                            period_days: 30,
                            students_included: 2,
                            extra_block_students: 2,
                            extra_block_price_rubles: 400,
                        },
                    },
                }),
            },
            lessonSettlement: {
                findMany: vi.fn(),
            },
        } as unknown as PrismaService;
        const service = new TeacherFinanceService(prisma, disabledPolicy);

        const result = await service.overview(teacher, {
            period: 'all',
            status: '',
            page: 1,
            limit: 20,
        });

        expect(result).toMatchObject({
            success: true,
            data: {
                enabled: false,
                mode: 'direct',
                subscription: {
                    version: 5,
                    price_rubles: 1_190,
                    period_days: 30,
                    students_included: 2,
                    extra_block_students: 2,
                    extra_block_price_rubles: 400,
                },
                items: [],
                payouts: [],
            },
        });
        expect(prisma.lessonSettlement.findMany).not.toHaveBeenCalled();
    });
});
