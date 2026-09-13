import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
    HomeworkStatus,
    HomeworkSubmissionStatus,
    TeacherStudentStatus,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { NotificationsService } from '../notifications/notifications.service';
import { HomeworkFileStorageService } from './homework-file-storage.service';
import { HomeworkService } from './homework.service';

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

const parent: SessionUser = {
    ...teacher,
    id: 15,
    role: UserRole.PARENT,
    email: 'parent@example.com',
    fullName: 'Николай Внуков',
};

function parentChildrenPrisma(overrides: Record<string, unknown> = {}) {
    return {
        parentStudent: {
            findMany: vi.fn().mockResolvedValue([{ studentId: 9 }]),
        },
        parentChildProfile: {
            findMany: vi.fn().mockResolvedValue([{
                studentId: 9,
                firstName: 'Иван',
                lastName: 'Ученик',
                middleName: null,
                timezone: 'Europe/Moscow',
                student: {
                    studentProfile: { timezone: 'Europe/Moscow' },
                },
            }]),
        },
        ...overrides,
    } as unknown as PrismaService;
}

function fileStorage() {
    return {
        limits: vi.fn().mockReturnValue({
            maxFiles: 5,
            maxFileBytes: 10 * 1024 * 1024,
            maxTotalBytes: 30 * 1024 * 1024,
        }),
        validateUploads: vi.fn().mockReturnValue([]),
        storeAssignment: vi.fn().mockResolvedValue([]),
        storeSubmission: vi.fn().mockResolvedValue([]),
        removeStoredPaths: vi.fn().mockResolvedValue(undefined),
    } as unknown as HomeworkFileStorageService;
}

function service(prisma: PrismaService) {
    return new HomeworkService(
        prisma,
        new NotificationsService(prisma),
        fileStorage(),
    );
}

