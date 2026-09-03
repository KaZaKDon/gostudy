import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
    LessonStatus,
    TeacherStudentStatus,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { NotificationsService } from '../notifications/notifications.service';
import { LessonsService } from './lessons.service';

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

const relation = {
    id: 4,
    teacherId: 7,
    studentId: 9,
    subjectId: 11,
    status: TeacherStudentStatus.ACTIVE,
    student: {
        fullName: 'Иван Ученик',
        studentProfile: { timezone: 'Europe/Moscow' },
    },
    subject: { name: 'Английский язык' },
    teacher: {
        teacherProfile: {
            timezone: 'Europe/Moscow',
            price45: 900,
            price60: 1_100,
            price90: null,
        },
    },
};

const notifications = {
    create: vi.fn().mockResolvedValue(undefined),
} as unknown as NotificationsService;

function createPrisma(conflicts: Array<Record<string, unknown>> = []) {
    const transaction = {
        teacherStudent: {
            findFirst: vi.fn().mockResolvedValue(relation),
        },
        lesson: {
            findMany: vi.fn().mockResolvedValue(conflicts),
            create: vi.fn().mockResolvedValue({
                id: 15,
                teacherId: 7,
                studentId: 9,
                subjectId: 11,
                lessonDate: new Date('2026-08-31T15:00:00.000Z'),
                durationMinutes: 60,
                status: LessonStatus.SCHEDULED,
                lessonTopic: 'Разговорная практика',
                lessonNotes: null,
            }),
        },
    };
    const prisma = {
        teacherProfile: {
            findUnique: vi.fn().mockResolvedValue({
                timezone: 'Europe/Moscow',
                price45: 900,
                price60: 1_100,
                price90: null,
            }),
        },
        teacherStudent: {
            findMany: vi.fn().mockResolvedValue([relation]),
        },
        $transaction: vi.fn(
            async (callback: (client: typeof transaction) => unknown) =>
                callback(transaction),
        ),
    } as unknown as PrismaService;

    return { prisma, transaction };
}

describe('LessonsService', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-08-31T12:00:00.000Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns active relations and configured prices', async () => {
        const { prisma } = createPrisma();
        const service = new LessonsService(prisma, notifications);
        const result = await service.getCreationOptions(teacher);

        expect(result).toMatchObject({
            timezone: 'Europe/Moscow',
            durations: [
                { minutes: 45, price: 900 },
                { minutes: 60, price: 1_100 },
            ],
        });
        expect(result.relations).toEqual([
            {
                relation_id: 4,
                student_id: 9,
                subject_id: 11,
                student_name: 'Иван Ученик',
                subject_name: 'Английский язык',
            },
        ]);
    });

    it('creates a future lesson in the teacher timezone', async () => {
        const { prisma, transaction } = createPrisma();
        const service = new LessonsService(prisma, notifications);
        const result = await service.createLesson(teacher, {
            relation_id: 4,
            lesson_date: '2026-08-31T18:00',
            duration_minutes: 60,
            lesson_topic: ' Разговорная практика ',
            lesson_notes: ' ',
        });

        expect(transaction.lesson.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                lessonDate: new Date('2026-08-31T15:00:00.000Z'),
                lessonTopic: 'Разговорная практика',
                lessonNotes: null,
            }),
        });
        expect(result).toMatchObject({
            success: true,
            message: 'Урок назначен',
            lesson: {
                lesson_date: '2026-08-31 18:00:00',
                status: 'scheduled',
            },
        });
        expect(notifications.create).toHaveBeenCalledWith(
            transaction,
            expect.objectContaining({
                userId: 9,
                type: 'lesson_created',
                targetSection: 'schedule',
                targetEntityId: 15,
            }),
        );
    });

    it('rejects an overlapping teacher lesson', async () => {
        const { prisma } = createPrisma([
            {
                teacherId: 7,
                studentId: 20,
                lessonDate: new Date('2026-08-31T14:30:00.000Z'),
                durationMinutes: 60,
            },
        ]);
        const service = new LessonsService(prisma, notifications);

        await expect(service.createLesson(teacher, {
            relation_id: 4,
            lesson_date: '2026-08-31T18:00',
            duration_minutes: 60,
            lesson_topic: 'Разговорная практика',
        })).rejects.toThrow('У преподавателя уже есть занятие');
    });
});
