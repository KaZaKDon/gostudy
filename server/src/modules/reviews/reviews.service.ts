import {
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

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
    constructor(private readonly prisma: PrismaService) {}

    async list(user: SessionUser, query: ListReviewsQueryDto) {
        if (user.role === UserRole.STUDENT) {
            return this.listStudentRelations(user.id);
        }
        if (user.role === UserRole.TEACHER) {
            return this.listTeacherReviews(user.id, query);
        }

        throw new ForbiddenException('Раздел отзывов доступен ученикам и преподавателям');
    }

    async save(user: SessionUser, input: SaveReviewDto) {
        this.requireStudent(user);
        const text = input.text.trim();

        const relation = await this.prisma.teacherStudent.findFirst({
            where: {
                id: input.relation_id,
                studentId: user.id,
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
                subjectId: relation.subjectId,
                status: LessonStatus.COMPLETED,
            },
        });
        if (completedLessons === 0) {
            throw new ConflictException('Отзыв можно оставить после первого проведённого урока');
        }

        const review = await this.prisma.review.upsert({
            where: { teacherStudentId: relation.id },
            create: {
                studentId: relation.studentId,
                teacherId: relation.teacherId,
                teacherStudentId: relation.id,
                subjectId: relation.subjectId,
                rating: input.rating,
                text,
                status: ReviewStatus.PENDING,
            },
            update: {
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

    private async listStudentRelations(studentId: number) {
        const [relations, completedLessons] = await Promise.all([
            this.prisma.teacherStudent.findMany({
                where: {
                    studentId,
                    status: { in: [TeacherStudentStatus.ACTIVE, TeacherStudentStatus.ARCHIVED] },
                },
                orderBy: [{ status: 'asc' }, { teacher: { fullName: 'asc' } }, { subject: { name: 'asc' } }],
                include: {
                    teacher: { select: { fullName: true, avatarUrl: true } },
                    subject: { select: { name: true } },
                    review: true,
                },
            }),
            this.prisma.lesson.groupBy({
                by: ['teacherId', 'subjectId'],
                where: {
                    studentId,
                    status: LessonStatus.COMPLETED,
                    subjectId: { not: null },
                },
                _count: { _all: true },
            }),
        ]);
        const lessonCounts = new Map(
            completedLessons.map((item) => [
                `${item.teacherId}:${item.subjectId}`,
                item._count._all,
            ]),
        );

        return {
            success: true,
            relations: relations.map((relation) => {
                const completedLessonsCount = lessonCounts.get(
                    `${relation.teacherId}:${relation.subjectId}`,
                ) ?? 0;

                return {
                    relation_id: relation.id,
                    teacher_id: relation.teacherId,
                    teacher_name: relation.teacher.fullName || 'Преподаватель',
                    teacher_photo_url: relation.teacher.avatarUrl,
                    subject_id: relation.subjectId,
                    subject_name: relation.subject.name,
                    relation_status: relation.status.toLowerCase(),
                    started_at: relation.startedAt,
                    completed_lessons_count: completedLessonsCount,
                    can_review: completedLessonsCount > 0,
                    review: relation.review
                        ? this.serializeStudentReview(relation.review)
                        : null,
                };
            }),
            summary: { rating: 0, reviews_count: 0 },
            pagination: { page: 1, limit: relations.length, total: relations.length, pages: relations.length ? 1 : 0 },
        };
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

    private requireStudent(user: SessionUser): void {
        if (user.role !== UserRole.STUDENT) {
            throw new ForbiddenException('Оставить отзыв может только ученик');
        }
    }

    private requireTeacher(user: SessionUser): void {
        if (user.role !== UserRole.TEACHER) {
            throw new ForbiddenException('Ответить на отзыв может только преподаватель');
        }
    }
}
