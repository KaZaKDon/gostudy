import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { ParentChildAccessService } from '../../common/access/parent-child-access.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
    TeacherStudentRequestStatus,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { NotificationsService } from '../notifications/notifications.service';
import { TeacherApplicantAccessService } from './teacher-applicant-access.service';
import { TeachersService } from './teachers.service';

const student: SessionUser = {
    id: 9,
    role: UserRole.STUDENT,
    email: 'student@example.com',
    fullName: 'Иван Ученик',
    phone: null,
    avatarUrl: null,
    status: UserStatus.ACTIVE,
    emailVerifiedAt: new Date(),
    profileCompleted: true,
};

const parent: SessionUser = {
    ...student,
    id: 10,
    role: UserRole.PARENT,
    email: 'parent@example.com',
    fullName: 'Мария Родитель',
};

const notifications = {
    create: vi.fn().mockResolvedValue(undefined),
} as unknown as NotificationsService;
const parentChildAccess = {
    hasCurrentMinorAccessIn: vi.fn().mockResolvedValue(true),
} as unknown as ParentChildAccessService;

function applicantAccess(
    access: ParentChildAccessService = parentChildAccess,
): TeacherApplicantAccessService {
    return new TeacherApplicantAccessService(access);
}

describe('TeachersService requests', () => {
    it('does not duplicate an already pending request', async () => {
        const transaction = {
            teacherProfile: {
                findFirst: vi.fn().mockResolvedValue({
                    userId: 7,
                    user: {
                        teacherSubjects: [{
                            subject: { name: 'Английский язык' },
                        }],
                    },
                }),
            },
            teacherStudent: {
                findUnique: vi.fn().mockResolvedValue(null),
            },
            teacherStudentRequest: {
                findUnique: vi.fn().mockResolvedValue({
                    id: 5,
                    status: TeacherStudentRequestStatus.PENDING,
                }),
                upsert: vi.fn(),
            },
        };
        const prisma = {
            $transaction: vi.fn(
                async (callback: (client: typeof transaction) => unknown) =>
                    callback(transaction),
            ),
        } as unknown as PrismaService;
        const service = new TeachersService(
            prisma,
            notifications,
            applicantAccess(),
        );
        const result = await service.sendRequest(student, {
            teacher_id: 7,
            subject_id: 11,
            message: 'Хочу заниматься',
        });

        expect(result).toMatchObject({
            message: 'Заявка уже отправлена преподавателю',
            request: { id: 5, status: 'pending' },
        });
        expect(transaction.teacherStudentRequest.upsert).not.toHaveBeenCalled();
        expect(notifications.create).toHaveBeenCalledWith(
            transaction,
            expect.objectContaining({
                userId: 7,
                targetSection: 'students',
                targetEntityId: 5,
            }),
        );
    });

    it('creates a parent request for a verified linked child', async () => {
        const upsert = vi.fn().mockResolvedValue({
            id: 8,
            status: TeacherStudentRequestStatus.PENDING,
        });
        const transaction = {
            user: {
                findUnique: vi.fn().mockResolvedValue({
                    fullName: 'Пётр Ученик',
                }),
            },
            teacherProfile: {
                findFirst: vi.fn().mockResolvedValue({
                    userId: 7,
                    user: {
                        teacherSubjects: [{
                            subject: { name: 'Английский язык' },
                        }],
                    },
                }),
            },
            teacherStudent: {
                findUnique: vi.fn().mockResolvedValue(null),
            },
            teacherStudentRequest: {
                findUnique: vi.fn().mockResolvedValue(null),
                upsert,
            },
        };
        const prisma = {
            $transaction: vi.fn(
                async (callback: (client: typeof transaction) => unknown) =>
                    callback(transaction),
            ),
        } as unknown as PrismaService;
        const service = new TeachersService(
            prisma,
            notifications,
            applicantAccess(),
        );

        await expect(service.sendRequest(parent, {
            teacher_id: 7,
            subject_id: 11,
            student_id: 15,
            message: 'Нужна подготовка к экзамену',
        })).resolves.toMatchObject({
            success: true,
            request: { id: 8, status: 'pending' },
        });
        expect(parentChildAccess.hasCurrentMinorAccessIn).toHaveBeenCalledWith(
            transaction,
            10,
            15,
        );
        expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
            create: expect.objectContaining({ studentId: 15 }),
        }));
    });

    it('rejects a parent request when current child access is lost', async () => {
        const transaction = {};
        const prisma = {
            $transaction: vi.fn(
                async (callback: (client: typeof transaction) => unknown) =>
                    callback(transaction),
            ),
        } as unknown as PrismaService;
        const access = {
            hasCurrentMinorAccessIn: vi.fn().mockResolvedValue(false),
        } as unknown as ParentChildAccessService;
        const service = new TeachersService(
            prisma,
            notifications,
            applicantAccess(access),
        );

        await expect(service.sendRequest(parent, {
            teacher_id: 7,
            subject_id: 11,
            student_id: 15,
        })).rejects.toBeInstanceOf(ForbiddenException);
        expect(access.hasCurrentMinorAccessIn).toHaveBeenCalledWith(
            transaction,
            parent.id,
            15,
        );
    });
});
