import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { ParentChildAccessService } from '../../common/access/parent-child-access.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
    LessonSessionStatus,
    LessonStatus,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { HomeworkService } from '../homework/homework.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TeacherFinanceService } from '../teacher-finance/teacher-finance.service';
import { ClassroomFileStorageService } from './classroom-file-storage.service';
import { ClassroomRealtimeService } from './classroom-realtime.service';
import { ClassroomService } from './classroom.service';

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
        status: LessonStatus.SCHEDULED,
        lessonTopic: 'Знакомство',
        lessonNotes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        teacher: { fullName: 'Анна Учитель', avatarUrl: null },
        student: { fullName: 'Иван Ученик', avatarUrl: null },
        subject: { name: 'Английский язык' },
        session: {
            id: 5,
            lessonId: 12,
            status: LessonSessionStatus.ACTIVE,
            startedById: 7,
            endedById: null,
            startedAt: new Date('2026-09-03T12:00:00.000Z'),
            endedAt: null,
            teacherJoinedAt: new Date('2026-09-03T12:00:00.000Z'),
            studentJoinedAt: new Date('2026-09-03T12:00:05.000Z'),
            teacherLastSeenAt: new Date('2026-09-03T12:10:00.000Z'),
            studentLastSeenAt: new Date('2026-09-03T12:10:00.000Z'),
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        result: null,
    };
}

const finance = {
    markLessonCompleted: vi.fn().mockResolvedValue(undefined),
} as unknown as TeacherFinanceService;

