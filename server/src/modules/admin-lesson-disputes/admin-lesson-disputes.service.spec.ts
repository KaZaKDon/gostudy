import {
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import type { RequestMetadata } from '../../common/http/request-metadata';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
    LessonDisputeResolution,
    LessonDisputeStatus,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { LessonDisputesService } from '../lesson-disputes/lesson-disputes.service';
import { AdminLessonDisputesService } from './admin-lesson-disputes.service';

const admin: SessionUser = {
    id: 1,
    role: UserRole.ADMIN,
    email: 'admin@example.com',
    fullName: 'Администратор',
    phone: null,
    avatarUrl: null,
    status: UserStatus.ACTIVE,
    emailVerifiedAt: new Date(),
    profileCompleted: true,
};

const metadata: RequestMetadata = {
    ipAddress: '127.0.0.1',
    userAgent: 'vitest',
};

function dispute(
    status: LessonDisputeStatus = LessonDisputeStatus.OPEN,
) {
    return {
        id: 31,
        lessonId: 21,
        openedById: 7,
        teacherId: 7,
        studentId: 9,
        status,
    };
}

function notifications() {
    return {
        notifyStatusChange: vi.fn().mockResolvedValue(undefined),
    } as unknown as LessonDisputesService;
}

function transactionClient() {
    return {
        lessonDispute: {
            update: vi.fn().mockResolvedValue(undefined),
        },
        lessonDisputeEvent: {
            create: vi.fn().mockResolvedValue(undefined),
        },
        adminAuditLog: {
            create: vi.fn().mockResolvedValue(undefined),
        },
    };
}

describe('AdminLessonDisputesService', () => {
    it('moves an open dispute to review and writes audit history', async () => {
        const transaction = transactionClient();
        const prisma = {
            lessonDispute: {
                findUnique: vi.fn().mockResolvedValue(dispute()),
            },
            $transaction: vi.fn(async (callback) => callback(transaction)),
        } as unknown as PrismaService;
        const disputeNotifications = notifications();
        const service = new AdminLessonDisputesService(
            prisma,
            disputeNotifications,
        );

        const result = await service.moderate(admin, 31, {
            action: 'review',
        }, metadata);

        expect(transaction.lessonDispute.update).toHaveBeenCalledWith({
            where: { id: 31 },
            data: {
                status: LessonDisputeStatus.UNDER_REVIEW,
                handledById: 1,
            },
        });
        expect(transaction.lessonDisputeEvent.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                eventType: 'moderation.review_started',
                fromStatus: LessonDisputeStatus.OPEN,
                toStatus: LessonDisputeStatus.UNDER_REVIEW,
            }),
        });
        expect(transaction.adminAuditLog.create).toHaveBeenCalledOnce();
        expect(disputeNotifications.notifyStatusChange).toHaveBeenCalledOnce();
        expect(result).toEqual({
            success: true,
            message: 'Спор принят в работу',
        });
    });

    it('maps no violation to a rejected dispute and stores the decision', async () => {
        const transaction = transactionClient();
        const prisma = {
            lessonDispute: {
                findUnique: vi.fn().mockResolvedValue(
                    dispute(LessonDisputeStatus.UNDER_REVIEW),
                ),
            },
            $transaction: vi.fn(async (callback) => callback(transaction)),
        } as unknown as PrismaService;
        const disputeNotifications = notifications();
        const service = new AdminLessonDisputesService(
            prisma,
            disputeNotifications,
        );

        const result = await service.moderate(admin, 31, {
            action: 'decide',
            decision: 'no_violation',
            comment: 'Нарушение со стороны участников не подтверждено.',
        }, metadata);

        expect(transaction.lessonDispute.update).toHaveBeenCalledWith({
            where: { id: 31 },
            data: expect.objectContaining({
                status: LessonDisputeStatus.REJECTED,
                resolution: LessonDisputeResolution.NO_VIOLATION,
                handledById: 1,
                resolutionComment:
                    'Нарушение со стороны участников не подтверждено.',
            }),
        });
        expect(transaction.adminAuditLog.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                action: 'lesson_dispute.decided',
                newValue: expect.objectContaining({
                    status: LessonDisputeStatus.REJECTED,
                    decision: 'no_violation',
                }),
            }),
        });
        expect(disputeNotifications.notifyStatusChange).toHaveBeenCalledOnce();
        expect(result).toEqual({
            success: true,
            message: 'Решение по спору сохранено',
        });
    });

    it('requires a detailed moderator comment for a decision', async () => {
        const prisma = {
            lessonDispute: {
                findUnique: vi.fn().mockResolvedValue(dispute()),
            },
        } as unknown as PrismaService;
        const service = new AdminLessonDisputesService(
            prisma,
            notifications(),
        );

        await expect(service.moderate(admin, 31, {
            action: 'decide',
            decision: 'applicant_supported',
            comment: 'Кратко',
        }, metadata)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('does not moderate a dispute after it is closed', async () => {
        const prisma = {
            lessonDispute: {
                findUnique: vi.fn().mockResolvedValue(
                    dispute(LessonDisputeStatus.RESOLVED),
                ),
            },
        } as unknown as PrismaService;
        const service = new AdminLessonDisputesService(
            prisma,
            notifications(),
        );

        await expect(service.moderate(admin, 31, {
            action: 'review',
        }, metadata)).rejects.toBeInstanceOf(ConflictException);
    });
});
