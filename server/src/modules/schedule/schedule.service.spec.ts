import { describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
    LessonChangeStatus,
    LessonChangeType,
    LessonSessionStatus,
    LessonStatus,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { ScheduleService } from './schedule.service';

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

function createPrisma() {
    return {
        teacherProfile: {
            findUnique: vi.fn().mockResolvedValue({
                timezone: 'Europe/Moscow',
            }),
        },
        studentProfile: {
            findUnique: vi.fn(),
        },
        lesson: {
            findMany: vi.fn().mockResolvedValue([
                {
                    id: 12,
                    teacherId: 7,
                    studentId: 9,
                    subjectId: 11,
                    title: 'Английский язык',
                    lessonDate: new Date('2026-08-31T15:00:00.000Z'),
                    durationMinutes: 60,
                    status: LessonStatus.SCHEDULED,
                    lessonTopic: 'Разговорная практика',
                    lessonNotes: null,
                    teacher: { fullName: 'Анна Учитель' },
                    student: { fullName: 'Иван Ученик' },
                    subject: { name: 'Английский язык' },
                    session: {
                        status: LessonSessionStatus.WAITING,
                        startedAt: null,
                        endedAt: null,
                    },
                    changeRequests: [
                        {
                            id: 3,
                            lessonId: 12,
                            requestedBy: 9,
                            requestedRole: UserRole.STUDENT,
                            requestType: LessonChangeType.RESCHEDULE,
                            status: LessonChangeStatus.PENDING,
                            originalLessonDate: new Date(
                                '2026-08-31T15:00:00.000Z',
                            ),
                            proposedLessonDate: new Date(
                                '2026-09-01T15:00:00.000Z',
                            ),
                            requestComment: 'Не успеваю после школы',
                            responseComment: null,
                            respondedBy: null,
                            respondedAt: null,
                            createdAt: new Date(
                                '2026-08-30T12:00:00.000Z',
                            ),
                            requester: { fullName: 'Иван Ученик' },
                        },
                    ],
                },
            ]),
        },
    } as unknown as PrismaService;
}

describe('ScheduleService', () => {
    it('returns only the viewer period in the profile timezone', async () => {
        const prisma = createPrisma();
        const service = new ScheduleService(prisma);
        const result = await service.getSchedule(teacher, {
            from: '2026-08-31',
            to: '2026-09-06',
        });
        const schedule = result.schedule as Array<Record<string, unknown>>;

        expect(schedule[0]).toMatchObject({
            lesson_date: '2026-08-31 18:00:00',
            status: 'scheduled',
            teacher_name: 'Анна Учитель',
            student_name: 'Иван Ученик',
        });
        expect(schedule[0].change_request).toMatchObject({
            request_type: 'reschedule',
            can_respond: true,
            can_withdraw: false,
        });
        expect(prisma.lesson.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    status: { not: LessonStatus.CANCELLED },
                }),
            }),
        );
    });

    it('rejects a request longer than 32 calendar days', async () => {
        const service = new ScheduleService(createPrisma());

        await expect(service.getSchedule(teacher, {
            from: '2026-01-01',
            to: '2026-02-02',
        })).rejects.toThrow('не более 32 дней');
    });
});
