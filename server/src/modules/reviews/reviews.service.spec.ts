import {
    ConflictException,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { ParentChildAccessService } from '../../common/access/parent-child-access.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
    ReviewReplyStatus,
    ReviewStatus,
    TeacherStudentStatus,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { ReviewsService } from './reviews.service';

const student: SessionUser = {
    id: 9,
    role: UserRole.STUDENT,
    email: 'student@example.com',
    fullName: 'Иван Ученик',
    phone: null,
    avatarUrl: null,
    status: UserStatus.ACTIVE,
    emailVerifiedAt: new Date(),
    profileCompleted: true,
};

const teacher: SessionUser = {
    ...student,
    id: 7,
    role: UserRole.TEACHER,
    email: 'teacher@example.com',
    fullName: 'Анна Учитель',
};

const parent: SessionUser = {
    ...student,
    id: 12,
    role: UserRole.PARENT,
    email: 'parent@example.com',
    fullName: 'Мария Родитель',
};

function createService(
    prisma: PrismaService,
    parentAccess: Partial<ParentChildAccessService> = {},
) {
    return new ReviewsService(prisma, {
        listCurrentMinorStudentIds: vi.fn().mockResolvedValue([]),
        hasCurrentMinorAccess: vi.fn().mockResolvedValue(true),
        ...parentAccess,
    } as unknown as ParentChildAccessService);
}

describe('ReviewsService', () => {
    it('opens one review after three completed lessons with a teacher', async () => {
        const prisma = {
            teacherStudent: {
                findMany: vi.fn().mockResolvedValue([{
                    id: 4,
                    teacherId: 7,
                    studentId: 9,
                    subjectId: 11,
                    status: TeacherStudentStatus.ACTIVE,
                    startedAt: new Date('2026-09-01T10:00:00.000Z'),
                    teacher: { fullName: 'Анна Учитель', avatarUrl: null },
                    student: { fullName: 'Иван Ученик' },
                    subject: { name: 'Английский язык' },
                }]),
            },
            lesson: {
                groupBy: vi.fn().mockResolvedValue([{
                    teacherId: 7,
                    studentId: 9,
                    _count: { _all: 3 },
                }]),
            },
            review: { findMany: vi.fn().mockResolvedValue([]) },
        } as unknown as PrismaService;
        const service = createService(prisma);

        const result = await service.list(student, { page: 1, limit: 20 });

        expect(result).toMatchObject({
            relations: [{
                relation_id: 4,
                completed_lessons_count: 3,
                can_review: true,
            }],
        });
    });

    it('rejects a review before three completed lessons', async () => {
        const prisma = {
            teacherStudent: {
                findFirst: vi.fn().mockResolvedValue({
                    id: 4,
                    teacherId: 7,
                    studentId: 9,
                    subjectId: 11,
                }),
            },
            lesson: { count: vi.fn().mockResolvedValue(0) },
            review: { upsert: vi.fn() },
        } as unknown as PrismaService;
        const service = createService(prisma);

        await expect(service.save(student, {
            relation_id: 4,
            rating: 5,
            text: 'Очень полезные и понятные занятия.',
        })).rejects.toBeInstanceOf(ConflictException);
        expect(prisma.review.upsert).not.toHaveBeenCalled();
    });

    it('upserts one pending review for the teacher-student relation', async () => {
        const prisma = {
            teacherStudent: {
                findFirst: vi.fn().mockResolvedValue({
                    id: 4,
                    teacherId: 7,
                    studentId: 9,
                    subjectId: 11,
                }),
            },
            lesson: { count: vi.fn().mockResolvedValue(3) },
            review: { upsert: vi.fn().mockResolvedValue({ id: 15 }) },
        } as unknown as PrismaService;
        const service = createService(prisma);

        const result = await service.save(student, {
            relation_id: 4,
            rating: 5,
            text: 'Очень полезные и понятные занятия.',
        });

        expect(prisma.review.upsert).toHaveBeenCalledWith(expect.objectContaining({
            where: {
                teacherId_studentId: { teacherId: 7, studentId: 9 },
            },
            create: expect.objectContaining({
                status: ReviewStatus.PENDING,
                submittedById: 9,
            }),
            update: expect.objectContaining({ status: ReviewStatus.PENDING }),
        }));
        expect(result).toMatchObject({ success: true, review_id: 15 });
    });

    it('allows a teacher reply only for an already published review', async () => {
        const prisma = {
            review: {
                findFirst: vi.fn().mockResolvedValue(null),
                update: vi.fn(),
            },
        } as unknown as PrismaService;
        const service = createService(prisma);

        await expect(service.reply(teacher, {
            review_id: 15,
            text: 'Спасибо за отзыв!',
        })).rejects.toBeInstanceOf(NotFoundException);
        expect(prisma.review.update).not.toHaveBeenCalled();
    });

    it('sends a valid teacher reply back to moderation', async () => {
        const prisma = {
            review: {
                findFirst: vi.fn().mockResolvedValue({ id: 15 }),
                update: vi.fn().mockResolvedValue(undefined),
            },
        } as unknown as PrismaService;
        const service = createService(prisma);

        await service.reply(teacher, {
            review_id: 15,
            text: 'Спасибо за отзыв!',
        });

        expect(prisma.review.update).toHaveBeenCalledWith({
            where: { id: 15 },
            data: expect.objectContaining({
                pendingTeacherReply: 'Спасибо за отзыв!',
                replyStatus: ReviewReplyStatus.PENDING,
            }),
        });
    });

    it('does not let a parent review for an adult or unavailable child', async () => {
        const prisma = {
            teacherStudent: { findFirst: vi.fn() },
        } as unknown as PrismaService;
        const service = createService(prisma, {
            hasCurrentMinorAccess: vi.fn().mockResolvedValue(false),
        });

        await expect(service.save(parent, {
            relation_id: 4,
            child_id: 9,
            rating: 5,
            text: 'Очень полезные и понятные занятия.',
        })).rejects.toBeInstanceOf(ForbiddenException);
        expect(prisma.teacherStudent.findFirst).not.toHaveBeenCalled();
    });
});
