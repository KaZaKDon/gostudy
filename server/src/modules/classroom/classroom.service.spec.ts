import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

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

describe('ClassroomService', () => {
    it('lets only the teacher finish a lesson', async () => {
        const service = new ClassroomService(
            {} as PrismaService,
            {} as NotificationsService,
            {} as ClassroomFileStorageService,
            {} as HomeworkService,
            {} as ClassroomRealtimeService,
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
        const notifications = new NotificationsService(prisma);
        const realtime = {
            publish: vi.fn(),
        } as unknown as ClassroomRealtimeService;
        const service = new ClassroomService(
            prisma,
            notifications,
            {} as ClassroomFileStorageService,
            {} as HomeworkService,
            realtime,
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
        expect(transaction.notification.upsert).toHaveBeenCalledOnce();
        expect(realtime.publish).toHaveBeenCalledWith(12, 'lesson');
        expect(result).toMatchObject({
            success: true,
            message: 'Урок завершён',
            session: { status: 'ended' },
            access: { can_join: false },
        });
    });
});
