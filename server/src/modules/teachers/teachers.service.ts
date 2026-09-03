import {
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
    TeacherStudentRequestStatus,
    TeacherStudentStatus,
    TeacherVerificationStatus,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { NotificationsService } from '../notifications/notifications.service';
import type { FindTeachersQueryDto } from './dto/find-teachers-query.dto';
import type { SendTeacherRequestDto } from './dto/send-teacher-request.dto';

const PAGE_SIZE = 12;

@Injectable()
export class TeachersService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly notifications: NotificationsService,
    ) {}

    async findTeachers(
        user: SessionUser,
        query: FindTeachersQueryDto,
    ): Promise<Record<string, unknown>> {
        this.requireStudent(user);
        const search = query.search?.trim() || '';
        const page = query.page || 1;
        const searchFilter = search
            ? {
                OR: [
                    { firstName: { contains: search, mode: 'insensitive' as const } },
                    { lastName: { contains: search, mode: 'insensitive' as const } },
                    { headline: { contains: search, mode: 'insensitive' as const } },
                    { city: { contains: search, mode: 'insensitive' as const } },
                    {
                        user: {
                            teacherSubjects: {
                                some: {
                                    subject: {
                                        name: {
                                            contains: search,
                                            mode: 'insensitive' as const,
                                        },
                                    },
                                },
                            },
                        },
                    },
                ],
            }
            : {};
        const where = {
            isVisible: true,
            verificationStatus: TeacherVerificationStatus.VERIFIED,
            user: {
                role: UserRole.TEACHER,
                status: UserStatus.ACTIVE,
            },
            ...searchFilter,
        };
        const [total, profiles] = await Promise.all([
            this.prisma.teacherProfile.count({ where }),
            this.prisma.teacherProfile.findMany({
                where,
                skip: (page - 1) * PAGE_SIZE,
                take: PAGE_SIZE,
                orderBy: [
                    { createdAt: 'desc' },
                    { userId: 'desc' },
                ],
                include: {
                    user: {
                        select: {
                            fullName: true,
                            avatarUrl: true,
                            teacherSubjects: {
                                where: { subject: { isActive: true } },
                                orderBy: { subject: { name: 'asc' } },
                                include: { subject: true },
                            },
                        },
                    },
                },
            }),
        ]);

        return {
            success: true,
            teachers: profiles.map((profile) => ({
                teacher_id: profile.userId,
                first_name: profile.firstName,
                last_name: profile.lastName,
                name: this.teacherName(profile),
                slug: profile.slug,
                photo_url: profile.user.avatarUrl,
                city: profile.city,
                headline: profile.headline,
                experience_years: profile.experienceYears,
                rating: Number(profile.rating),
                reviews_count: profile.reviewsCount,
                is_verified: true,
                accessibility_enabled: profile.accessibilityEnabled,
                price_from: this.minimumPrice(profile),
                subjects: profile.user.teacherSubjects.map(
                    (link) => link.subject.name,
                ),
            })),
            pagination: {
                page,
                limit: PAGE_SIZE,
                total,
                pages: total > 0 ? Math.ceil(total / PAGE_SIZE) : 0,
            },
        };
    }

    async getTeacher(
        user: SessionUser,
        teacherId: number,
    ): Promise<Record<string, unknown>> {
        this.requireStudent(user);
        const profile = await this.prisma.teacherProfile.findFirst({
            where: {
                userId: teacherId,
                isVisible: true,
                verificationStatus: TeacherVerificationStatus.VERIFIED,
                user: {
                    role: UserRole.TEACHER,
                    status: UserStatus.ACTIVE,
                },
            },
            include: {
                user: {
                    include: {
                        teacherSubjects: {
                            where: { subject: { isActive: true } },
                            orderBy: { subject: { sortOrder: 'asc' } },
                            include: { subject: true },
                        },
                        teacherSubjectPreparations: {
                            where: { preparation: { isActive: true } },
                            include: { preparation: true },
                        },
                        teacherAgeGroups: {
                            where: { ageGroup: { isActive: true } },
                            orderBy: { ageGroup: { sortOrder: 'asc' } },
                            include: { ageGroup: true },
                        },
                        teacherEducation: {
                            orderBy: [
                                { isPrimary: 'desc' },
                                { sortOrder: 'asc' },
                                { id: 'asc' },
                            ],
                        },
                        reviewsAsTeacher: {
                            where: {
                                publishedAt: { not: null },
                                publishedRating: { not: null },
                            },
                            orderBy: [
                                { publishedAt: 'desc' },
                                { id: 'desc' },
                            ],
                            take: 20,
                            include: {
                                student: {
                                    select: { fullName: true },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!profile) {
            throw new NotFoundException('Преподаватель не найден');
        }

        const [pending, active] = await Promise.all([
            this.prisma.teacherStudentRequest.findMany({
                where: {
                    studentId: user.id,
                    teacherId,
                    status: TeacherStudentRequestStatus.PENDING,
                },
                select: { subjectId: true },
            }),
            this.prisma.teacherStudent.findMany({
                where: {
                    studentId: user.id,
                    teacherId,
                    status: TeacherStudentStatus.ACTIVE,
                },
                select: { subjectId: true },
            }),
        ]);
        const preparations = new Map<number, Array<Record<string, unknown>>>();

        for (const link of profile.user.teacherSubjectPreparations) {
            const items = preparations.get(link.subjectId) ?? [];
            items.push({
                id: link.preparation.id,
                name: link.preparation.name,
                slug: link.preparation.slug,
            });
            preparations.set(link.subjectId, items);
        }

        return {
            success: true,
            teacher: {
                teacher_id: profile.userId,
                first_name: profile.firstName,
                last_name: profile.lastName,
                name: this.teacherName(profile),
                slug: profile.slug,
                photo_url: profile.user.avatarUrl,
                city: profile.city,
                headline: profile.headline,
                experience_years: profile.experienceYears,
                about: profile.about,
                teaching_method: profile.teachingMethod,
                first_lesson_description: profile.firstLessonDescription,
                student_gets: profile.studentGets,
                pricing_comment: profile.pricingComment,
                trial_lesson_enabled: profile.trialLessonEnabled,
                schedule_description: profile.scheduleDescription,
                accessibility_enabled: profile.accessibilityEnabled,
                accessibility_comment: profile.accessibilityComment,
                intro_video_url: profile.introVideoUrl,
                is_verified: true,
                rating: Number(profile.rating),
                reviews_count: profile.reviewsCount,
                subjects: profile.user.teacherSubjects.map((link) => ({
                    id: link.subject.id,
                    name: link.subject.name,
                    slug: link.subject.slug,
                    preparations: preparations.get(link.subject.id) ?? [],
                })),
                age_groups: profile.user.teacherAgeGroups.map((link) => ({
                    id: link.ageGroup.id,
                    name: link.ageGroup.name,
                    slug: link.ageGroup.slug,
                })),
                formats: this.formats(profile),
                education: profile.user.teacherEducation.map((item) => ({
                    institution: item.institution,
                    faculty: item.faculty,
                    speciality: item.speciality,
                    qualification: item.qualification,
                    graduation_year: item.graduationYear,
                    description: item.description,
                    is_primary: item.isPrimary,
                })),
                documents: [],
                reviews: profile.user.reviewsAsTeacher.map((review) => ({
                    id: review.id,
                    rating: review.publishedRating,
                    text: review.publishedText,
                    student_name: review.student.fullName,
                    teacher_reply: review.teacherReply,
                    created_at: review.publishedAt,
                })),
                pending_subject_ids: pending.map((item) => item.subjectId),
                active_subject_ids: active.map((item) => item.subjectId),
            },
        };
    }

    async sendRequest(
        user: SessionUser,
        input: SendTeacherRequestDto,
    ): Promise<Record<string, unknown>> {
        this.requireStudent(user);
        const message = input.message?.trim() || null;

        return this.prisma.$transaction(async (transaction) => {
            const teacher = await transaction.teacherProfile.findFirst({
                where: {
                    userId: input.teacher_id,
                    isVisible: true,
                    verificationStatus: TeacherVerificationStatus.VERIFIED,
                    user: {
                        role: UserRole.TEACHER,
                        status: UserStatus.ACTIVE,
                        teacherSubjects: {
                            some: {
                                subjectId: input.subject_id,
                                subject: { isActive: true },
                            },
                        },
                    },
                },
                select: {
                    userId: true,
                    user: {
                        select: {
                            teacherSubjects: {
                                where: { subjectId: input.subject_id },
                                take: 1,
                                select: {
                                    subject: { select: { name: true } },
                                },
                            },
                        },
                    },
                },
            });

            if (!teacher) {
                throw new NotFoundException(
                    'Преподаватель или выбранный предмет недоступен',
                );
            }

            const activeRelation = await transaction.teacherStudent.findUnique({
                where: {
                    teacherId_studentId_subjectId: {
                        teacherId: input.teacher_id,
                        studentId: user.id,
                        subjectId: input.subject_id,
                    },
                },
            });

            if (activeRelation?.status === TeacherStudentStatus.ACTIVE) {
                throw new ConflictException(
                    'Этот преподаватель уже ведёт у вас выбранный предмет',
                );
            }

            const existing = await transaction.teacherStudentRequest.findUnique({
                where: {
                    teacherId_studentId_subjectId: {
                        teacherId: input.teacher_id,
                        studentId: user.id,
                        subjectId: input.subject_id,
                    },
                },
            });
            const subjectName = teacher.user.teacherSubjects[0]
                ?.subject.name ?? 'выбранному предмету';

            if (existing?.status === TeacherStudentRequestStatus.PENDING) {
                await this.notifications.create(transaction, {
                    userId: input.teacher_id,
                    type: 'teacher_request',
                    title: 'Новая заявка на обучение',
                    message: `${user.fullName || 'Ученик'} отправил(а) заявку по предмету «${subjectName}».`,
                    targetSection: 'students',
                    targetEntityType: 'teacher_request',
                    targetEntityId: existing.id,
                    dedupeKey: `teacher-request:${existing.id}`,
                });

                return {
                    success: true,
                    message: 'Заявка уже отправлена преподавателю',
                    request: {
                        id: existing.id,
                        status: 'pending',
                    },
                };
            }

            const request = await transaction.teacherStudentRequest.upsert({
                where: {
                    teacherId_studentId_subjectId: {
                        teacherId: input.teacher_id,
                        studentId: user.id,
                        subjectId: input.subject_id,
                    },
                },
                update: {
                    message,
                    status: TeacherStudentRequestStatus.PENDING,
                },
                create: {
                    teacherId: input.teacher_id,
                    studentId: user.id,
                    subjectId: input.subject_id,
                    message,
                },
            });

            await this.notifications.create(transaction, {
                userId: input.teacher_id,
                type: 'teacher_request',
                title: 'Новая заявка на обучение',
                message: `${user.fullName || 'Ученик'} отправил(а) заявку по предмету «${subjectName}».`,
                targetSection: 'students',
                targetEntityType: 'teacher_request',
                targetEntityId: request.id,
                dedupeKey: `teacher-request:${request.id}`,
            });

            return {
                success: true,
                message: 'Заявка отправлена преподавателю',
                request: {
                    id: request.id,
                    status: request.status.toLowerCase(),
                },
            };
        }, { isolationLevel: 'Serializable' });
    }

    private requireStudent(user: SessionUser): void {
        if (user.role !== UserRole.STUDENT) {
            throw new ForbiddenException(
                'Раздел доступен только ученику',
            );
        }
    }

    private minimumPrice(profile: {
        price45: unknown;
        price60: unknown;
        price90: unknown;
    }): number | null {
        const prices = [profile.price45, profile.price60, profile.price90]
            .map((price) => Number(price ?? 0))
            .filter((price) => price > 0);

        return prices.length ? Math.min(...prices) : null;
    }

    private formats(profile: {
        price45: unknown;
        price60: unknown;
        price90: unknown;
    }): Array<Record<string, number>> {
        return [
            [45, profile.price45],
            [60, profile.price60],
            [90, profile.price90],
        ].flatMap(([duration, rawPrice]) => {
            const price = Number(rawPrice ?? 0);
            return price > 0 ? [{ duration: Number(duration), price }] : [];
        });
    }

    private teacherName(profile: {
        firstName: string | null;
        lastName: string | null;
        user: { fullName: string | null };
    }): string {
        return [profile.firstName, profile.lastName]
            .filter(Boolean)
            .join(' ')
            || profile.user.fullName
            || 'Преподаватель';
    }
}
