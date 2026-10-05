import { Injectable, NotFoundException } from '@nestjs/common';

import { publicTeacherProfileWhere } from '../../common/access/teacher-publication-policy';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
    AccessibilityApplicationStatus,
    AccessibilityOfferStatus,
    LessonChangeStatus,
    LessonChangeType,
    LessonStatus,
    MaterialCategory,
    MaterialPublicationStatus,
    TeacherDocumentStatus,
    TeacherDocumentType,
    TeacherStudentRequestStatus,
    TeacherStudentStatus,
    UserRole,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import type { FindTeachersQueryDto } from './dto/find-teachers-query.dto';
import { TeacherApplicantAccessService } from './teacher-applicant-access.service';
import { teacherBadgeKeys } from './teacher-badges';
import {
    matchesTeacherDirectoryFilters,
    teacherDirectoryCities,
} from './teacher-directory-filters';
import {
    teacherDisplayName,
    teacherLessonFormats,
    toTeacherSearchCard,
} from './teacher-public-profile.mapper';
import { rankTeachers } from './teacher-ranking';

const PAGE_SIZE = 12;

@Injectable()
export class TeacherDirectoryService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly applicantAccess: TeacherApplicantAccessService,
    ) {}

    async findTeachers(
        user: SessionUser,
        query: FindTeachersQueryDto,
    ): Promise<Record<string, unknown>> {
        this.applicantAccess.assertCanBrowse(user);
        const search = query.search?.trim() || '';
        const page = query.page || 1;
        const where = publicTeacherProfileWhere(query.subject_id ? {
            teacherSubjects: {
                some: {
                    subjectId: query.subject_id,
                    subject: { isActive: true },
                },
            },
        } : {});
        const [
            profiles,
            lessonGroups,
            subjects,
            preparations,
            ageGroups,
        ] = await Promise.all([
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
                            teacherSubjectPreparations: {
                                where: {
                                    subject: { isActive: true },
                                    preparation: {
                                        isActive: true,
                                        group: { isActive: true },
                                    },
                                },
                                select: {
                                    subjectId: true,
                                    preparationId: true,
                                    preparation: { select: { name: true } },
                                },
                            },
                            teacherAgeGroups: {
                                where: { ageGroup: { isActive: true } },
                                select: { ageGroupId: true },
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
            this.prisma.preparation.findMany({
                where: {
                    isActive: true,
                    group: { isActive: true },
                },
                orderBy: [
                    { group: { sortOrder: 'asc' } },
                    { sortOrder: 'asc' },
                    { name: 'asc' },
                ],
                select: {
                    id: true,
                    name: true,
                    subjects: {
                        where: { subject: { isActive: true } },
                        select: { subjectId: true },
                    },
                },
            }),
            this.prisma.studentAgeGroup.findMany({
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
        const cities = teacherDirectoryCities([
            ...profiles,
            { city: query.city?.trim() || null },
        ]);
        const filtered = profiles
            .filter((profile) => {
                const hasAvailableOffer = this.hasAvailableAccessibilityOffer(
                    profile.user.accessibilityOffers,
                    query.subject_id,
                );
                if (query.accessible_only === 'true' && !hasAvailableOffer) {
                    return false;
                }
                if (!matchesTeacherDirectoryFilters(profile, query)) {
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
                    ...profile.user.teacherSubjectPreparations.map(
                        (link) => link.preparation.name,
                    ),
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
            promoted_teachers: [],
            teachers: pageProfiles.map((profile) => {
                const rank = rankByTeacher.get(profile.userId)?.rank ?? null;
                const completedLessonsCount = lessonCounts.get(profile.userId) ?? 0;
                const accessibilityEnabled = this.hasAvailableAccessibilityOffer(
                    profile.user.accessibilityOffers,
                );
                const badges = teacherBadgeKeys({
                    ...profile,
                    accessibilityEnabled,
                }, {
                    rank,
                    completedLessons: completedLessonsCount,
                    ...badgeFacts.get(profile.userId),
                });

                return toTeacherSearchCard(profile, {
                    rank,
                    rankScope: query.subject_id ? 'subject' : 'overall',
                    completedLessonsCount,
                    accessibilityEnabled,
                    badges,
                });
            }),
            filters: {
                selected_subject_id: query.subject_id ?? null,
                selected_preparation_id: query.preparation_id ?? null,
                selected_age_group_id: query.age_group_id ?? null,
                selected_city: query.city?.trim() || null,
                selected_min_experience: query.min_experience ?? null,
                selected_max_price: query.max_price ?? null,
                selected_min_rating: query.min_rating ?? null,
                subjects,
                preparations: preparations.map((preparation) => ({
                    id: preparation.id,
                    name: preparation.name,
                    subject_ids: preparation.subjects.map(
                        (link) => link.subjectId,
                    ),
                })),
                age_groups: ageGroups,
                cities,
            },
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
        requestedStudentId?: number,
    ): Promise<Record<string, unknown>> {
        this.applicantAccess.assertCanBrowse(user);
        const profile = await this.prisma.teacherProfile.findFirst({
            where: {
                userId: teacherId,
                ...publicTeacherProfileWhere(),
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

        const applicantStudentId = await this.applicantAccess
            .resolveOptionalStudentId(
                this.prisma,
                user,
                requestedStudentId,
            );
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
                name: teacherDisplayName(profile),
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
                accessibility_enabled: this.hasAvailableAccessibilityOffer(
                    profile.user.accessibilityOffers,
                ),
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
                formats: teacherLessonFormats(profile),
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

    private hasAvailableAccessibilityOffer(
        offers: Array<{
            slots: number;
            applications: unknown[];
            subjects?: Array<{ subjectId: number }>;
        }>,
        subjectId?: number,
    ): boolean {
        return offers.some((offer) => (
            offer.applications.length < offer.slots
            && (!subjectId || offer.subjects?.some(
                (link) => link.subjectId === subjectId,
            ))
        ));
    }
}
