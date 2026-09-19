import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
    TeacherVerificationStatus,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { NotificationsService } from '../notifications/notifications.service';
import { TeachersService } from './teachers.service';

const student: SessionUser = {
    id: 501,
    role: UserRole.STUDENT,
    email: 'student@example.com',
    fullName: 'Тестовый ученик',
    phone: null,
    avatarUrl: null,
    status: UserStatus.ACTIVE,
    emailVerifiedAt: new Date('2026-09-01T00:00:00.000Z'),
    profileCompleted: true,
};

const parent: SessionUser = {
    ...student,
    id: 502,
    role: UserRole.PARENT,
    email: 'parent@example.com',
    fullName: 'Тестовый родитель',
};

const teacherUser: SessionUser = {
    ...student,
    id: 503,
    role: UserRole.TEACHER,
    email: 'teacher@example.com',
    fullName: 'Тестовый преподаватель',
};

const notifications = {
    create: vi.fn().mockResolvedValue(undefined),
} as unknown as NotificationsService;

type TeacherFixtureOptions = {
    subjectId?: number;
    subjectName?: string;
    rating?: number;
    reviewsCount?: number;
    completedLessons?: number;
    accessibilitySlots?: number;
    accessibilityApplications?: number;
    headline?: string;
};

type TeacherSearchResult = {
    success: boolean;
    teachers: Array<{
        teacher_id: number;
        rank: number | null;
        accessibility_enabled: boolean;
    }>;
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
};

function searchResult(result: Record<string, unknown>): TeacherSearchResult {
    return result as unknown as TeacherSearchResult;
}

function teacherFixture(
    id: number,
    options: TeacherFixtureOptions = {},
) {
    const subjectId = options.subjectId ?? 11;
    const subjectName = options.subjectName ?? 'Математика';
    const accessibilitySlots = options.accessibilitySlots ?? 0;
    const accessibilityApplications = options.accessibilityApplications ?? 0;

    return {
        profile: {
            userId: id,
            firstName: `Имя${id}`,
            lastName: `Фамилия${id}`,
            slug: `teacher-${id}`,
            city: id % 2 ? 'Москва' : 'Ростов-на-Дону',
            headline: options.headline ?? `${subjectName} для школьников`,
            experienceYears: 5 + id,
            introVideoUrl: null,
            rating: options.rating ?? 4.5,
            reviewsCount: options.reviewsCount ?? 3,
            price45: 700 + id,
            price60: 900 + id,
            price90: null,
            verificationStatus: TeacherVerificationStatus.VERIFIED,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            user: {
                fullName: `Имя${id} Фамилия${id}`,
                avatarUrl: null,
                phone: null,
                emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
                lastLoginAt: new Date('2026-09-10T00:00:00.000Z'),
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                teacherEducation: [],
                teacherSubjects: [{
                    subjectId,
                    subject: {
                        id: subjectId,
                        name: subjectName,
                    },
                }],
                accessibilityOffers: accessibilitySlots > 0 ? [{
                    slots: accessibilitySlots,
                    subjects: [{ subjectId }],
                    applications: Array.from(
                        { length: accessibilityApplications },
                        (_, index) => ({ id: index + 1 }),
                    ),
                }] : [],
            },
        },
        completedLessons: options.completedLessons ?? 0,
    };
}

