import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import {
    AccessibilityApplicationStatus,
    AccessibilityOfferStatus,
    LessonChangeStatus,
    LessonChangeType,
    LessonStatus,
    MaterialCategory,
    MaterialPublicationStatus,
    ParentChildVerificationStatus,
    ParentStudentStatus,
    TeacherDocumentStatus,
    TeacherDocumentType,
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
import { teacherBadgeKeys } from './teacher-badges';
import { rankTeachers } from './teacher-ranking';

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
        this.requireSearchUser(user);
        const search = query.search?.trim() || '';
        const page = query.page || 1;
        const where = {
            isVisible: true,
            verificationStatus: TeacherVerificationStatus.VERIFIED,
            user: {
                role: UserRole.TEACHER,
                status: UserStatus.ACTIVE,
                ...(query.subject_id ? {
                    teacherSubjects: {
                        some: {
                            subjectId: query.subject_id,
                            subject: { isActive: true },
                        },
                    },
                } : {}),
            },
        };
        const [profiles, lessonGroups, subjects] = await Promise.all([
            this.prisma.teacherProfile.findMany({
                where,
                include: {
                    user: {
                        select: {
                            fullName: true,
                            avatarUrl: true,
                            phone: true,
                            emailVerifiedAt: true,
                            lastLoginAt: true,
                            createdAt: true,
                            teacherEducation: { select: { id: true }, take: 1 },
                            teacherDocuments: {
                                where: {
                                    status: TeacherDocumentStatus.APPROVED,
                                    type: TeacherDocumentType.DIPLOMA,
                                },
                                select: { id: true },
                                take: 1,
                            },
                            teacherSubjects: {
                                where: { subject: { isActive: true } },
                                orderBy: { subject: { name: 'asc' } },
                                include: { subject: true },
                            },
                            accessibilityOffers: {
                                where: {
                                    status: AccessibilityOfferStatus.APPROVED,
                                    archivedAt: null,
                                },
                                include: {
                                    subjects: { select: { subjectId: true } },
                                    applications: {
                                        where: {
                                            OR: [
                                                { status: AccessibilityApplicationStatus.CONFIRMED },
                                                {
                                                    status: AccessibilityApplicationStatus.ACCEPTED,
                                                    confirmationExpiresAt: { gt: new Date() },
                                                },
                                            ],
                                        },
                                        select: { id: true },
                                    },
                                },
                            },
                        },
                    },
                },
            }),
            this.prisma.lesson.groupBy({
                by: ['teacherId'],
                where: {
                    status: LessonStatus.COMPLETED,
                    ...(query.subject_id ? { subjectId: query.subject_id } : {}),
                },
                _count: { _all: true },
            }),
            this.prisma.subject.findMany({
                where: { isActive: true },
                orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
                select: { id: true, name: true },
            }),
        ]);
        const lessonCounts = new Map(
            lessonGroups.map((item) => [item.teacherId, item._count._all]),
        );
        const ranked = rankTeachers(profiles.map((profile) => ({
            teacherId: profile.userId,
            rating: Number(profile.rating),
            reviewsCount: profile.reviewsCount,
            completedLessonsCount: lessonCounts.get(profile.userId) ?? 0,
        })));
        const rankByTeacher = new Map(
            ranked.map((item) => [item.teacherId, item]),
        );
        const normalizedSearch = search.toLocaleLowerCase('ru-RU');
        const filtered = profiles
            .filter((profile) => {
                const hasAvailableOffer = (profile.user.accessibilityOffers ?? []).some(
                    (offer) => (
                        offer.applications.length < offer.slots
                        && (!query.subject_id || offer.subjects.some(
                            (link) => link.subjectId === query.subject_id,
                        ))
                    ),
                );
                if (query.accessible_only === 'true' && !hasAvailableOffer) {
                    return false;
                }
                if (!normalizedSearch) return true;
                return [
                    profile.firstName,
                    profile.lastName,
                    profile.user.fullName,
                    profile.headline,
                    profile.city,
                    ...profile.user.teacherSubjects.map((link) => link.subject.name),
                ].some((value) => value?.toLocaleLowerCase('ru-RU').includes(normalizedSearch));
            })
            .sort((left, right) => (
                (rankByTeacher.get(left.userId)?.rank ?? Number.MAX_SAFE_INTEGER)
                - (rankByTeacher.get(right.userId)?.rank ?? Number.MAX_SAFE_INTEGER)
                || left.userId - right.userId
            ));
        const total = filtered.length;
        const pageProfiles = filtered.slice(
            (page - 1) * PAGE_SIZE,
            page * PAGE_SIZE,
        );
        const pageIds = pageProfiles.map((profile) => profile.userId);
        const badgeFacts = await this.loadBadgeFacts(pageIds);

        return {
            success: true,
            teachers: pageProfiles.map((profile) => {
                const accessibilityEnabled = (profile.user.accessibilityOffers ?? [])
                    .some((offer) => offer.applications.length < offer.slots);
                return {
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
                rank: rankByTeacher.get(profile.userId)?.rank ?? null,
                rank_scope: query.subject_id ? 'subject' : 'overall',
                completed_lessons_count: lessonCounts.get(profile.userId) ?? 0,
                is_verified: true,
                accessibility_enabled: accessibilityEnabled,
                price_from: this.minimumPrice(profile),
                subjects: profile.user.teacherSubjects.map(
                    (link) => link.subject.name,
                ),
                badges: teacherBadgeKeys({
                    ...profile,
                    accessibilityEnabled,
                }, {
                    rank: rankByTeacher.get(profile.userId)?.rank ?? null,
                    completedLessons: lessonCounts.get(profile.userId) ?? 0,
                    ...badgeFacts.get(profile.userId),
                }),
            };
            }),
            filters: {
                selected_subject_id: query.subject_id ?? null,
                subjects,
            },
            pagination: {
                page,
                limit: PAGE_SIZE,
                total,
                pages: total > 0 ? Math.ceil(total / PAGE_SIZE) : 0,
            },
        };
    }

    private async loadBadgeFacts(teacherIds: number[]) {
        const result = new Map<number, {
            materialCategories: Set<MaterialCategory>;
            recentRatings: number[];
            reliable: boolean;
        }>();
        if (!teacherIds.length) return result;

        const [materials, reviews, lessons] = await Promise.all([
            this.prisma.learningMaterial.findMany({
                where: {
                    creatorId: { in: teacherIds },
                    publicationStatus: MaterialPublicationStatus.APPROVED,
                },
                select: { creatorId: true, category: true },
            }),
            this.prisma.review.findMany({
                where: {
                    teacherId: { in: teacherIds },
                    publishedAt: { not: null },
                    publishedRating: { not: null },
                },
                orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
                select: { teacherId: true, publishedRating: true },
            }),
            this.prisma.lesson.findMany({
                where: {
                    teacherId: { in: teacherIds },
                    status: { in: [LessonStatus.COMPLETED, LessonStatus.CANCELLED] },
                },
                orderBy: [{ lessonDate: 'desc' }, { id: 'desc' }],
                select: {
                    id: true,
                    teacherId: true,
                    status: true,
                    changeRequests: {
                        where: {
                            requestType: LessonChangeType.CANCEL,
                            status: LessonChangeStatus.APPROVED,
                        },
                        select: { requestedRole: true },
                    },
                },
            }),
        ]);

        for (const teacherId of teacherIds) {
            const teacherLessons = lessons
                .filter((lesson) => lesson.teacherId === teacherId)
                .slice(0, 60);
            let completed = 0;
            let reliable = true;
            for (const lesson of teacherLessons) {
                if (lesson.status === LessonStatus.COMPLETED) {
                    completed += 1;
                    if (completed >= 30) break;
                } else if (!lesson.changeRequests.some(
                    (request) => request.requestedRole === UserRole.STUDENT,
                )) {
                    reliable = false;
                    break;
                }
            }
            result.set(teacherId, {
                materialCategories: new Set(
                    materials
                        .filter((item) => item.creatorId === teacherId)
                        .map((item) => item.category),
                ),
                recentRatings: reviews
                    .filter((review) => review.teacherId === teacherId)
                    .slice(0, 30)
                    .map((review) => Number(review.publishedRating)),
                reliable: reliable && completed >= 30,
            });
        }
        return result;
    }

    async getTeacher(
        user: SessionUser,
        teacherId: number,
        requestedStudentId?: number,
    ): Promise<Record<string, unknown>> {
        this.requireSearchUser(user);
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
                        teacherDocuments: {
                            where: {
                                status: TeacherDocumentStatus.APPROVED,
                            },
                            orderBy: [
                                { sortOrder: 'asc' },
                                { id: 'asc' },
                            ],
                            select: {
                                id: true,
                                type: true,
                                documentTitle: true,
                                institution: true,
                                documentYear: true,
                                checkedAt: true,
                            },
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
                        accessibilityOffers: {
                            where: {
                                status: AccessibilityOfferStatus.APPROVED,
                                archivedAt: null,
                            },
                            orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
                            include: {
                                subjects: {
                                    orderBy: { subject: { sortOrder: 'asc' } },
                                    include: { subject: true },
                                },
                                applications: {
                                    where: {
                                        OR: [
                                            { status: AccessibilityApplicationStatus.CONFIRMED },
                                            {
                                                status: AccessibilityApplicationStatus.ACCEPTED,
                                                confirmationExpiresAt: { gt: new Date() },
                                            },
                                        ],
                                    },
                                    select: { id: true },
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

        let applicantStudentId: number | null = null;
        if (user.role === UserRole.STUDENT) {
            applicantStudentId = user.id;
        } else if (requestedStudentId) {
            applicantStudentId = await this.resolveParentStudent(
                this.prisma,
                user,
                requestedStudentId,
            );
        }

        const [pending, active] = applicantStudentId
            ? await Promise.all([
            this.prisma.teacherStudentRequest.findMany({
                where: {
                    studentId: applicantStudentId,
                    teacherId,
                    status: TeacherStudentRequestStatus.PENDING,
                },
                select: { subjectId: true },
            }),
            this.prisma.teacherStudent.findMany({
                where: {
                    studentId: applicantStudentId,
                    teacherId,
                    status: TeacherStudentStatus.ACTIVE,
                },
                select: { subjectId: true },
            }),
            ])
            : [[], []];
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
                accessibility_enabled: (profile.user.accessibilityOffers ?? [])
                    .some((offer) => offer.applications.length < offer.slots),
                accessibility_comment: profile.accessibilityComment,
                accessibility_offers: (profile.user.accessibilityOffers ?? [])
                    .filter((offer) => offer.applications.length < offer.slots)
                    .map((offer) => ({
                        id: offer.id,
                        offer_type: offer.offerType.toLowerCase(),
                        slots_available: offer.slots - offer.applications.length,
                        discount_percent: offer.discountPercent,
                        default_duration_months: offer.defaultDurationMonths,
                        comment: offer.comment,
                        subjects: offer.subjects.map((link) => ({
                            id: link.subject.id,
                            name: link.subject.name,
                        })),
                    })),
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
                documents: (profile.user.teacherDocuments ?? []).map((document) => ({
                    id: document.id,
                    type: document.type.toLowerCase(),
                    document_title: document.documentTitle,
                    institution: document.institution,
                    document_year: document.documentYear,
                    checked_at: document.checkedAt,
                })),
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
        this.requireSearchUser(user);
        const message = input.message?.trim() || null;

        return this.prisma.$transaction(async (transaction) => {
            const studentId = user.role === UserRole.STUDENT
                ? user.id
                : await this.resolveParentStudent(
                    transaction,
                    user,
                    input.student_id,
                );
            const applicantName = user.role === UserRole.PARENT
                ? await this.studentName(transaction, studentId)
                : user.fullName || 'Ученик';
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
                        studentId,
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
                        studentId,
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
                    message: `${applicantName} — заявка по предмету «${subjectName}»${user.role === UserRole.PARENT ? ` от родителя ${user.fullName || ''}` : ''}.`,
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
                        studentId,
                        subjectId: input.subject_id,
                    },
                },
                update: {
                    message,
                    status: TeacherStudentRequestStatus.PENDING,
                },
                create: {
                    teacherId: input.teacher_id,
                    studentId,
                    subjectId: input.subject_id,
                    message,
                },
            });

            await this.notifications.create(transaction, {
                userId: input.teacher_id,
                type: 'teacher_request',
                title: 'Новая заявка на обучение',
                message: `${applicantName} — заявка по предмету «${subjectName}»${user.role === UserRole.PARENT ? ` от родителя ${user.fullName || ''}` : ''}.`,
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

    private requireSearchUser(user: SessionUser): void {
        if (user.role !== UserRole.STUDENT && user.role !== UserRole.PARENT) {
            throw new ForbiddenException(
                'Поиск преподавателя доступен ученику или родителю',
            );
        }
    }

    private async resolveParentStudent(
        database: PrismaService | Prisma.TransactionClient,
        user: SessionUser,
        requestedStudentId?: number,
    ): Promise<number> {
        if (user.role !== UserRole.PARENT || !requestedStudentId) {
            throw new BadRequestException('Выберите ребёнка');
        }

        const child = await database.parentChildProfile.findFirst({
            where: {
                parentId: user.id,
                studentId: requestedStudentId,
                archivedAt: null,
                verificationStatus: ParentChildVerificationStatus.VERIFIED,
                student: {
                    childLinks: {
                        some: {
                            parentId: user.id,
                            status: ParentStudentStatus.ACTIVE,
                        },
                    },
                },
            },
            select: { studentId: true },
        });

        if (!child?.studentId) {
            throw new ForbiddenException(
                'Ребёнок не подтверждён или не привязан',
            );
        }

        return child.studentId;
    }

    private async studentName(
        database: Prisma.TransactionClient,
        studentId: number,
    ): Promise<string> {
        const student = await database.user.findUnique({
            where: { id: studentId },
            select: { fullName: true },
        });
        return student?.fullName || 'Ученик';
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
