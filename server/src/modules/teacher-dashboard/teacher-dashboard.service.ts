import { ForbiddenException, Injectable } from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
    HomeworkSubmissionStatus,
    LessonChangeStatus,
    LessonChangeType,
    LessonStatus,
    MaterialPublicationStatus,
    TeacherDocumentStatus,
    TeacherDocumentType,
    TeacherStudentStatus,
    TeacherVerificationStatus,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import {
    addCalendarDays,
    formatInTimezone,
    parseCalendarDate,
    resolveTimezone,
    zonedDateTimeToUtc,
} from '../schedule/schedule-time';
import { teacherBadgeKeys } from '../teachers/teacher-badges';
import {
    MIN_REVIEWS_FOR_RANKING,
    rankTeachers,
} from '../teachers/teacher-ranking';

const LESSON_BADGE_THRESHOLDS = [10, 30, 100, 300];
const EXCELLENT_RATING_THRESHOLDS = [10, 30];

@Injectable()
export class TeacherDashboardService {
    constructor(private readonly prisma: PrismaService) {}

    async stats(user: SessionUser) {
        this.requireTeacher(user);

        const profile = await this.prisma.teacherProfile.findUnique({
            where: { userId: user.id },
            select: { timezone: true },
        });
        const timezone = resolveTimezone(profile?.timezone);
        const localDate = formatInTimezone(new Date(), timezone)?.slice(0, 10);
        const today = parseCalendarDate(localDate || '');

        if (!today) {
            throw new Error('Не удалось определить текущую дату преподавателя');
        }

        const tomorrow = addCalendarDays(today, 1);
        const dayStart = zonedDateTimeToUtc(today, timezone);
        const dayEnd = zonedDateTimeToUtc(tomorrow, timezone);
        const [students, lessonsToday, homeworkToReview] = await Promise.all([
            this.prisma.teacherStudent.count({
                where: { teacherId: user.id, status: TeacherStudentStatus.ACTIVE },
            }),
            this.prisma.lesson.count({
                where: {
                    teacherId: user.id,
                    lessonDate: { gte: dayStart, lt: dayEnd },
                    status: { not: LessonStatus.CANCELLED },
                },
            }),
            this.prisma.homeworkSubmission.count({
                where: {
                    status: HomeworkSubmissionStatus.SUBMITTED,
                    homework: { teacherId: user.id },
                },
            }),
        ]);

        return {
            success: true,
            stats: [
                { label: 'учеников', value: students },
                { label: 'уроков сегодня', value: lessonsToday },
                { label: 'работ на проверке', value: homeworkToReview },
            ],
        };
    }

