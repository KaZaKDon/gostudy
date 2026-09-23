import {
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { ParentChildAccessService } from '../../common/access/parent-child-access.service';
import type { RequestMetadata } from '../../common/http/request-metadata';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
    ReviewReplyStatus,
    ReviewStatus,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { NotificationsService } from '../notifications/notifications.service';
import { ReviewsService } from '../reviews/reviews.service';
import { AdminReviewsService } from './admin-reviews.service';

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

function reviewRecord(overrides: Record<string, unknown> = {}) {
    return {
        id: 15,
        studentId: 9,
        teacherId: 7,
        teacherStudentId: 4,
        subjectId: 11,
        rating: 5,
        text: 'Очень полезные и понятные занятия.',
        status: ReviewStatus.PENDING,
        rejectionReason: null,
        moderatedById: null,
        moderatedAt: null,
        publishedRating: null,
        publishedText: null,
        publishedAt: null,
        teacherReply: null,
        pendingTeacherReply: null,
        replyStatus: ReviewReplyStatus.NONE,
        replyRejectionReason: null,
        replyModeratedById: null,
        replyModeratedAt: null,
        repliedAt: null,
        createdAt: new Date('2026-09-02T10:00:00.000Z'),
        updatedAt: new Date('2026-09-02T10:00:00.000Z'),
        student: { fullName: 'Иван Ученик', email: 'student@example.com' },
        teacher: { fullName: 'Анна Учитель', email: 'teacher@example.com' },
        subject: { name: 'Английский язык' },
        ...overrides,
    };
}

describe('AdminReviewsService', () => {
    it('returns reviews with pagination for moderation', async () => {
        const prisma = {
            review: {
                count: vi.fn().mockResolvedValue(1),
                findMany: vi.fn().mockResolvedValue([reviewRecord()]),
            },
        } as unknown as PrismaService;
        const service = new AdminReviewsService(
            prisma,
            {} as NotificationsService,
            {} as ReviewsService,
        );

        const result = await service.list(admin, {
            page: 1,
            limit: 20,
            status: 'pending',
            target: '',
        });

        expect(result).toMatchObject({
            success: true,
            data: {
                items: [{ id: 15, status: 'pending' }],
                pagination: { total: 1, pages: 1 },
            },
        });
    });

    it('requires a moderator comment when rejecting content', async () => {
        const service = new AdminReviewsService(
            {} as PrismaService,
            {} as NotificationsService,
            {} as ReviewsService,
        );

        await expect(service.moderate(admin, 15, {
            target: 'review',
            decision: 'rejected',
        }, metadata)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('publishes an approved review, notifies both sides and updates rating', async () => {
        const current = reviewRecord();
        const transaction = {
            review: {
                findUnique: vi.fn().mockResolvedValue(current),
                update: vi.fn().mockResolvedValue({
                    ...current,
                    status: ReviewStatus.APPROVED,
                    publishedRating: 5,
                    publishedText: current.text,
                    publishedAt: new Date(),
                }),
                aggregate: vi.fn().mockResolvedValue({
                    _avg: { publishedRating: 4.5 },
                    _count: { _all: 2 },
                }),
            },
            teacherProfile: { update: vi.fn().mockResolvedValue(undefined) },
            notification: { upsert: vi.fn().mockResolvedValue(undefined) },
            adminAuditLog: { create: vi.fn().mockResolvedValue(undefined) },
        };
        const prisma = {
            $transaction: vi.fn(
                async (callback: (client: typeof transaction) => unknown) =>
                    callback(transaction),
            ),
        } as unknown as PrismaService;
        const notifications = new NotificationsService(prisma);
        const reviews = new ReviewsService(
            prisma,
            {} as ParentChildAccessService,
        );
        const service = new AdminReviewsService(prisma, notifications, reviews);

        const result = await service.moderate(admin, 15, {
            target: 'review',
            decision: 'approved',
        }, metadata);

        expect(transaction.review.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                status: ReviewStatus.APPROVED,
                publishedRating: 5,
            }),
        }));
        expect(transaction.notification.upsert).toHaveBeenCalledTimes(2);
        expect(transaction.teacherProfile.update).toHaveBeenCalledWith({
            where: { userId: 7 },
            data: { rating: 4.5, reviewsCount: 2 },
        });
        expect(transaction.adminAuditLog.create).toHaveBeenCalledOnce();
        expect(result).toMatchObject({ success: true, message: 'Публикация одобрена' });
    });

    it('does not moderate the same review revision twice', async () => {
        const transaction = {
            review: {
                findUnique: vi.fn().mockResolvedValue(reviewRecord({
                    status: ReviewStatus.APPROVED,
                })),
            },
        };
        const prisma = {
            $transaction: vi.fn(
                async (callback: (client: typeof transaction) => unknown) =>
                    callback(transaction),
            ),
        } as unknown as PrismaService;
        const service = new AdminReviewsService(
            prisma,
            {} as NotificationsService,
            {} as ReviewsService,
        );

        await expect(service.moderate(admin, 15, {
            target: 'review',
            decision: 'approved',
        }, metadata)).rejects.toBeInstanceOf(ConflictException);
    });
});
