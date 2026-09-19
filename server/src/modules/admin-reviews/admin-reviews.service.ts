import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import type { RequestMetadata } from '../../common/http/request-metadata';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import {
    ReviewReplyStatus,
    ReviewStatus,
    UserRole,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { NotificationsService } from '../notifications/notifications.service';
import { ReviewsService } from '../reviews/reviews.service';
import type { ListAdminReviewsQueryDto } from './dto/list-admin-reviews-query.dto';
import type { ModerateReviewDto } from './dto/moderate-review.dto';

const REVIEW_STATUS = {
    pending: ReviewStatus.PENDING,
    approved: ReviewStatus.APPROVED,
    rejected: ReviewStatus.REJECTED,
};

const REPLY_STATUS = {
    pending: ReviewReplyStatus.PENDING,
    approved: ReviewReplyStatus.APPROVED,
    rejected: ReviewReplyStatus.REJECTED,
};

@Injectable()
export class AdminReviewsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly notifications: NotificationsService,
        private readonly reviews: ReviewsService,
    ) {}

    async list(actor: SessionUser, query: ListAdminReviewsQueryDto) {
        this.requireModerator(actor);
        const page = query.page || 1;
        const limit = query.limit || 20;
        const search = query.q?.trim() || '';
        const numericId = /^\d+$/.test(search) ? Number(search) : null;
        const conditions: Prisma.ReviewWhereInput[] = [];

        if (search) {
            conditions.push({
                OR: [
                    ...(numericId ? [{ id: numericId }] : []),
                    { student: { fullName: { contains: search, mode: 'insensitive' } } },
                    { student: { email: { contains: search, mode: 'insensitive' } } },
                    { teacher: { fullName: { contains: search, mode: 'insensitive' } } },
                    { teacher: { email: { contains: search, mode: 'insensitive' } } },
                    { subject: { name: { contains: search, mode: 'insensitive' } } },
                ],
            });
        }

        if (query.target === 'review') {
            if (query.status) {
                conditions.push({ status: REVIEW_STATUS[query.status] });
            }
        } else if (query.target === 'reply') {
            conditions.push(query.status
                ? { replyStatus: REPLY_STATUS[query.status] }
                : { replyStatus: { not: ReviewReplyStatus.NONE } });
        } else if (query.status) {
            conditions.push({
                OR: [
                    { status: REVIEW_STATUS[query.status] },
                    { replyStatus: REPLY_STATUS[query.status] },
                ],
            });
        }

        const where: Prisma.ReviewWhereInput = conditions.length
            ? { AND: conditions }
            : {};
        const [total, reviews] = await Promise.all([
            this.prisma.review.count({ where }),
            this.prisma.review.findMany({
                where,
                orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    student: { select: { fullName: true, email: true } },
                    teacher: { select: { fullName: true, email: true } },
                    subject: { select: { name: true } },
                },
            }),
        ]);

        return {
            success: true,
            data: {
                items: reviews.map((review) => this.serialize(review)),
                pagination: {
                    page,
                    limit,
                    total,
                    pages: total ? Math.ceil(total / limit) : 0,
                },
            },
        };
    }

    async moderate(
        actor: SessionUser,
        reviewId: number,
        input: ModerateReviewDto,
        metadata: RequestMetadata,
    ) {
        this.requireModerator(actor);
        const comment = input.comment?.trim() || '';
        if (input.decision === 'rejected' && !comment) {
            throw new BadRequestException('Укажите причину отклонения');
        }

        await this.prisma.$transaction(async (transaction) => {
            const review = await transaction.review.findUnique({
                where: { id: reviewId },
                include: {
                    student: { select: { fullName: true } },
                    teacher: { select: { fullName: true } },
                    subject: { select: { name: true } },
                },
            });
            if (!review) {
                throw new NotFoundException('Отзыв не найден');
            }

            if (input.target === 'review') {
                if (review.status !== ReviewStatus.PENDING) {
                    throw new ConflictException('Эта редакция отзыва уже проверена');
                }

                const updated = await transaction.review.update({
                    where: { id: reviewId },
                    data: input.decision === 'approved'
                        ? {
                            status: ReviewStatus.APPROVED,
                            publishedRating: review.rating,
                            publishedText: review.text,
                            rejectionReason: null,
                            moderatedById: actor.id,
                            moderatedAt: new Date(),
                            publishedAt: review.publishedAt ?? new Date(),
                        }
                        : {
                            status: ReviewStatus.REJECTED,
                            rejectionReason: comment,
                            moderatedById: actor.id,
                            moderatedAt: new Date(),
                        },
                });

                await this.notifyReviewDecision(transaction, review, input.decision, comment);
                await this.reviews.recalculateTeacherSummary(transaction, review.teacherId);
                await this.audit(transaction, actor, metadata, reviewId, 'review', {
                    status: review.status,
                    rating: review.rating,
                    text: review.text,
                    rejection_reason: review.rejectionReason,
                }, {
                    status: updated.status,
                    published_rating: updated.publishedRating,
                    published_text: updated.publishedText,
                    rejection_reason: updated.rejectionReason,
                });
            } else {
                if (review.replyStatus !== ReviewReplyStatus.PENDING) {
                    throw new ConflictException('Этот ответ уже проверен');
                }
                if (!review.pendingTeacherReply) {
                    throw new ConflictException('Текст ответа на модерацию не найден');
                }

                const updated = await transaction.review.update({
                    where: { id: reviewId },
                    data: input.decision === 'approved'
                        ? {
                            teacherReply: review.pendingTeacherReply,
                            pendingTeacherReply: null,
                            replyStatus: ReviewReplyStatus.APPROVED,
                            replyRejectionReason: null,
                            replyModeratedById: actor.id,
                            replyModeratedAt: new Date(),
                            repliedAt: new Date(),
                        }
                        : {
                            replyStatus: ReviewReplyStatus.REJECTED,
                            replyRejectionReason: comment,
                            replyModeratedById: actor.id,
                            replyModeratedAt: new Date(),
                        },
                });

                await this.notifyReplyDecision(transaction, review, input.decision, comment);
                await this.audit(transaction, actor, metadata, reviewId, 'reply', {
                    reply_status: review.replyStatus,
                    teacher_reply: review.teacherReply,
                    pending_teacher_reply: review.pendingTeacherReply,
                    reply_rejection_reason: review.replyRejectionReason,
                }, {
                    reply_status: updated.replyStatus,
                    teacher_reply: updated.teacherReply,
                    pending_teacher_reply: updated.pendingTeacherReply,
                    reply_rejection_reason: updated.replyRejectionReason,
                });
            }
        });

        return {
            success: true,
            message: input.decision === 'approved'
                ? 'Публикация одобрена'
                : 'Публикация отклонена',
        };
    }

    private async notifyReviewDecision(
        transaction: Prisma.TransactionClient,
        review: Record<string, any>,
        decision: 'approved' | 'rejected',
        comment: string,
    ) {
        const subjectName = review.subject.name || 'Занятия';
        if (decision === 'approved') {
            await this.notifications.create(transaction, {
                userId: review.teacherId,
                type: 'review_published',
                title: 'Опубликован отзыв ученика',
                message: `${review.student.fullName || 'Ученик'} · ${subjectName}`,
                targetSection: 'students',
                targetEntityType: 'review',
                targetEntityId: review.id,
                dedupeKey: `review-published:${review.id}`,
            });
            await this.notifications.create(transaction, {
                userId: review.submittedById,
                type: 'review_approved',
                title: 'Ваш отзыв опубликован',
                message: `${review.teacher.fullName || 'Преподаватель'} · ${subjectName}`,
                targetSection: 'teachers',
                targetEntityType: 'review',
                targetEntityId: review.id,
                dedupeKey: `review-approved:${review.id}`,
            });
            return;
        }

        await this.notifications.create(transaction, {
            userId: review.submittedById,
            type: 'review_rejected',
            title: 'Отзыв нужно исправить',
            message: comment.slice(0, 500),
            targetSection: 'teachers',
            targetEntityType: 'review',
            targetEntityId: review.id,
            dedupeKey: `review-rejected:${review.id}`,
        });
    }

    private async notifyReplyDecision(
        transaction: Prisma.TransactionClient,
        review: Record<string, any>,
        decision: 'approved' | 'rejected',
        comment: string,
    ) {
        const subjectName = review.subject.name || 'Занятия';
        if (decision === 'approved') {
            await this.notifications.create(transaction, {
                userId: review.submittedById,
                type: 'review_reply_published',
                title: 'Преподаватель ответил на отзыв',
                message: `${review.teacher.fullName || 'Преподаватель'} · ${subjectName}`,
                targetSection: 'teachers',
                targetEntityType: 'review',
                targetEntityId: review.id,
                dedupeKey: `review-reply-published:${review.id}`,
            });
            await this.notifications.create(transaction, {
                userId: review.teacherId,
                type: 'review_reply_approved',
                title: 'Ваш ответ на отзыв опубликован',
                message: `${review.student.fullName || 'Ученик'} · ${subjectName}`,
                targetSection: 'students',
                targetEntityType: 'review',
                targetEntityId: review.id,
                dedupeKey: `review-reply-approved:${review.id}`,
            });
            return;
        }

        await this.notifications.create(transaction, {
            userId: review.teacherId,
            type: 'review_reply_rejected',
            title: 'Ответ на отзыв нужно исправить',
            message: comment.slice(0, 500),
            targetSection: 'students',
            targetEntityType: 'review',
            targetEntityId: review.id,
            dedupeKey: `review-reply-rejected:${review.id}`,
        });
    }

    private async audit(
        transaction: Prisma.TransactionClient,
        actor: SessionUser,
        metadata: RequestMetadata,
        reviewId: number,
        target: 'review' | 'reply',
        oldValue: Prisma.InputJsonObject,
        newValue: Prisma.InputJsonObject,
    ) {
        await transaction.adminAuditLog.create({
            data: {
                adminId: actor.id,
                action: `${target}_moderated`,
                entityType: 'review',
                entityId: reviewId,
                oldValue,
                newValue,
                ipAddress: metadata.ipAddress,
                userAgent: metadata.userAgent,
            },
        });
    }

    private serialize(review: Record<string, any>) {
        return {
            id: review.id,
            student_id: review.studentId,
            teacher_id: review.teacherId,
            teacher_student_id: review.teacherStudentId,
            subject_id: review.subjectId,
            rating: review.rating,
            text: review.text,
            status: review.status.toLowerCase(),
            rejection_reason: review.rejectionReason,
            published_rating: review.publishedRating,
            published_text: review.publishedText,
            published_at: review.publishedAt,
            teacher_reply: review.teacherReply,
            pending_teacher_reply: review.pendingTeacherReply,
            reply_status: review.replyStatus.toLowerCase(),
            reply_rejection_reason: review.replyRejectionReason,
            created_at: review.createdAt,
            updated_at: review.updatedAt,
            student_name: review.student.fullName,
            student_email: review.student.email,
            teacher_name: review.teacher.fullName,
            teacher_email: review.teacher.email,
            subject_name: review.subject.name,
        };
    }

    private requireModerator(actor: SessionUser): void {
        if (actor.role !== UserRole.ADMIN && actor.role !== UserRole.MODERATOR) {
            throw new ForbiddenException('Доступ разрешён только администратору или модератору');
        }
    }
}