    async rating(user: SessionUser) {
        this.requireTeacher(user);

        const publicWhere = {
            isVisible: true,
            verificationStatus: TeacherVerificationStatus.VERIFIED,
            user: {
                role: UserRole.TEACHER,
                status: UserStatus.ACTIVE,
            },
        };
        const [
            profile,
            publicProfiles,
            completedLessonGroups,
            completedSubjectLessonGroups,
            materials,
            publishedReviews,
            recentLessons,
        ] = await Promise.all([
            this.prisma.teacherProfile.findUnique({
                where: { userId: user.id },
                include: {
                    user: {
                        select: {
                            status: true,
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
                                orderBy: { subject: { sortOrder: 'asc' } },
                                include: { subject: true },
                            },
                        },
                    },
                },
            }),
            this.prisma.teacherProfile.findMany({
                where: publicWhere,
                select: {
                    userId: true,
                    rating: true,
                    reviewsCount: true,
                    user: {
                        select: {
                            teacherSubjects: {
                                where: { subject: { isActive: true } },
                                select: { subjectId: true },
                            },
                        },
                    },
                },
            }),
            this.prisma.lesson.groupBy({
                by: ['teacherId'],
                where: { status: LessonStatus.COMPLETED },
                _count: { _all: true },
            }),
            this.prisma.lesson.groupBy({
                by: ['teacherId', 'subjectId'],
                where: {
                    status: LessonStatus.COMPLETED,
                    subjectId: { not: null },
                },
                _count: { _all: true },
            }),
            this.prisma.learningMaterial.findMany({
                where: {
                    creatorId: user.id,
                    publicationStatus: MaterialPublicationStatus.APPROVED,
                },
                select: { category: true },
            }),
            this.prisma.review.findMany({
                where: {
                    teacherId: user.id,
                    publishedAt: { not: null },
                    publishedRating: { not: null },
                },
                orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
                select: { publishedRating: true },
            }),
            this.prisma.lesson.findMany({
                where: {
                    teacherId: user.id,
                    status: { in: [LessonStatus.COMPLETED, LessonStatus.CANCELLED] },
                },
                orderBy: [{ lessonDate: 'desc' }, { id: 'desc' }],
                select: {
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

        if (!profile) {
            throw new ForbiddenException('Анкета преподавателя не найдена');
        }

        const lessonCountByTeacher = new Map(
            completedLessonGroups.map((item) => [
                item.teacherId,
                item._count._all,
            ]),
        );
        const lessonCountByTeacherSubject = new Map(
            completedSubjectLessonGroups.map((item) => [
                `${item.teacherId}:${item.subjectId}`,
                item._count._all,
            ]),
        );
        const overallRanking = rankTeachers(publicProfiles.map((item) => ({
            teacherId: item.userId,
            rating: Number(item.rating),
            reviewsCount: item.reviewsCount,
            completedLessonsCount: lessonCountByTeacher.get(item.userId) ?? 0,
        })));
        const overallRank = overallRanking.find(
            (item) => item.teacherId === user.id,
        )?.rank ?? null;
        const subjectRanks = profile.user.teacherSubjects.map((link) => {
            const candidates = publicProfiles.filter((item) => (
                item.user.teacherSubjects.some(
                    (subject) => subject.subjectId === link.subjectId,
                )
            ));
            const ranking = rankTeachers(candidates.map((item) => ({
                teacherId: item.userId,
                rating: Number(item.rating),
                reviewsCount: item.reviewsCount,
                completedLessonsCount: lessonCountByTeacherSubject.get(
                    `${item.userId}:${link.subjectId}`,
                ) ?? 0,
            })));

            return {
                subject_id: link.subjectId,
                subject_name: link.subject.name,
                rank: ranking.find((item) => item.teacherId === user.id)?.rank ?? null,
                teachers_count: candidates.length,
            };
        });
        const completedLessons = lessonCountByTeacher.get(user.id) ?? 0;
        const recentRatings = publishedReviews.map(
            (review) => Number(review.publishedRating),
        );
        const excellentRatingStreak = this.leadingFiveRatingCount(recentRatings);
        const reliable = this.hasReliableLessonSeries(recentLessons);
        const badges = teacherBadgeKeys(profile, {
            rank: overallRank,
            completedLessons,
            materialCategories: new Set(materials.map((item) => item.category)),
            recentRatings,
            reliable,
        });
        const rankingAvailable = profile.isVisible
            && profile.verificationStatus === TeacherVerificationStatus.VERIFIED
            && profile.user.status === UserStatus.ACTIVE
            && profile.reviewsCount >= MIN_REVIEWS_FOR_RANKING;
        const rankingUnavailableReason = profile.isVisible
            && profile.verificationStatus === TeacherVerificationStatus.VERIFIED
            && profile.user.status === UserStatus.ACTIVE
            && profile.reviewsCount < MIN_REVIEWS_FOR_RANKING
            ? `Место в рейтинге появится после ${MIN_REVIEWS_FOR_RANKING} опубликованных отзывов`
            : this.rankingUnavailableReason(profile);

        return {
            success: true,
            rating: {
                ranking_available: rankingAvailable,
                ranking_unavailable_reason: rankingAvailable
                    ? null
                    : rankingUnavailableReason,
                overall_rank: overallRank,
                teachers_count: publicProfiles.length,
                average_rating: profile.reviewsCount > 0
                    ? Number(profile.rating)
                    : null,
                reviews_count: profile.reviewsCount,
                completed_lessons_count: completedLessons,
                subject_ranks: subjectRanks,
                badges,
                next_achievements: [
                    this.nextAchievement(
                        'platform_lessons',
                        'Уроки на GoStudy',
                        completedLessons,
                        LESSON_BADGE_THRESHOLDS,
                    ),
                    this.nextAchievement(
                        'excellent_rating_streak',
                        'Пятёрки подряд',
                        excellentRatingStreak,
                        EXCELLENT_RATING_THRESHOLDS,
                    ),
                ].filter(Boolean),
            },
        };
    }

    private requireTeacher(user: SessionUser) {
        if (user.role !== UserRole.TEACHER) {
            throw new ForbiddenException('Сводка доступна только преподавателю');
        }
    }

    private leadingFiveRatingCount(ratings: number[]): number {
        let count = 0;
        for (const rating of ratings) {
            if (rating !== 5) break;
            count += 1;
        }
        return count;
    }

    private hasReliableLessonSeries(lessons: Array<{
        status: LessonStatus;
        changeRequests: Array<{ requestedRole: UserRole }>;
    }>): boolean {
        let completed = 0;
        for (const lesson of lessons.slice(0, 60)) {
            if (lesson.status === LessonStatus.COMPLETED) {
                completed += 1;
                if (completed >= 30) return true;
            } else if (!lesson.changeRequests.some(
                (request) => request.requestedRole === UserRole.STUDENT,
            )) {
                return false;
            }
        }
        return false;
    }

    private nextAchievement(
        key: string,
        title: string,
        current: number,
        thresholds: number[],
    ) {
        const target = thresholds.find((threshold) => current < threshold);
        if (!target) return null;

        return {
            key,
            title,
            current,
            target,
            remaining: target - current,
        };
    }

    private rankingUnavailableReason(profile: {
        isVisible: boolean;
        verificationStatus: TeacherVerificationStatus;
        user: { status: UserStatus };
    }): string {
        if (profile.verificationStatus !== TeacherVerificationStatus.VERIFIED) {
            return 'Место появится после проверки анкеты модератором.';
        }
        if (!profile.isVisible) {
            return 'Опубликуйте анкету, чтобы участвовать в рейтинге.';
        }
        return 'Место временно недоступно, пока учётная запись неактивна.';
    }
}
