import {
    ConflictException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { ParentChildAccessService } from '../../common/access/parent-child-access.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
    LessonDisputeReason,
    LessonDisputeStatus,
    LessonStatus,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { NotificationsService } from '../notifications/notifications.service';
import { LessonDisputeFileStorageService } from './lesson-dispute-file-storage.service';
import { LessonDisputesService } from './lesson-disputes.service';

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

function disputeRecord(overrides: Record<string, unknown> = {}) {
    const createdAt = new Date('2026-09-24T10:00:00.000Z');

    return {
        id: 31,
        lessonId: 21,
        openedById: 7,
        teacherId: 7,
        studentId: 9,
        reason: LessonDisputeReason.LESSON_NOT_HELD,
        description: 'Урок не состоялся в назначенное время.',
        status: LessonDisputeStatus.OPEN,
        resolution: null,
        resolutionComment: null,
        handledById: null,
        handledAt: null,
        createdAt,
        updatedAt: createdAt,
        lesson: {
            id: 21,
            title: null,
            lessonDate: new Date('2026-09-24T08:00:00.000Z'),
            status: LessonStatus.COMPLETED,
            subject: { name: 'Математика' },
        },
        openedBy: { id: 7, fullName: 'Анна Учитель', role: UserRole.TEACHER },
        teacher: { id: 7, fullName: 'Анна Учитель' },
        student: { id: 9, fullName: 'Иван Ученик' },
        handledBy: null,
        attachments: [{
            id: 41,
            messageId: null,
            originalName: 'proof.png',
            mimeType: 'image/png',
            fileSize: 128,
            createdAt,
        }],
        messages: [],
        events: [{
            id: 51,
            eventType: 'dispute.opened',
            fromStatus: null,
            toStatus: LessonDisputeStatus.OPEN,
            details: { reason: 'lesson_not_held' },
            createdAt,
            actor: { id: 7, fullName: 'Анна Учитель', role: UserRole.TEACHER },
        }],
        _count: { messages: 0, attachments: 1 },
        ...overrides,
    };
}

function fileStorage(storedFiles: unknown[] = []) {
    return {
        limits: vi.fn().mockReturnValue({
            maxFiles: 5,
            maxFileBytes: 10 * 1024 * 1024,
            maxTotalBytes: 30 * 1024 * 1024,
        }),
        validateUploads: vi.fn((files) => files),
        storeUploads: vi.fn().mockResolvedValue(storedFiles),
        discardStoredFiles: vi.fn().mockResolvedValue(undefined),
    } as unknown as LessonDisputeFileStorageService;
}

function notificationService() {
    return {
        create: vi.fn().mockResolvedValue(undefined),
        createForActiveParents: vi.fn().mockResolvedValue(undefined),
    } as unknown as NotificationsService;
}

function createService(
    prisma: PrismaService,
    files = fileStorage(),
    notifications = notificationService(),
) {
    return {
        files,
        notifications,
        service: new LessonDisputesService(
            prisma,
            {} as ParentChildAccessService,
            notifications,
            files,
        ),
    };
}

describe('LessonDisputesService', () => {
    it('opens a dispute with evidence, history and participant notifications', async () => {
        const upload = {
            originalname: 'proof.png',
            mimetype: 'image/png',
            size: 128,
            buffer: Buffer.from('proof'),
        };
        const stored = {
            storedPath: '7/lesson-disputes/31/claim/proof.png',
            originalName: 'proof.png',
            mimeType: 'image/png',
            fileSize: 128,
        };
        const transaction = {
            lessonDisputeAttachment: {
                createMany: vi.fn().mockResolvedValue({ count: 1 }),
            },
            lessonDisputeEvent: {
                create: vi.fn().mockResolvedValue({ id: 51 }),
            },
        };
        const prisma = {
            lesson: {
                findUnique: vi.fn().mockResolvedValue({
                    id: 21,
                    teacherId: 7,
                    studentId: 9,
                    title: null,
                    lessonDate: new Date('2026-09-24T08:00:00.000Z'),
                    durationMinutes: 60,
                    status: LessonStatus.COMPLETED,
                    subject: { name: 'Математика' },
                    session: null,
                    dispute: null,
                }),
            },
            lessonDispute: {
                create: vi.fn().mockResolvedValue({
                    id: 31,
                    teacherId: 7,
                    studentId: 9,
                }),
                findUnique: vi.fn().mockResolvedValue(disputeRecord()),
                deleteMany: vi.fn(),
            },
            notification: {
                updateMany: vi.fn().mockResolvedValue({ count: 0 }),
            },
            $transaction: vi.fn(async (callback) => callback(transaction)),
        } as unknown as PrismaService;
        const notifications = notificationService();
        const files = fileStorage([stored]);
        const { service } = createService(prisma, files, notifications);

        const result = await service.create(teacher, {
            lesson_id: 21,
            reason: 'lesson_not_held',
            description: 'Урок не состоялся в назначенное время.',
        }, [upload]);

        expect(prisma.lessonDispute.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                lessonId: 21,
                openedById: 7,
                reason: LessonDisputeReason.LESSON_NOT_HELD,
            }),
        });
        expect(transaction.lessonDisputeAttachment.createMany)
            .toHaveBeenCalledOnce();
        expect(transaction.lessonDisputeEvent.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                eventType: 'dispute.opened',
                toStatus: LessonDisputeStatus.OPEN,
            }),
        });
        expect(notifications.create).toHaveBeenCalledOnce();
        expect(notifications.createForActiveParents).toHaveBeenCalledOnce();
        expect(result).toMatchObject({
            success: true,
            message: 'Спор передан на модерацию',
            dispute: { id: 31, status: 'open' },
        });
    });

    it('does not allow a dispute before a scheduled lesson ends', async () => {
        const prisma = {
            lesson: {
                findUnique: vi.fn().mockResolvedValue({
                    id: 21,
                    teacherId: 7,
                    studentId: 9,
                    title: 'Будущий урок',
                    lessonDate: new Date(Date.now() + 60 * 60_000),
                    durationMinutes: 60,
                    status: LessonStatus.SCHEDULED,
                    subject: null,
                    session: null,
                    dispute: null,
                }),
            },
        } as unknown as PrismaService;
        const { service } = createService(prisma);

        await expect(service.create(teacher, {
            lesson_id: 21,
            reason: 'other',
            description: 'Нужно проверить этот будущий урок.',
        }, [])).rejects.toBeInstanceOf(ConflictException);
    });

    it('does not allow participants to add messages to a closed dispute', async () => {
        const prisma = {
            lessonDispute: {
                findUnique: vi.fn().mockResolvedValue({
                    id: 31,
                    teacherId: 7,
                    studentId: 9,
                    status: LessonDisputeStatus.RESOLVED,
                }),
            },
        } as unknown as PrismaService;
        const { service } = createService(prisma);

        await expect(service.addMessage(teacher, 31, {
            message_text: 'Дополнительное пояснение по ситуации.',
        }, [])).rejects.toBeInstanceOf(ConflictException);
    });
});