describe('HomeworkService', () => {
    it('allows only a teacher to create an assignment', async () => {
        await expect(service({} as PrismaService).create(student, {
            relation_id: 4,
            title: 'Упражнение',
            description: 'Выполнить упражнение 5',
        }, [])).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('creates an assignment for an active relation and notifies the student', async () => {
        const transaction = {
            teacherStudent: {
                findFirst: vi.fn().mockResolvedValue({
                    id: 4,
                    teacherId: 7,
                    studentId: 9,
                    subjectId: 11,
                    status: TeacherStudentStatus.ACTIVE,
                    student: { fullName: 'Иван Ученик' },
                    subject: { name: 'Английский язык' },
                }),
            },
            homework: {
                create: vi.fn().mockResolvedValue({ id: 21 }),
            },
            homeworkAttachment: { createMany: vi.fn() },
            notification: { upsert: vi.fn().mockResolvedValue(undefined) },
            parentStudent: {
                findMany: vi.fn().mockResolvedValue([]),
            },
        };
        const prisma = {
            teacherProfile: {
                findUnique: vi.fn().mockResolvedValue({
                    timezone: 'Europe/Moscow',
                }),
            },
            $transaction: vi.fn(async (callback) => callback(transaction)),
        } as unknown as PrismaService;

        const result = await service(prisma).create(teacher, {
            relation_id: 4,
            title: 'Упражнение',
            description: 'Выполнить упражнение 5',
        }, []);

        expect(transaction.homework.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                teacherStudentId: 4,
                teacherId: 7,
                studentId: 9,
                subjectId: 11,
            }),
        });
        expect(transaction.notification.upsert).toHaveBeenCalledOnce();
        expect(result).toMatchObject({ success: true, homework_id: 21 });
    });

    it('does not create a second attempt while the first awaits review', async () => {
        const transaction = {
            homework: {
                findFirst: vi.fn().mockResolvedValue({
                    id: 21,
                    status: HomeworkStatus.ACTIVE,
                    submissions: [{
                        id: 31,
                        status: HomeworkSubmissionStatus.SUBMITTED,
                    }],
                }),
            },
        };
        const prisma = {
            $transaction: vi.fn(async (callback) => callback(transaction)),
        } as unknown as PrismaService;

        await expect(service(prisma).submit(student, {
            homework_id: 21,
            answer_text: 'Ответ',
        }, [])).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates a new immutable attempt after a returned submission', async () => {
        const transaction = {
            homework: {
                findFirst: vi.fn().mockResolvedValue({
                    id: 21,
                    teacherId: 7,
                    studentId: 9,
                    status: HomeworkStatus.ACTIVE,
                    title: 'Упражнение',
                    teacher: { fullName: 'Анна Учитель' },
                    student: { fullName: 'Иван Ученик' },
                    subject: { name: 'Английский язык' },
                    submissions: [{
                        id: 31,
                        status: HomeworkSubmissionStatus.RETURNED,
                    }],
                }),
            },
            homeworkSubmission: {
                aggregate: vi.fn().mockResolvedValue({
                    _max: { attemptNumber: 1 },
                }),
                create: vi.fn().mockResolvedValue({ id: 32 }),
            },
            homeworkSubmissionAttachment: { createMany: vi.fn() },
            notification: { upsert: vi.fn().mockResolvedValue(undefined) },
        };
        const prisma = {
            $transaction: vi.fn(async (callback) => callback(transaction)),
        } as unknown as PrismaService;

        const result = await service(prisma).submit(student, {
            homework_id: 21,
            answer_text: 'Исправленный ответ',
        }, []);

        expect(transaction.homeworkSubmission.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                homeworkId: 21,
                studentId: 9,
                attemptNumber: 2,
            }),
        });
        expect(result).toMatchObject({
            success: true,
            submission_id: 32,
            attempt_number: 2,
        });
    });

    it('requires a comment when returning work for revision', async () => {
        await expect(service({} as PrismaService).review(teacher, {
            homework_id: 21,
            decision: 'returned',
            grade: '',
            teacher_comment: '',
        })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('accepts the latest submission and completes the assignment', async () => {
        const transaction = {
            homework: {
                findFirst: vi.fn().mockResolvedValue({
                    id: 21,
                    teacherId: 7,
                    studentId: 9,
                    status: HomeworkStatus.ACTIVE,
                    title: 'Упражнение',
                    subject: { name: 'Английский язык' },
                    submissions: [{
                        id: 32,
                        status: HomeworkSubmissionStatus.SUBMITTED,
                    }],
                }),
                update: vi.fn().mockResolvedValue(undefined),
            },
            homeworkSubmission: {
                update: vi.fn().mockResolvedValue(undefined),
            },
            notification: { upsert: vi.fn().mockResolvedValue(undefined) },
            parentStudent: {
                findMany: vi.fn().mockResolvedValue([]),
            },
        };
        const prisma = {
            $transaction: vi.fn(async (callback) => callback(transaction)),
        } as unknown as PrismaService;

        await service(prisma).review(teacher, {
            homework_id: 21,
            decision: 'accepted',
            grade: '5',
            teacher_comment: 'Всё верно',
        });

        expect(transaction.homeworkSubmission.update).toHaveBeenCalledWith({
            where: { id: 32 },
            data: expect.objectContaining({
                status: HomeworkSubmissionStatus.ACCEPTED,
                grade: '5',
            }),
        });
        expect(transaction.homework.update).toHaveBeenCalledWith({
            where: { id: 21 },
            data: expect.objectContaining({ status: HomeworkStatus.COMPLETED }),
        });
    });

    it('returns one selected child homework list to a verified parent in read-only mode', async () => {
        const homework = {
            id: 21,
            lessonId: null,
            teacherId: 7,
            studentId: 9,
            subjectId: 11,
            title: 'Упражнение',
            description: 'Выполнить упражнение 5',
            dueDate: new Date('2099-09-10T15:00:00.000Z'),
            status: HomeworkStatus.ACTIVE,
            viewedAt: null,
            completedAt: null,
            cancelledAt: null,
            createdAt: new Date('2026-09-09T08:00:00.000Z'),
            updatedAt: new Date('2026-09-09T08:00:00.000Z'),
            teacher: { fullName: 'Анна Учитель' },
            student: { fullName: 'Иван Ученик' },
            subject: { name: 'Английский язык' },
            submissions: [],
        };
        const prisma = parentChildrenPrisma({
            homework: {
                findMany: vi.fn().mockResolvedValue([homework]),
            },
        }) as any;

        const result = await service(prisma).list(parent, 9);
        const resultHomework = result.homework as Array<Record<string, unknown>>;

        expect(result).toMatchObject({
            read_only: true,
            selected_student_id: 9,
            actionable_count: 0,
            children: [{ student_id: 9, full_name: 'Ученик Иван' }],
        });
        expect(resultHomework[0]).toMatchObject({
            id: 21,
            student_id: 9,
            teacher_name: 'Анна Учитель',
        });
        expect(prisma.homework.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { studentId: 9 } }),
        );
    });

    it('does not expose another student homework list to a parent', async () => {
        const prisma = parentChildrenPrisma({
            homework: { findMany: vi.fn() },
        }) as any;

        await expect(service(prisma).list(parent, 999))
            .rejects.toThrow('недоступны родителю');
        expect(prisma.homework.findMany).not.toHaveBeenCalled();
    });

    it('does not let a parent download another student homework file', async () => {
        const prisma = parentChildrenPrisma({
            homeworkAttachment: {
                findUnique: vi.fn().mockResolvedValue({
                    id: 41,
                    storedPath: 'homework/foreign.pdf',
                    originalName: 'foreign.pdf',
                    mimeType: 'application/pdf',
                    homework: { teacherId: 7, studentId: 999 },
                }),
            },
        });

        await expect(service(prisma).download(parent, {
            type: 'assignment',
            id: 41,
        })).rejects.toThrow('Файл не найден');
    });
});
