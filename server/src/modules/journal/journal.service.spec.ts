import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
    LessonStatus,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { HomeworkService } from '../homework/homework.service';
import { NotificationsService } from '../notifications/notifications.service';
import { JournalService } from './journal.service';

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

const student: SessionUser = {
    ...teacher,
    id: 9,
    role: UserRole.STUDENT,
    email: 'student@example.com',
    fullName: 'Иван Ученик',
};

function lessonRecord() {
    return {
        id: 12,
        teacherId: 7,
        studentId: 9,
        subjectId: 11,
        title: 'Английский язык',
        lessonDate: new Date('2026-09-03T12:00:00.000Z'),
        durationMinutes: 60,
        status: LessonStatus.COMPLETED,
        lessonTopic: 'Past Simple',
        lessonNotes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        teacher: { fullName: 'Анна Учитель' },
        student: {
            fullName: 'Иван Ученик',
            avatarUrl: null,
            studentProfile: {
                classLevel: '7 класс',
                timezone: 'Europe/Moscow',
            },
        },
        subject: { name: 'Английский язык' },
        result: null,
    };
}

function createService(prisma: PrismaService) {
    return new JournalService(
        prisma,
        new NotificationsService(prisma),
        {
            getLessonSummaries: vi.fn().mockResolvedValue(new Map()),
        } as unknown as HomeworkService,
    );
}

describe('JournalService', () => {
    it('allows only a teacher to publish a journal result', async () => {
        const service = createService({} as PrismaService);

        await expect(service.saveResult(student, {
            lesson_id: 12,
            attendance: 'present',
            grade: '5',
            lesson_result: 'Тема усвоена',
            teacher_comment: '',
            teacher_note: '',
        })).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('publishes a completed lesson result and notifies the student', async () => {
        const lesson = lessonRecord();
        const transaction = {
            lesson: {
                findFirst: vi.fn().mockResolvedValue(lesson),
            },
            lessonResult: {
                upsert: vi.fn().mockResolvedValue(undefined),
            },
            notification: {
                upsert: vi.fn().mockResolvedValue(undefined),
            },
        };
        const prisma = {
            $transaction: vi.fn(
                async (callback: (client: typeof transaction) => unknown) =>
                    callback(transaction),
            ),
        } as unknown as PrismaService;
        const service = createService(prisma);

        const response = await service.saveResult(teacher, {
            lesson_id: 12,
            attendance: 'present',
            grade: '5',
            lesson_result: 'Ученик освоил тему',
            teacher_comment: 'Продолжать практику',
            teacher_note: 'Повторить неправильные глаголы',
        });

        expect(transaction.lessonResult.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { lessonId: 12 },
                create: expect.objectContaining({
                    attendance: 'present',
                    grade: '5',
                    teacherNote: 'Повторить неправильные глаголы',
                }),
            }),
        );
        expect(transaction.notification.upsert).toHaveBeenCalledOnce();
        expect(response).toEqual({
            success: true,
            message: 'Результат занятия опубликован',
            lesson_id: 12,
        });
    });

    it('does not accept a grade for an absent student', async () => {
        const service = createService({} as PrismaService);

        await expect(service.saveResult(teacher, {
            lesson_id: 12,
            attendance: 'absent',
            grade: '5',
            lesson_result: '',
            teacher_comment: '',
            teacher_note: '',
        })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('does not publish a result before classroom completion', async () => {
        const transaction = {
            lesson: {
                findFirst: vi.fn().mockResolvedValue({
                    ...lessonRecord(),
                    status: LessonStatus.ACTIVE,
                }),
            },
        };
        const prisma = {
            $transaction: vi.fn(
                async (callback: (client: typeof transaction) => unknown) =>
                    callback(transaction),
            ),
        } as unknown as PrismaService;
        const service = createService(prisma);

        await expect(service.saveResult(teacher, {
            lesson_id: 12,
            attendance: 'present',
            grade: '',
            lesson_result: 'Результат',
            teacher_comment: '',
            teacher_note: '',
        })).rejects.toBeInstanceOf(ConflictException);
    });

    it('never exposes the private teacher note in the student diary', async () => {
        const publishedLesson = {
            ...lessonRecord(),
            result: {
                id: 1,
                lessonId: 12,
                attendance: 'present',
                grade: '5',
                lessonResult: 'Тема усвоена',
                teacherComment: 'Хорошая работа',
                teacherNote: 'Личная заметка',
                publishedAt: new Date('2026-09-03T13:00:00.000Z'),
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        };
        const prisma = {
            studentProfile: {
                findUnique: vi.fn().mockResolvedValue({
                    timezone: 'Europe/Moscow',
                }),
            },
            lesson: {
                findMany: vi.fn()
                    .mockResolvedValueOnce([publishedLesson])
                    .mockResolvedValueOnce([publishedLesson]),
            },
        } as unknown as PrismaService;
        const service = createService(prisma);

        const response = await service.listStudentDiary(student, {
            limit: 30,
        });

        expect(response.lessons).toHaveLength(1);
        expect(response.lessons[0]).not.toHaveProperty('teacher_note');
        expect(response.lessons[0]).toMatchObject({
            lesson_result: 'Тема усвоена',
            teacher_comment: 'Хорошая работа',
        });
    });
});
