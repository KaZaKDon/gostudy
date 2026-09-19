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

describe('TeachersService', () => {
    it('returns only public verified teacher cards', async () => {
        const prisma = {
            teacherProfile: {
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
                        introVideoUrl: null,
                        rating: 4.9,
                        reviewsCount: 12,
                        price45: 900,
                        price60: 1_100,
                        price90: null,
                        createdAt: new Date(),
                        user: {
                            fullName: 'Анна Учитель',
                            avatarUrl: null,
                            phone: null,
                            emailVerifiedAt: new Date(),
                            lastLoginAt: new Date(),
                            createdAt: new Date(),
                            teacherEducation: [],
                            teacherSubjects: [
                                { subject: { name: 'Английский язык' } },
                            ],
                        },
                    },
                ]),
            },
            lesson: {
                groupBy: vi.fn().mockResolvedValue([{
                    teacherId: 7,
                    _count: { _all: 30 },
                }]),
                findMany: vi.fn().mockResolvedValue([]),
            },
            subject: {
                findMany: vi.fn().mockResolvedValue([{
                    id: 11,
                    name: 'Английский язык',
                }]),
            },
            learningMaterial: { findMany: vi.fn().mockResolvedValue([]) },
            review: { findMany: vi.fn().mockResolvedValue([]) },
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
                rank: 1,
                completed_lessons_count: 30,
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

    it('creates a parent request for a verified linked child', async () => {
        const upsert = vi.fn().mockResolvedValue({
            id: 8,
            status: TeacherStudentRequestStatus.PENDING,
        });
        const transaction = {
            parentChildProfile: {
                findFirst: vi.fn().mockResolvedValue({ studentId: 15 }),
            },
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
        const service = new TeachersService(prisma, notifications);

        await expect(service.sendRequest(parent, {
            teacher_id: 7,
            subject_id: 11,
            student_id: 15,
            message: 'Нужна подготовка к экзамену',
        })).resolves.toMatchObject({
            success: true,
            request: { id: 8, status: 'pending' },
        });
        expect(transaction.parentChildProfile.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    parentId: 10,
                    studentId: 15,
                }),
            }),
        );
        expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
            create: expect.objectContaining({ studentId: 15 }),
        }));
    });

    it('loads pending requests for the child selected by a parent', async () => {
        const prisma = {
            teacherProfile: {
                findFirst: vi.fn().mockResolvedValue({
                    userId: 7,
                    firstName: 'Анна',
                    lastName: 'Учитель',
                    slug: 'teacher-7',
                    city: 'Москва',
                    headline: 'Английский язык',
                    experienceYears: 8,
                    about: 'Описание',
                    teachingMethod: null,
                    firstLessonDescription: null,
                    studentGets: null,
                    pricingComment: null,
                    trialLessonEnabled: false,
                    scheduleDescription: null,
                    accessibilityComment: null,
                    introVideoUrl: null,
                    rating: 4.9,
                    reviewsCount: 12,
                    price45: 900,
                    price60: 1_100,
                    price90: null,
                    user: {
                        fullName: 'Анна Учитель',
                        avatarUrl: null,
                        teacherSubjects: [{
                            subject: {
                                id: 11,
                                name: 'Английский язык',
                                slug: 'english',
                            },
                        }],
                        teacherSubjectPreparations: [],
                        teacherAgeGroups: [],
                        teacherEducation: [],
                        reviewsAsTeacher: [],
                        accessibilityOffers: [],
                    },
                }),
            },
            parentChildProfile: {
                findFirst: vi.fn().mockResolvedValue({ studentId: 15 }),
            },
            teacherStudentRequest: {
                findMany: vi.fn().mockResolvedValue([{ subjectId: 11 }]),
            },
            teacherStudent: {
                findMany: vi.fn().mockResolvedValue([]),
            },
        } as unknown as PrismaService;
        const service = new TeachersService(prisma, notifications);

        await expect(service.getTeacher(parent, 7, 15)).resolves.toMatchObject({
            teacher: {
                teacher_id: 7,
                pending_subject_ids: [11],
                active_subject_ids: [],
            },
        });
        expect(prisma.teacherStudentRequest.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ studentId: 15 }),
            }),
        );
    });
});
