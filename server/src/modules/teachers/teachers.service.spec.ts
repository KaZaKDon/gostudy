import { describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
    TeacherStudentRequestStatus,
    TeacherVerificationStatus,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { NotificationsService } from '../notifications/notifications.service';
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

const notifications = {
    create: vi.fn().mockResolvedValue(undefined),
} as unknown as NotificationsService;

describe('TeachersService', () => {
    it('returns only public verified teacher cards', async () => {
        const prisma = {
            teacherProfile: {
                count: vi.fn().mockResolvedValue(1),
                findMany: vi.fn().mockResolvedValue([
                    {
                        userId: 7,
                        firstName: 'Анна',
                        lastName: 'Учитель',
                        slug: 'teacher-7',
                        city: 'Москва',
                        headline: 'Английский язык',
                        experienceYears: 8,
                        accessibilityEnabled: false,
                        price45: 900,
                        price60: 1_100,
                        price90: null,
                        createdAt: new Date(),
                        user: {
                            fullName: 'Анна Учитель',
                            avatarUrl: null,
                            teacherSubjects: [
                                { subject: { name: 'Английский язык' } },
                            ],
                        },
                    },
                ]),
            },
        } as unknown as PrismaService;
        const service = new TeachersService(prisma, notifications);
        const result = await service.findTeachers(student, {
            search: 'английский',
            page: 1,
        });

        expect(result.teachers).toEqual([
            expect.objectContaining({
                teacher_id: 7,
                name: 'Анна Учитель',
                price_from: 900,
                is_verified: true,
            }),
        ]);
        expect(prisma.teacherProfile.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    isVisible: true,
                    verificationStatus: TeacherVerificationStatus.VERIFIED,
                }),
            }),
        );
    });

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
        const service = new TeachersService(prisma, notifications);
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
});
