import { ForbiddenException } from '@nestjs/common';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
    HomeworkSubmissionStatus,
    LessonStatus,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { ParentDashboardService } from './parent-dashboard.service';

const parent: SessionUser = {
    id: 15,
    role: UserRole.PARENT,
    email: 'parent@example.com',
    fullName: 'Мария Родитель',
    phone: null,
    avatarUrl: null,
    status: UserStatus.ACTIVE,
    emailVerifiedAt: new Date(),
    profileCompleted: true,
};

describe('ParentDashboardService', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('rejects access for a non-parent account', async () => {
        const service = new ParentDashboardService({} as PrismaService);

        await expect(service.show({
            ...parent,
            role: UserRole.STUDENT,
        })).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('returns an empty summary when no child is connected', async () => {
        const prisma = {
            parentStudent: { findMany: vi.fn().mockResolvedValue([]) },
        } as unknown as PrismaService;
        const service = new ParentDashboardService(prisma);

        await expect(service.show(parent)).resolves.toMatchObject({
            success: true,
            children: [],
            summary: {
                children_count: 0,
                upcoming_lessons_count: 0,
                active_homework_count: 0,
            },
        });
    });

    it('combines lessons, homework and published diary entries of children', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-09-13T12:00:00.000Z'));

        const lessonDate = new Date('2026-09-12T12:00:00.000Z');
        const dueDate = new Date('2026-09-14T12:00:00.000Z');
        const publishedAt = new Date('2026-09-11T10:00:00.000Z');
        const prisma = {
            parentStudent: {
                findMany: vi.fn().mockResolvedValue([
                    { studentId: 9 },
                    { studentId: 10 },
                ]),
            },
            parentChildProfile: {
                findMany: vi.fn().mockResolvedValue([{
                    studentId: 9,
                    firstName: 'Иван',
                    lastName: 'Ученик',
                    middleName: null,
                    timezone: 'Europe/Moscow',
                    student: { studentProfile: { timezone: 'Europe/Moscow' } },
                }]),
            },
            lesson: {
                findMany: vi.fn().mockResolvedValue([{
                    id: 21,
                    studentId: 9,
                    title: 'Алгебра',
                    lessonDate,
                    durationMinutes: 60,
                    status: LessonStatus.SCHEDULED,
                    teacher: { fullName: 'Анна Учитель' },
                    subject: { name: 'Математика' },
                }]),
                count: vi.fn().mockResolvedValue(1),
            },
            homework: {
                findMany: vi.fn().mockResolvedValue([{
                    id: 31,
                    studentId: 9,
                    title: 'Упражнение 5',
                    dueDate,
                    teacher: { fullName: 'Анна Учитель' },
                    subject: { name: 'Математика' },
                    submissions: [{
                        status: HomeworkSubmissionStatus.RETURNED,
                    }],
                }]),
                count: vi.fn().mockResolvedValue(1),
            },
            lessonResult: {
                findMany: vi.fn().mockResolvedValue([{
                    id: 41,
                    lessonId: 20,
                    attendance: 'present',
                    grade: '5',
                    publishedAt,
                    lesson: {
                        studentId: 9,
                        title: 'Дроби',
                        lessonTopic: 'Обыкновенные дроби',
                        lessonDate: new Date('2026-09-10T12:00:00.000Z'),
                        teacher: { fullName: 'Анна Учитель' },
                        subject: { name: 'Математика' },
                    },
                }]),
            },
        } as unknown as PrismaService;
        const service = new ParentDashboardService(prisma);

        const result = await service.show(parent);

        expect(prisma.parentChildProfile.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    parentId: 15,
                    verificationStatus: 'VERIFIED',
                    verifiedAt: { not: null },
                    archivedAt: null,
                    birthDate: { gt: expect.any(Date) },
                }),
            }),
        );
        expect(result).toMatchObject({
            summary: {
                children_count: 1,
                upcoming_lessons_count: 1,
                active_homework_count: 1,
                recent_diary_count: 1,
            },
            upcoming_lessons: [{
                id: 21,
                child_name: 'Ученик Иван',
                subject_name: 'Математика',
            }],
            active_homework: [{
                id: 31,
                child_name: 'Ученик Иван',
                display_status: 'progress',
            }],
            recent_diary: [{
                lesson_id: 20,
                child_name: 'Ученик Иван',
                grade: '5',
            }],
        });
    });
});
