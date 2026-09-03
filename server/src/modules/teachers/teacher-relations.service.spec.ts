import { describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
    TeacherStudentRequestStatus,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { HomeworkService } from '../homework/homework.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TeacherRelationsService } from './teacher-relations.service';

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

const notifications = {
    create: vi.fn().mockResolvedValue(undefined),
    markDedupeRead: vi.fn().mockResolvedValue(undefined),
} as unknown as NotificationsService;

describe('TeacherRelationsService', () => {
    it('accepts a pending request and creates an active relation', async () => {
        const transaction = {
            teacherStudentRequest: {
                findFirst: vi.fn().mockResolvedValue({
                    id: 5,
                    teacherId: 7,
                    studentId: 9,
                    subjectId: 11,
                    status: TeacherStudentRequestStatus.PENDING,
                    subject: { name: 'Английский язык' },
                }),
                update: vi.fn().mockResolvedValue(undefined),
            },
            teacherStudent: {
                findUnique: vi.fn().mockResolvedValue(null),
                upsert: vi.fn().mockResolvedValue(undefined),
            },
        };
        const prisma = {
            $transaction: vi.fn(
                async (callback: (client: typeof transaction) => unknown) =>
                    callback(transaction),
            ),
        } as unknown as PrismaService;
        const service = new TeacherRelationsService(
            prisma,
            notifications,
            {} as HomeworkService,
        );
        const result = await service.respondToRequest(teacher, {
            request_id: 5,
            action: 'accept',
        });

        expect(result).toMatchObject({
            success: true,
            status: 'accepted',
        });
        expect(transaction.teacherStudent.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                create: expect.objectContaining({
                    teacherId: 7,
                    studentId: 9,
                    subjectId: 11,
                }),
            }),
        );
        expect(transaction.teacherStudentRequest.update).toHaveBeenCalledWith({
            where: { id: 5 },
            data: { status: TeacherStudentRequestStatus.ACCEPTED },
        });
        expect(notifications.create).toHaveBeenCalledWith(
            transaction,
            expect.objectContaining({
                userId: 9,
                type: 'teacher_request_accepted',
                targetSection: 'teachers',
            }),
        );
    });
});