function createService(fixtures: ReturnType<typeof teacherFixture>[]) {
    const prisma = {
        teacherProfile: {
            findMany: vi.fn().mockResolvedValue(
                fixtures.map((fixture) => fixture.profile),
            ),
        },
        lesson: {
            groupBy: vi.fn().mockResolvedValue(
                fixtures.map((fixture) => ({
                    teacherId: fixture.profile.userId,
                    _count: { _all: fixture.completedLessons },
                })),
            ),
            findMany: vi.fn().mockResolvedValue([]),
        },
        subject: {
            findMany: vi.fn().mockResolvedValue([
                { id: 11, name: 'Математика' },
                { id: 12, name: 'Английский язык' },
            ]),
        },
        learningMaterial: { findMany: vi.fn().mockResolvedValue([]) },
        review: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;

    return {
        prisma,
        service: new TeachersService(prisma, notifications),
    };
}

describe('TeachersService search audit with 18 teachers', () => {
    it('returns 12 teachers on the first page and the remaining six on the second', async () => {
        const fixtures = Array.from(
            { length: 18 },
            (_, index) => teacherFixture(index + 1),
        );
        const { service } = createService(fixtures);

        const firstPage = searchResult(
            await service.findTeachers(student, { page: 1 }),
        );
        const secondPage = searchResult(
            await service.findTeachers(student, { page: 2 }),
        );

        expect(firstPage.pagination).toEqual({
            page: 1,
            limit: 12,
            total: 18,
            pages: 2,
        });
        expect(secondPage.pagination).toEqual({
            page: 2,
            limit: 12,
            total: 18,
            pages: 2,
        });
        expect(firstPage.teachers).toHaveLength(12);
        expect(secondPage.teachers).toHaveLength(6);
    });

    it('searches by teacher name, headline and subject', async () => {
        const fixtures = [
            teacherFixture(1),
            teacherFixture(2, {
                subjectId: 12,
                subjectName: 'Английский язык',
                headline: 'Разговорный английский и подготовка к экзаменам',
            }),
            teacherFixture(3),
        ];
        const { service } = createService(fixtures);

        const byName = searchResult(
            await service.findTeachers(student, {
                search: 'Фамилия2',
                page: 1,
            }),
        );
        const byHeadline = searchResult(
            await service.findTeachers(student, {
                search: 'разговорный',
                page: 1,
            }),
        );
        const bySubject = searchResult(
            await service.findTeachers(student, {
                search: 'английский',
                page: 1,
            }),
        );

        expect(byName.teachers).toHaveLength(1);
        expect(byHeadline.teachers).toHaveLength(1);
        expect(bySubject.teachers).toHaveLength(1);
        expect(bySubject.teachers[0]).toMatchObject({ teacher_id: 2 });
    });

    it('keeps only teachers with a free accessibility place', async () => {
        const fixtures = [
            teacherFixture(1, {
                accessibilitySlots: 2,
                accessibilityApplications: 1,
            }),
            teacherFixture(2, {
                accessibilitySlots: 1,
                accessibilityApplications: 1,
            }),
            teacherFixture(3),
        ];
        const { service } = createService(fixtures);

        const result = searchResult(
            await service.findTeachers(student, {
                accessible_only: 'true',
                page: 1,
            }),
        );

        expect(result.teachers).toHaveLength(1);
        expect(result.teachers[0]).toMatchObject({
            teacher_id: 1,
            accessibility_enabled: true,
        });
    });

    it('orders teachers by calculated ranking, not by registration order', async () => {
        const fixtures = [
            teacherFixture(1, {
                rating: 4.2,
                reviewsCount: 3,
                completedLessons: 20,
            }),
            teacherFixture(2, {
                rating: 4.9,
                reviewsCount: 30,
                completedLessons: 100,
            }),
            teacherFixture(3, {
                rating: 4.8,
                reviewsCount: 12,
                completedLessons: 50,
            }),
        ];
        const { service } = createService(fixtures);

        const result = searchResult(
            await service.findTeachers(student, { page: 1 }),
        );

        expect(result.teachers.map((item) => item.teacher_id))
            .toEqual([2, 3, 1]);
        expect(result.teachers.map((item) => item.rank))
            .toEqual([1, 2, 3]);
    });

    it('allows students and parents to browse but rejects a teacher', async () => {
        const fixtures = [teacherFixture(1)];
        const { service } = createService(fixtures);

        await expect(service.findTeachers(student, { page: 1 }))
            .resolves
            .toMatchObject({ success: true });
        await expect(service.findTeachers(parent, { page: 1 }))
            .resolves
            .toMatchObject({ success: true });
        await expect(service.findTeachers(teacherUser, { page: 1 }))
            .rejects
            .toBeInstanceOf(ForbiddenException);
    });
});
