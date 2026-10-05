import { describe, expect, it, vi } from 'vitest';

import { ParentChildAccessService } from '../../common/access/parent-child-access.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
    TeacherVerificationStatus,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { TeacherApplicantAccessService } from './teacher-applicant-access.service';
import { TeacherDirectoryService } from './teacher-directory.service';

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

const parentChildAccess = {
    hasCurrentMinorAccessIn: vi.fn().mockResolvedValue(true),
} as unknown as ParentChildAccessService;

function directory(prisma: PrismaService): TeacherDirectoryService {
    return new TeacherDirectoryService(
        prisma,
        new TeacherApplicantAccessService(parentChildAccess),
    );
}

describe('TeacherDirectoryService', () => {
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
                        introVideoUrl: null,
                        rating: 4.9,
                        reviewsCount: 12,
                        price45: 900,
                        price60: 1_100,
                        price90: null,
                        verificationStatus: TeacherVerificationStatus.VERIFIED,
                        createdAt: new Date(),
                        user: {
                            fullName: 'Анна Учитель',
                            avatarUrl: null,
                            phone: null,
                            emailVerifiedAt: new Date(),
                            lastLoginAt: new Date(),
                            createdAt: new Date(),
                            teacherEducation: [],
                            teacherDocuments: [],
                            teacherSubjects: [
                                {
                                    subjectId: 11,
                                    subject: { name: 'Английский язык' },
                                },
                            ],
                            teacherSubjectPreparations: [],
                            teacherAgeGroups: [],
                            accessibilityOffers: [],
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
            preparation: { findMany: vi.fn().mockResolvedValue([]) },
            studentAgeGroup: { findMany: vi.fn().mockResolvedValue([]) },
            learningMaterial: { findMany: vi.fn().mockResolvedValue([]) },
            review: { findMany: vi.fn().mockResolvedValue([]) },
        } as unknown as PrismaService;
        const result = await directory(prisma).findTeachers(student, {
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
        expect(result.promoted_teachers).toEqual([]);
        expect(prisma.teacherProfile.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    isVisible: true,
                    verificationStatus: TeacherVerificationStatus.VERIFIED,
                }),
            }),
        );
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
                        teacherDocuments: [],
                        reviewsAsTeacher: [],
                        accessibilityOffers: [],
                    },
                }),
            },
            teacherStudentRequest: {
                findMany: vi.fn().mockResolvedValue([{ subjectId: 11 }]),
            },
            teacherStudent: {
                findMany: vi.fn().mockResolvedValue([]),
            },
        } as unknown as PrismaService;

        await expect(directory(prisma).getTeacher(parent, 7, 15))
            .resolves.toMatchObject({
                teacher: {
                    teacher_id: 7,
                    pending_subject_ids: [11],
                    active_subject_ids: [],
                },
            });
        expect(parentChildAccess.hasCurrentMinorAccessIn).toHaveBeenCalledWith(
            prisma,
            10,
            15,
        );
        expect(prisma.teacherStudentRequest.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ studentId: 15 }),
            }),
        );
    });
});
