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
    LessonChangeStatus,
    LessonChangeType,
    LessonSessionStatus,
    LessonStatus,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { NotificationsService } from '../notifications/notifications.service';
import { LessonChangesService } from './lesson-changes.service';

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

const lesson = {
    id: 15,
    teacherId: 7,
    studentId: 9,
    subjectId: 11,
    title: 'Английский язык',
    lessonDate: new Date('2026-09-05T15:00:00.000Z'),
    durationMinutes: 60,
    status: LessonStatus.SCHEDULED,
    lessonTopic: 'Разговорная практика',
    lessonNotes: null,
    subject: { name: 'Английский язык' },
    session: { status: LessonSessionStatus.WAITING },
};

const notifications = {
    create: vi.fn().mockResolvedValue(undefined),
    markDedupeRead: vi.fn().mockResolvedValue(undefined),
} as unknown as NotificationsService;

function createPrisma(changeRequest: Record<string, unknown> | null = null) {
    const transaction = {
        lesson: {
            findFirst: vi.fn().mockResolvedValue(lesson),
            findMany: vi.fn().mockResolvedValue([]),
            update: vi.fn().mockResolvedValue(undefined),
        },
        lessonChangeRequest: {
            findFirst: vi.fn().mockResolvedValue(changeRequest),
            create: vi.fn().mockResolvedValue({
                id: 40,
                lessonId: 15,
            }),
            update: vi.fn().mockResolvedValue(undefined),
        },
        teacherProfile: {
            findUnique: vi.fn().mockResolvedValue({
                timezone: 'Europe/Moscow',
            }),
        },
        studentProfile: {
            findUnique: vi.fn().mockResolvedValue({
                timezone: 'Europe/Moscow',
            }),
        },
    };
    const prisma = {
        $transaction: vi.fn(
            async (callback: (client: typeof transaction) => unknown) =>
                callback(transaction),
        ),
    } as unknown as PrismaService;

    return { prisma, transaction };
}

describe('LessonChangesService', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-09-01T12:00:00.000Z'));
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('creates a cancellation request for the other participant', async () => {
        const { prisma, transaction } = createPrisma();
        const service = new LessonChangesService(prisma, notifications);
        const result = await service.requestChange(teacher, {
            lesson_id: 15,
            request_type: 'cancel',
            proposed_lesson_date: null,
            comment: 'Не смогу провести занятие',
        });

        expect(transaction.lessonChangeRequest.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                lessonId: 15,
                requestedBy: 7,
                requestType: LessonChangeType.CANCEL,
            }),
        });
        expect(notifications.create).toHaveBeenCalledWith(
            transaction,
            expect.objectContaining({
                userId: 9,
                type: 'lesson_cancel_requested',
                targetSection: 'schedule',
                targetEntityId: 40,
            }),
        );
        expect(result).toMatchObject({
            success: true,
            message: 'Предложение отмены отправлено',
        });
    });

    it('cancels the lesson after the other participant approves', async () => {
        const request = {
            id: 40,
            lessonId: 15,
            requestedBy: 9,
            requestedRole: UserRole.STUDENT,
            requestType: LessonChangeType.CANCEL,
            status: LessonChangeStatus.PENDING,
            proposedLessonDate: null,
            lesson,
        };
        const { prisma, transaction } = createPrisma(request);
        const service = new LessonChangesService(prisma, notifications);
        const result = await service.respondChange(teacher, {
            request_id: 40,
            decision: 'approve',
            comment: '',
        });

        expect(transaction.lesson.update).toHaveBeenCalledWith({
            where: { id: 15 },
            data: { status: LessonStatus.CANCELLED },
        });
        expect(transaction.lessonChangeRequest.update).toHaveBeenCalledWith({
            where: { id: 40 },
            data: expect.objectContaining({
                status: LessonChangeStatus.APPROVED,
                respondedBy: 7,
            }),
        });
        expect(notifications.markDedupeRead).toHaveBeenCalledWith(
            transaction,
            7,
            'lesson-change-request:40',
        );
        expect(notifications.create).toHaveBeenCalledWith(
            transaction,
            expect.objectContaining({
                userId: 9,
                type: 'lesson_change_approved',
            }),
        );
        expect(result).toMatchObject({
            request_status: 'approved',
        });
    });

    it('withdraws a pending cancellation without changing the lesson', async () => {
        const request = {
            id: 40,
            lessonId: 15,
            requestedBy: 7,
            requestedRole: UserRole.TEACHER,
            requestType: LessonChangeType.CANCEL,
            status: LessonChangeStatus.PENDING,
            lesson,
        };
        const { prisma, transaction } = createPrisma(request);
        const service = new LessonChangesService(prisma, notifications);
        const result = await service.withdrawChange(teacher, {
            request_id: 40,
        });

        expect(transaction.lesson.update).not.toHaveBeenCalled();
        expect(transaction.lessonChangeRequest.update).toHaveBeenCalledWith({
            where: { id: 40 },
            data: { status: LessonChangeStatus.WITHDRAWN },
        });
        expect(notifications.create).toHaveBeenCalledWith(
            transaction,
            expect.objectContaining({
                userId: 9,
                type: 'lesson_change_withdrawn',
            }),
        );
        expect(result).toMatchObject({
            message: 'Предложение отозвано',
        });
    });

    it('requires a reason when the proposal is rejected', async () => {
        const service = new LessonChangesService(
            {} as PrismaService,
            notifications,
        );

        await expect(service.respondChange(teacher, {
            request_id: 40,
            decision: 'reject',
            comment: '',
        })).rejects.toThrow('Объясните причину отказа');
    });
});
