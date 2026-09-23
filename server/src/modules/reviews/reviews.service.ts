import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { ParentChildAccessService } from '../../common/access/parent-child-access.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import {
    LessonStatus,
    ReviewReplyStatus,
    ReviewStatus,
    TeacherStudentStatus,
    UserRole,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import type { ListReviewsQueryDto } from './dto/list-reviews-query.dto';
import type { SaveReviewReplyDto } from './dto/save-review-reply.dto';
import type { SaveReviewDto } from './dto/save-review.dto';

@Injectable()
export class ReviewsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly parentChildAccess: ParentChildAccessService,
    ) {}

    async list(user: SessionUser, query: ListReviewsQueryDto) {
        if (user.role === UserRole.STUDENT) {
            return this.listReviewRelations([user.id]);
        }
        if (user.role === UserRole.PARENT) {
            const studentIds = await this.parentChildAccess
                .listCurrentMinorStudentIds(user.id);

            return this.listReviewRelations(
                studentIds,
                true,
            );
        }
        if (user.role === UserRole.TEACHER) {
            return this.listTeacherReviews(user.id, query);
        }

        throw new ForbiddenException('Раздел отзывов доступен ученикам и преподавателям');
    }

    async save(user: SessionUser, input: SaveReviewDto) {
        const text = input.text.trim();
        const studentId = await this.resolveReviewStudent(user, input.child_id);

        const relation = await this.prisma.teacherStudent.findFirst({
            where: {
                id: input.relation_id,
                studentId,
                status: { in: [TeacherStudentStatus.ACTIVE, TeacherStudentStatus.ARCHIVED] },
            },
            select: {
                id: true,
                teacherId: true,
                studentId: true,
                subjectId: true,
            },
        });
        if (!relation) {
            throw new NotFoundException('Связь с преподавателем не найдена');
        }

        const completedLessons = await this.prisma.lesson.count({
            where: {
                teacherId: relation.teacherId,
                studentId: relation.studentId,
                status: LessonStatus.COMPLETED,
            },
        });
        if (completedLessons < 3) {
            throw new ConflictException('Отзыв можно оставить после трёх проведённых уроков');
        }

        const review = await this.prisma.review.upsert({
            where: {
                teacherId_studentId: {
                    teacherId: relation.teacherId,
                    studentId: relation.studentId,
                },
            },
            create: {
                studentId: relation.studentId,
                submittedById: user.id,
                teacherId: relation.teacherId,
                teacherStudentId: relation.id,
                subjectId: relation.subjectId,
                rating: input.rating,
                text,
                status: ReviewStatus.PENDING,
            },
            update: {
                submittedById: user.id,
                teacherStudentId: relation.id,
                subjectId: relation.subjectId,
                rating: input.rating,
                text,
                status: ReviewStatus.PENDING,
                rejectionReason: null,
                moderatedById: null,
                moderatedAt: null,
            },
            select: { id: true },
        });

        return {
            success: true,
            message: 'Отзыв отправлен на модерацию',
            review_id: review.id,
        };
    }

    async reply(user: SessionUser, input: SaveReviewReplyDto) {
        this.requireTeacher(user);
        const review = await this.prisma.review.findFirst({
            where: {
                id: input.review_id,
                teacherId: user.id,
                publishedAt: { not: null },
                publishedRating: { not: null },
            },
            select: { id: true },
        });
        if (!review) {
            throw new NotFoundException('Опубликованный отзыв не найден');
        }

        await this.prisma.review.update({
            where: { id: review.id },
            data: {
                pendingTeacherReply: input.text.trim(),
                replyStatus: ReviewReplyStatus.PENDING,
                replyRejectionReason: null,
                replyModeratedById: null,
                replyModeratedAt: null,
            },
        });

        return {
            success: true,
            message: 'Ответ отправлен на модерацию',
        };
    }

    async recalculateTeacherSummary(
        transaction: Prisma.TransactionClient,
        teacherId: number,
    ): Promise<void> {
        const summary = await transaction.review.aggregate({
            where: {
                teacherId,
                publishedAt: { not: null },
                publishedRating: { not: null },
            },
            _avg: { publishedRating: true },
            _count: { _all: true },
        });

        await transaction.teacherProfile.update({
            where: { userId: teacherId },
            data: {
                rating: summary._avg.publishedRating ?? 0,
                reviewsCount: summary._count._all,
            },
        });
    }

    private async listReviewRelations(
        studentIds: number[],
        includeChild = false,
    ) {
        if (!studentIds.length) {
            return {
                success: true,
                relations: [],
                summary: { rating: 0, reviews_count: 0 },
                pagination: { page: 1, limit: 0, total: 0, pages: 0 },
            };
        }

        const [relations, completedLessons, reviews] = await Promise.all([
            this.prisma.teacherStudent.findMany({
                where: {
                    studentId: { in: studentIds },
                    status: { in: [TeacherStudentStatus.ACTIVE, TeacherStudentStatus.ARCHIVED] },
                },
                orderBy: [
                    { student: { fullName: 'asc' } },
                    { status: 'asc' },
                    { teacher: { fullName: 'asc' } },
                    { subject: { name: 'asc' } },
                ],
                include: {
                    teacher: { select: { fullName: true, avatarUrl: true } },
                    student: { select: { fullName: true } },
                    subject: { select: { name: true } },
                },
            }),
            this.prisma.lesson.groupBy({
                by: ['teacherId', 'studentId'],
                where: {
                    studentId: { in: studentIds },
                    status: LessonStatus.COMPLETED,
                },
                _count: { _all: true },
            }),
            this.prisma.review.findMany({
                where: { studentId: { in: studentIds } },
            }),
        ]);
        const lessonCounts = new Map(
            completedLessons.map((item) => [
                `${item.studentId}:${item.teacherId}`,
                item._count._all,
            ]),
        );
        const reviewsByPair = new Map(
            reviews.map((review) => [
                `${review.studentId}:${review.teacherId}`,
                review,
            ]),
        );
        const grouped = new Map<string, Array<(typeof relations)[number]>>();

        for (const relation of relations) {
            const key = `${relation.studentId}:${relation.teacherId}`;
            const items = grouped.get(key) ?? [];
            items.push(relation);
            grouped.set(key, items);
        }

        const serialized = Array.from(grouped.entries()).map(([key, items]) => {
            const primary = items.find(
                (item) => item.status === TeacherStudentStatus.ACTIVE,
            ) ?? items[0];
            const completedLessonsCount = lessonCounts.get(key) ?? 0;
            const review = reviewsByPair.get(key) ?? null;
            const subjectNames = [...new Set(
                items.map((item) => item.subject.name),
            )];

            return {
                relation_id: primary.id,
                teacher_id: primary.teacherId,
                teacher_name: primary.teacher.fullName || 'Преподаватель',
                teacher_photo_url: primary.teacher.avatarUrl,
                subject_id: primary.subjectId,
                subject_name: subjectNames.join(', '),
                relation_status: items.some(
                    (item) => item.status === TeacherStudentStatus.ACTIVE,
                ) ? 'active' : 'archived',
                started_at: primary.startedAt,
                completed_lessons_count: completedLessonsCount,
                can_review: completedLessonsCount >= 3,
                child_id: includeChild ? primary.studentId : undefined,
                child_name: includeChild
                    ? primary.student.fullName || 'Ребёнок'
                    : undefined,
                review: review
                    ? this.serializeStudentReview(review)
                    : null,
            };
        });

        return {
            success: true,
            relations: serialized,
            summary: { rating: 0, reviews_count: 0 },
            pagination: {
                page: 1,
                limit: serialized.length,
                total: serialized.length,
                pages: serialized.length ? 1 : 0,
            },
        };
    }

    private async resolveReviewStudent(
        user: SessionUser,
        childId?: number,
    ): Promise<number> {
        if (user.role === UserRole.STUDENT) {
            return user.id;
        }
        if (user.role !== UserRole.PARENT) {
            throw new ForbiddenException(
                'Оставить отзыв может ученик или его родитель',
            );
        }
        if (!childId) {
            throw new BadRequestException('Выберите ребёнка');
        }

        const hasAccess = await this.parentChildAccess.hasCurrentMinorAccess(
            user.id,
            childId,
        );
        if (!hasAccess) {
            throw new ForbiddenException(
                'Ребёнок не подтверждён, не привязан или уже достиг 18 лет',
            );
        }

        return childId;
    }

    private async listTeacherReviews(teacherId: number, query: ListReviewsQueryDto) {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const where: Prisma.ReviewWhereInput = {
            teacherId,
            publishedAt: { not: null },
            publishedRating: { not: null },
        };
        const [total, reviews, profile] = await Promise.all([
            this.prisma.review.count({ where }),
            this.prisma.review.findMany({
                where,
                orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    student: { select: { fullName: true } },
                    subject: { select: { name: true } },
                },
            }),
            this.prisma.teacherProfile.findUnique({
                where: { userId: teacherId },
                select: { rating: true, reviewsCount: true },
            }),
        ]);

        return {
            success: true,
            items: reviews.map((review) => ({
                id: review.id,
                student_id: review.studentId,
                student_name: review.student.fullName || 'Ученик',
                subject_id: review.subjectId,
                subject_name: review.subject.name,
                rating: review.publishedRating,
                text: review.publishedText,
                published_at: review.publishedAt,
                teacher_reply: review.teacherReply,
                pending_teacher_reply: review.pendingTeacherReply,
                reply_status: review.replyStatus.toLowerCase(),
                reply_rejection_reason: review.replyRejectionReason,
            })),
            summary: {
                rating: Number(profile?.rating ?? 0),
                reviews_count: profile?.reviewsCount ?? 0,
            },
            pagination: {
                page,
                limit,
                total,
                pages: total ? Math.ceil(total / limit) : 0,
            },
        };
    }

    private serializeStudentReview(review: Record<string, any>) {
        return {
            id: review.id,
            rating: review.rating,
            text: review.text,
            status: review.status.toLowerCase(),
            rejection_reason: review.rejectionReason,
            published_rating: review.publishedRating,
            published_text: review.publishedText,
            published_at: review.publishedAt,
            teacher_reply: review.teacherReply,
            reply_status: review.replyStatus.toLowerCase(),
            updated_at: review.updatedAt,
        };
    }

    private requireTeacher(user: SessionUser): void {
        if (user.role !== UserRole.TEACHER) {
            throw new ForbiddenException('Ответить на отзыв может только преподаватель');
        }
    }
}