describe('ClassroomService', () => {
    it('lets only the teacher finish a lesson', async () => {
        const service = new ClassroomService(
            {} as PrismaService,
            {} as NotificationsService,
            {} as ClassroomFileStorageService,
            {} as HomeworkService,
            {} as ClassroomRealtimeService,
            finance,
        );

        await expect(service.finish(student, 12))
            .rejects.toBeInstanceOf(ForbiddenException);
    });

    it('ends the room and marks the lesson completed in one transaction', async () => {
        const lesson = lessonRecord();
        const endedSession = {
            ...lesson.session,
            status: LessonSessionStatus.ENDED,
            endedById: 7,
            endedAt: new Date('2026-09-03T13:00:00.000Z'),
        };
        const completedLesson = {
            ...lesson,
            status: LessonStatus.COMPLETED,
            session: endedSession,
        };
        const transaction = {
            lesson: {
                findFirst: vi.fn().mockResolvedValue(lesson),
                update: vi.fn().mockResolvedValue(completedLesson),
            },
            lessonSession: {
                update: vi.fn().mockResolvedValue(endedSession),
            },
            lessonWorkspaceState: {
                updateMany: vi.fn().mockResolvedValue({ count: 1 }),
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
            teacherProfile: {
                findUnique: vi.fn().mockResolvedValue({ timezone: 'Europe/Moscow' }),
            },
            lessonWorkspaceState: {
                findUnique: vi.fn().mockResolvedValue({
                    lessonId: 12,
                    isSharing: false,
                    sharedFileId: null,
                    sharedPage: 1,
                    updatedById: 7,
                    version: 2,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }),
            },
        } as unknown as PrismaService;
        const notifications = new NotificationsService(
            prisma,
            new ParentChildAccessService(prisma),
        );
        const realtime = {
            publish: vi.fn(),
        } as unknown as ClassroomRealtimeService;
        const service = new ClassroomService(
            prisma,
            notifications,
            {} as ClassroomFileStorageService,
            {} as HomeworkService,
            realtime,
            finance,
        );

        const result = await service.finish(teacher, 12);

        expect(transaction.lessonSession.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    status: LessonSessionStatus.ENDED,
                    endedById: 7,
                }),
            }),
        );
        expect(transaction.lesson.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 12 },
                data: { status: LessonStatus.COMPLETED },
            }),
        );
        expect(finance.markLessonCompleted).toHaveBeenCalledWith(
            transaction,
            12,
            endedSession.endedAt,
        );
        expect(transaction.notification.upsert).toHaveBeenCalledOnce();
        expect(realtime.publish).toHaveBeenCalledWith(12, 'lesson');
        expect(result).toMatchObject({
            success: true,
            message: 'Урок завершён',
            session: { status: 'ended' },
            access: { can_join: false },
        });
    });

    it('deletes the teacher own file after the lesson has ended', async () => {
        const lesson = {
            ...lessonRecord(),
            status: LessonStatus.COMPLETED,
            session: {
                ...lessonRecord().session,
                status: LessonSessionStatus.ENDED,
                endedById: teacher.id,
                endedAt: new Date('2026-09-03T13:00:00.000Z'),
            },
        };
        const file = {
            id: 41,
            lessonId: lesson.id,
            uploadedById: teacher.id,
            storedPath: 'classroom/12/materials/file.pdf',
            originalName: 'lesson.pdf',
            mimeType: 'application/pdf',
            fileSize: 4_096,
            createdAt: new Date('2026-09-03T12:05:00.000Z'),
        };
        const transaction = {
            lesson: {
                findFirst: vi.fn().mockResolvedValue(lesson),
            },
            lessonFile: {
                findFirst: vi.fn().mockResolvedValue(file),
                delete: vi.fn().mockResolvedValue(file),
            },
            lessonWorkspaceState: {
                updateMany: vi.fn().mockResolvedValue({ count: 0 }),
            },
        };
        const prisma = {
            $transaction: vi.fn(
                async (callback: (client: typeof transaction) => unknown) =>
                    callback(transaction),
            ),
            teacherProfile: {
                findUnique: vi.fn().mockResolvedValue({ timezone: 'Europe/Moscow' }),
            },
            lessonFile: {
                findMany: vi.fn().mockResolvedValue([]),
            },
            lessonWorkspaceState: {
                findUnique: vi.fn().mockResolvedValue(null),
            },
        } as unknown as PrismaService;
        const fileStorage = {
            releaseQuota: vi.fn().mockResolvedValue(undefined),
            removeStoredPaths: vi.fn().mockResolvedValue(undefined),
        } as unknown as ClassroomFileStorageService;
        const realtime = {
            publish: vi.fn(),
        } as unknown as ClassroomRealtimeService;
        const service = new ClassroomService(
            prisma,
            {} as NotificationsService,
            fileStorage,
            {} as HomeworkService,
            realtime,
            finance,
        );

        await expect(service.deleteFile(teacher, {
            lesson_id: lesson.id,
            file_id: file.id,
        })).resolves.toMatchObject({
            success: true,
            message: 'Материал удалён',
            files: [],
        });

        expect(transaction.lessonFile.findFirst).toHaveBeenCalledWith({
            where: {
                id: file.id,
                lessonId: lesson.id,
                uploadedById: teacher.id,
            },
        });
        expect(fileStorage.releaseQuota).toHaveBeenCalledWith(
            teacher.id,
            file.fileSize,
            transaction,
        );
        expect(fileStorage.removeStoredPaths).toHaveBeenCalledWith([
            file.storedPath,
        ]);
        expect(realtime.publish).toHaveBeenCalledWith(lesson.id, 'files');
    });

    it('does not let a teacher delete a file from another teacher lesson', async () => {
        const anotherTeacherLesson = {
            ...lessonRecord(),
            teacherId: 99,
            studentId: teacher.id,
        };
        const transaction = {
            lesson: {
                findFirst: vi.fn().mockResolvedValue(anotherTeacherLesson),
            },
            lessonFile: {
                findFirst: vi.fn(),
            },
        };
        const prisma = {
            $transaction: vi.fn(
                async (callback: (client: typeof transaction) => unknown) =>
                    callback(transaction),
            ),
        } as unknown as PrismaService;
        const service = new ClassroomService(
            prisma,
            {} as NotificationsService,
            {} as ClassroomFileStorageService,
            {} as HomeworkService,
            {} as ClassroomRealtimeService,
            finance,
        );

        await expect(service.deleteFile(teacher, {
            lesson_id: anotherTeacherLesson.id,
            file_id: 41,
        })).rejects.toBeInstanceOf(ForbiddenException);
        expect(transaction.lessonFile.findFirst).not.toHaveBeenCalled();
    });
});
