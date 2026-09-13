import { describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
    LessonChangeStatus,
    LessonChangeType,
    LessonSessionStatus,
    LessonStatus,
    ParentChildVerificationStatus,
    ParentStudentStatus,
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

const parent: SessionUser = {
    ...teacher,
    id: 15,
    role: UserRole.PARENT,
    email: 'parent@example.com',
    fullName: 'Николай Внуков',
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
        parentStudent: {
            findMany: vi.fn().mockResolvedValue([]),
        },
        parentChildProfile: {
            findMany: vi.fn().mockResolvedValue([]),
        },
        lesson: {
            findFirst: vi.fn(),
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

    it('returns a selected child schedule to the verified parent in read-only mode', async () => {
        const prisma = createPrisma() as any;
        prisma.parentStudent.findMany.mockResolvedValue([
            { studentId: 9 },
            { studentId: 10 },
        ]);
        prisma.parentChildProfile.findMany.mockResolvedValue([
            {
                studentId: 9,
                firstName: 'Иван',
                lastName: 'Ученик',
                middleName: null,
                timezone: 'Europe/Moscow',
                student: {
                    studentProfile: { timezone: 'Europe/Moscow' },
                },
            },
            {
                studentId: 10,
                firstName: 'Мария',
                lastName: 'Ученица',
                middleName: null,
                timezone: 'Europe/Moscow',
                student: {
                    studentProfile: { timezone: 'Europe/Moscow' },
                },
            },
        ]);
        const service = new ScheduleService(prisma);
        const result = await service.getSchedule(parent, {
            from: '2026-08-31',
            to: '2026-09-06',
            student_id: 9,
        });
        const schedule = result.schedule as Array<Record<string, any>>;

        expect(result).toMatchObject({
            selected_student_id: 9,
            read_only: true,
            children: [
                { student_id: 9, full_name: 'Ученик Иван' },
                { student_id: 10, full_name: 'Ученица Мария' },
            ],
        });
        expect(schedule[0].change_request).toMatchObject({
            can_respond: false,
            can_withdraw: false,
        });
        expect(prisma.lesson.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ studentId: 9 }),
            }),
        );
        expect(prisma.parentStudent.findMany).toHaveBeenCalledWith({
            where: {
                parentId: 15,
                status: ParentStudentStatus.ACTIVE,
                verifiedAt: { not: null },
            },
            select: { studentId: true },
        });
        expect(prisma.parentChildProfile.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    parentId: 15,
                    verificationStatus:
                        ParentChildVerificationStatus.VERIFIED,
                }),
            }),
        );
    });

    it('does not expose another student schedule to a parent', async () => {
        const prisma = createPrisma() as any;
        prisma.parentStudent.findMany.mockResolvedValue([{ studentId: 9 }]);
        prisma.parentChildProfile.findMany.mockResolvedValue([{
            studentId: 9,
            firstName: 'Иван',
            lastName: 'Ученик',
            middleName: null,
            timezone: 'Europe/Moscow',
            student: { studentProfile: { timezone: 'Europe/Moscow' } },
        }]);
        const service = new ScheduleService(prisma);

        await expect(service.getSchedule(parent, {
            from: '2026-08-31',
            to: '2026-09-06',
            student_id: 999,
        })).rejects.toThrow('недоступно родителю');
        expect(prisma.lesson.findMany).not.toHaveBeenCalled();
    });

    it('rejects a request longer than 32 calendar days', async () => {
        const service = new ScheduleService(createPrisma());

        await expect(service.getSchedule(teacher, {
            from: '2026-01-01',
            to: '2026-02-02',
        })).rejects.toThrow('не более 32 дней');
    });

    it('opens a notification on the exact linked child and lesson', async () => {
        const prisma = createPrisma() as any;
        prisma.parentStudent.findMany.mockResolvedValue([
            { studentId: 9 },
            { studentId: 10 },
        ]);
        prisma.parentChildProfile.findMany.mockResolvedValue([
            {
                studentId: 9,
                firstName: 'Иван',
                lastName: 'Ученик',
                middleName: null,
                timezone: 'Europe/Moscow',
                student: {
                    studentProfile: { timezone: 'Europe/Moscow' },
                },
            },
            {
                studentId: 10,
                firstName: 'Мария',
                lastName: 'Ученица',
                middleName: null,
                timezone: 'Europe/Moscow',
                student: {
                    studentProfile: { timezone: 'Europe/Moscow' },
                },
            },
        ]);
        prisma.lesson.findFirst.mockResolvedValue({ studentId: 10 });
        const service = new ScheduleService(prisma);

        const result = await service.getSchedule(parent, {
            from: '2026-08-31',
            to: '2026-09-06',
            lesson_id: 55,
        });

        expect(result).toMatchObject({ selected_student_id: 10 });
        expect(prisma.lesson.findFirst).toHaveBeenCalledWith({
            where: {
                id: 55,
                studentId: { in: [9, 10] },
            },
            select: { studentId: true },
        });
        expect(prisma.lesson.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    studentId: 10,
                    OR: [
                        { status: { not: LessonStatus.CANCELLED } },
                        { id: 55 },
                    ],
                }),
            }),
        );
    });
});
