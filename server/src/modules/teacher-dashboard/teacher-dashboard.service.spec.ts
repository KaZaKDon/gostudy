import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
    LessonStatus,
    TeacherVerificationStatus,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { TeacherDashboardService } from './teacher-dashboard.service';

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

describe('TeacherDashboardService', () => {
    it('returns real teacher counters', async () => {
        const prisma = {
            teacherProfile: {
                findUnique: vi.fn().mockResolvedValue({ timezone: 'Europe/Moscow' }),
            },
            teacherStudent: { count: vi.fn().mockResolvedValue(3) },
            lesson: { count: vi.fn().mockResolvedValue(2) },
            homeworkSubmission: { count: vi.fn().mockResolvedValue(4) },
        } as unknown as PrismaService;
        const service = new TeacherDashboardService(prisma);

        await expect(service.stats(teacher)).resolves.toMatchObject({
            stats: [
                { label: 'учеников', value: 3 },
                { label: 'уроков сегодня', value: 2 },
                { label: 'работ на проверке', value: 4 },
            ],
        });
    });

    it('rejects a non-teacher account', async () => {
        const service = new TeacherDashboardService({} as PrismaService);

        await expect(service.stats({ ...teacher, role: UserRole.STUDENT }))
            .rejects.toBeInstanceOf(ForbiddenException);
    });

    it('returns the current public rank, subject ranks and badge progress', async () => {
        const now = new Date();
        const prisma = {
            teacherProfile: {
                findUnique: vi.fn().mockResolvedValue({
                    userId: 7,
                    rating: 5,
                    reviewsCount: 3,
                    experienceYears: 12,
                    introVideoUrl: null,
                    accessibilityEnabled: false,
                    isVisible: true,
                    verificationStatus: TeacherVerificationStatus.VERIFIED,
                    user: {
                        status: UserStatus.ACTIVE,
                        phone: '+70000000000',
                        emailVerifiedAt: now,
                        lastLoginAt: now,
                        createdAt: now,
                        teacherEducation: [{ id: 1 }],
                        teacherDocuments: [{ id: 5 }],
                        teacherSubjects: [{
                            subjectId: 4,
                            subject: { id: 4, name: 'Математика' },
                        }],
                    },
                }),
                findMany: vi.fn().mockResolvedValue([
                    {
                        userId: 7,
                        rating: 5,
                        reviewsCount: 3,
                        user: { teacherSubjects: [{ subjectId: 4 }] },
                    },
                    {
                        userId: 8,
                        rating: 4.5,
                        reviewsCount: 4,
                        user: { teacherSubjects: [{ subjectId: 4 }] },
                    },
                ]),
            },
            lesson: {
                groupBy: vi.fn()
                    .mockResolvedValueOnce([
                        { teacherId: 7, _count: { _all: 4 } },
                        { teacherId: 8, _count: { _all: 20 } },
                    ])
                    .mockResolvedValueOnce([
                        { teacherId: 7, subjectId: 4, _count: { _all: 4 } },
                        { teacherId: 8, subjectId: 4, _count: { _all: 20 } },
                    ]),
                findMany: vi.fn().mockResolvedValue([
                    {
                        status: LessonStatus.COMPLETED,
                        changeRequests: [],
                    },
                ]),
            },
            learningMaterial: { findMany: vi.fn().mockResolvedValue([]) },
            review: {
                findMany: vi.fn().mockResolvedValue([
                    { publishedRating: 5 },
                    { publishedRating: 5 },
                    { publishedRating: 5 },
                ]),
            },
        } as unknown as PrismaService;
        const service = new TeacherDashboardService(prisma);

        await expect(service.rating(teacher)).resolves.toMatchObject({
            rating: {
                ranking_available: true,
                overall_rank: 1,
                teachers_count: 2,
                average_rating: 5,
                reviews_count: 3,
                completed_lessons_count: 4,
                subject_ranks: [{
                    subject_id: 4,
                    subject_name: 'Математика',
                    rank: 1,
                    teachers_count: 2,
                }],
                badges: expect.arrayContaining([
                    'verified_identity',
                    'verified_education',
                    'work_experience_10_years',
                ]),
                next_achievements: expect.arrayContaining([
                    expect.objectContaining({
                        key: 'platform_lessons',
                        current: 4,
                        target: 10,
                        remaining: 6,
                    }),
                    expect.objectContaining({
                        key: 'excellent_rating_streak',
                        current: 3,
                        target: 10,
                        remaining: 7,
                    }),
                ]),
            },
        });
    });

    it('explains why a hidden teacher has no public place', async () => {
        const now = new Date();
        const prisma = {
            teacherProfile: {
                findUnique: vi.fn().mockResolvedValue({
                    userId: 7,
                    rating: 0,
                    reviewsCount: 0,
                    experienceYears: 0,
                    introVideoUrl: null,
                    accessibilityEnabled: false,
                    isVisible: false,
                    verificationStatus: TeacherVerificationStatus.VERIFIED,
                    user: {
                        status: UserStatus.ACTIVE,
                        phone: null,
                        emailVerifiedAt: now,
                        lastLoginAt: now,
                        createdAt: now,
                        teacherEducation: [],
                        teacherSubjects: [],
                    },
                }),
                findMany: vi.fn().mockResolvedValue([]),
            },
            lesson: {
                groupBy: vi.fn().mockResolvedValue([]),
                findMany: vi.fn().mockResolvedValue([]),
            },
            learningMaterial: { findMany: vi.fn().mockResolvedValue([]) },
            review: { findMany: vi.fn().mockResolvedValue([]) },
        } as unknown as PrismaService;
        const service = new TeacherDashboardService(prisma);

        await expect(service.rating(teacher)).resolves.toMatchObject({
            rating: {
                ranking_available: false,
                ranking_unavailable_reason:
                    'Опубликуйте анкету, чтобы участвовать в рейтинге.',
                overall_rank: null,
            },
        });
    });

    it('waits for three published reviews before showing a place', async () => {
        const now = new Date();
        const prisma = {
            teacherProfile: {
                findUnique: vi.fn().mockResolvedValue({
                    userId: 7,
                    rating: 5,
                    reviewsCount: 2,
                    experienceYears: 3,
                    introVideoUrl: null,
                    accessibilityEnabled: false,
                    isVisible: true,
                    verificationStatus: TeacherVerificationStatus.VERIFIED,
                    user: {
                        status: UserStatus.ACTIVE,
                        phone: null,
                        emailVerifiedAt: now,
                        lastLoginAt: now,
                        createdAt: now,
                        teacherEducation: [],
                        teacherSubjects: [],
                    },
                }),
                findMany: vi.fn().mockResolvedValue([{
                    userId: 7,
                    rating: 5,
                    reviewsCount: 2,
                    user: { teacherSubjects: [] },
                }]),
            },
            lesson: {
                groupBy: vi.fn().mockResolvedValue([]),
                findMany: vi.fn().mockResolvedValue([]),
            },
            learningMaterial: { findMany: vi.fn().mockResolvedValue([]) },
            review: { findMany: vi.fn().mockResolvedValue([]) },
        } as unknown as PrismaService;
        const service = new TeacherDashboardService(prisma);

        await expect(service.rating(teacher)).resolves.toMatchObject({
            rating: {
                ranking_available: false,
                ranking_unavailable_reason:
                    'Место в рейтинге появится после 3 опубликованных отзывов',
                overall_rank: null,
            },
        });
    });
});
