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
    LessonDisputeResolution,
    LessonDisputeStatus,
    UserRole,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { LessonDisputesService } from '../lesson-disputes/lesson-disputes.service';
import type { ListAdminLessonDisputesQueryDto } from './dto/list-admin-lesson-disputes-query.dto';
import type { ModerateLessonDisputeDto } from './dto/moderate-lesson-dispute.dto';

const STATUS_BY_INPUT = {
    open: LessonDisputeStatus.OPEN,
    under_review: LessonDisputeStatus.UNDER_REVIEW,
    resolved: LessonDisputeStatus.RESOLVED,
    rejected: LessonDisputeStatus.REJECTED,
} as const;

const RESOLUTION_BY_INPUT = {
    applicant_supported: LessonDisputeResolution.APPLICANT_SUPPORTED,
    respondent_supported: LessonDisputeResolution.RESPONDENT_SUPPORTED,
    mutual_agreement: LessonDisputeResolution.MUTUAL_AGREEMENT,
    no_violation: LessonDisputeResolution.NO_VIOLATION,
} as const;

const adminDetailsInclude = {
    lesson: {
        include: { subject: { select: { name: true } } },
    },
    openedBy: { select: { id: true, fullName: true, role: true } },
    teacher: { select: { id: true, fullName: true, email: true } },
    student: { select: { id: true, fullName: true, email: true } },
    handledBy: { select: { id: true, fullName: true } },
    attachments: { orderBy: { id: 'asc' as const } },
    messages: {
        orderBy: { id: 'asc' as const },
        include: {
            author: { select: { id: true, fullName: true, role: true } },
            attachments: { orderBy: { id: 'asc' as const } },
        },
    },
    events: {
        orderBy: { id: 'asc' as const },
        include: {
            actor: { select: { id: true, fullName: true, role: true } },
        },
    },
    _count: { select: { messages: true, attachments: true } },
} satisfies Prisma.LessonDisputeInclude;

@Injectable()
export class AdminLessonDisputesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly disputes: LessonDisputesService,
    ) {}

    async list(actor: SessionUser, query: ListAdminLessonDisputesQueryDto) {
        this.requireModerator(actor);
        const page = query.page || 1;
        const limit = query.limit || 20;
        const where: Prisma.LessonDisputeWhereInput = query.status
            ? { status: STATUS_BY_INPUT[query.status] }
            : {};
        const [total, rows] = await Promise.all([
            this.prisma.lessonDispute.count({ where }),
            this.prisma.lessonDispute.findMany({
                where,
                orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    lesson: {
                        include: { subject: { select: { name: true } } },
                    },
                    openedBy: { select: { fullName: true, role: true } },
                    teacher: { select: { fullName: true } },
                    student: { select: { fullName: true } },
                    _count: { select: { messages: true, attachments: true } },
                },
            }),
        ]);

        return {
            success: true,
            data: {
                items: rows.map((row) => ({
                    id: row.id,
                    lesson_id: row.lessonId,
                    lesson_title: row.lesson.subject?.name
                        || row.lesson.title
                        || 'Занятие',
                    lesson_date: row.lesson.lessonDate,
                    opened_by_name: row.openedBy.fullName || 'Пользователь',
                    opened_by_role: row.openedBy.role.toLowerCase(),
                    teacher_name: row.teacher.fullName || 'Преподаватель',
                    student_name: row.student.fullName || 'Ученик',
                    reason: row.reason.toLowerCase(),
                    status: row.status.toLowerCase(),
                    message_count: row._count.messages,
                    attachment_count: row._count.attachments,
                    created_at: row.createdAt,
                    updated_at: row.updatedAt,
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    pages: total ? Math.ceil(total / limit) : 0,
                },
            },
        };
    }

    async details(
        actor: SessionUser,
        disputeId: number,
        metadata: RequestMetadata,
    ) {
        this.requireModerator(actor);
        const dispute = await this.findDetails(disputeId);
        if (!dispute) throw new NotFoundException('Спор не найден');

        await this.prisma.adminAuditLog.create({
            data: {
                adminId: actor.id,
                action: 'lesson_dispute.viewed',
                entityType: 'lesson_dispute',
                entityId: dispute.id,
                newValue: { lesson_id: dispute.lessonId },
                ipAddress: metadata.ipAddress,
                userAgent: metadata.userAgent,
            },
        });

        return {
            success: true,
            data: this.serializeDetails(dispute),
        };
    }

    async moderate(
        actor: SessionUser,
        disputeId: number,
        input: ModerateLessonDisputeDto,
        metadata: RequestMetadata,
    ) {
        this.requireModerator(actor);
        const dispute = await this.prisma.lessonDispute.findUnique({
            where: { id: disputeId },
        });
        if (!dispute) throw new NotFoundException('Спор не найден');
        if (
            dispute.status === LessonDisputeStatus.RESOLVED
            || dispute.status === LessonDisputeStatus.REJECTED
        ) {
            throw new ConflictException('Спор уже закрыт');
        }

        if (input.action === 'review') {
            if (dispute.status === LessonDisputeStatus.UNDER_REVIEW) {
                throw new ConflictException('Спор уже на рассмотрении');
            }
            await this.prisma.$transaction(async (transaction) => {
                await transaction.lessonDispute.update({
                    where: { id: dispute.id },
                    data: {
                        status: LessonDisputeStatus.UNDER_REVIEW,
                        handledById: actor.id,
                    },
                });
                await transaction.lessonDisputeEvent.create({
                    data: {
                        disputeId: dispute.id,
                        actorId: actor.id,
                        eventType: 'moderation.review_started',
                        fromStatus: dispute.status,
                        toStatus: LessonDisputeStatus.UNDER_REVIEW,
                    },
                });
                await this.writeAudit(
                    transaction,
                    actor,
                    dispute.id,
                    dispute.status,
                    LessonDisputeStatus.UNDER_REVIEW,
                    null,
                    null,
                    metadata,
                );
                await this.disputes.notifyStatusChange(
                    transaction,
                    dispute,
                    actor,
                    'Спор принят в работу',
                    'Модератор начал рассмотрение спора по уроку.',
                    `lesson-dispute-review:${dispute.id}`,
                );
            });

            return { success: true, message: 'Спор принят в работу' };
        }

        const comment = input.comment?.trim() || '';
        if (!input.decision) {
            throw new BadRequestException('Выберите решение по спору');
        }
        if (comment.length < 10) {
            throw new BadRequestException('Опишите решение модератора подробнее');
        }
        const decision = input.decision;
        const resolution = RESOLUTION_BY_INPUT[decision];
        const nextStatus = resolution === LessonDisputeResolution.NO_VIOLATION
            ? LessonDisputeStatus.REJECTED
            : LessonDisputeStatus.RESOLVED;
        const now = new Date();

        await this.prisma.$transaction(async (transaction) => {
            await transaction.lessonDispute.update({
                where: { id: dispute.id },
                data: {
                    status: nextStatus,
                    resolution,
                    resolutionComment: comment,
                    handledById: actor.id,
                    handledAt: now,
                },
            });
            await transaction.lessonDisputeEvent.create({
                data: {
                    disputeId: dispute.id,
                    actorId: actor.id,
                    eventType: 'moderation.decision_saved',
                    fromStatus: dispute.status,
                    toStatus: nextStatus,
                    details: { resolution: decision, comment },
                },
            });
            await this.writeAudit(
                transaction,
                actor,
                dispute.id,
                dispute.status,
                nextStatus,
                decision,
                comment,
                metadata,
            );
            await this.disputes.notifyStatusChange(
                transaction,
                dispute,
                actor,
                'По спору принято решение',
                'Модератор завершил рассмотрение спора. Решение доступно в кабинете.',
                `lesson-dispute-decision:${dispute.id}`,
            );
        });

        return { success: true, message: 'Решение по спору сохранено' };
    }

    async download(actor: SessionUser, disputeId: number, attachmentId: number) {
        this.requireModerator(actor);
        return this.disputes.downloadForAdministration(disputeId, attachmentId);
    }

    private findDetails(disputeId: number) {
        return this.prisma.lessonDispute.findUnique({
            where: { id: disputeId },
            include: adminDetailsInclude,
        });
    }

    private serializeDetails(
        dispute: NonNullable<Awaited<ReturnType<AdminLessonDisputesService['findDetails']>>>,
    ) {
        return {
            id: dispute.id,
            lesson: {
                id: dispute.lesson.id,
                title: dispute.lesson.subject?.name
                    || dispute.lesson.title
                    || 'Занятие',
                lesson_date: dispute.lesson.lessonDate,
                status: dispute.lesson.status.toLowerCase(),
            },
            reason: dispute.reason.toLowerCase(),
            description: dispute.description,
            status: dispute.status.toLowerCase(),
            resolution: dispute.resolution?.toLowerCase() || null,
            resolution_comment: dispute.resolutionComment,
            opened_by: {
                id: dispute.openedBy.id,
                name: dispute.openedBy.fullName || 'Пользователь',
                role: dispute.openedBy.role.toLowerCase(),
            },
            teacher: {
                id: dispute.teacher.id,
                name: dispute.teacher.fullName || 'Преподаватель',
                email: dispute.teacher.email,
            },
            student: {
                id: dispute.student.id,
                name: dispute.student.fullName || 'Ученик',
                email: dispute.student.email,
            },
            handled_by: dispute.handledBy?.fullName || null,
            handled_at: dispute.handledAt,
            created_at: dispute.createdAt,
            updated_at: dispute.updatedAt,
            attachments: dispute.attachments
                .filter((attachment) => attachment.messageId === null)
                .map((attachment) => this.serializeAttachment(attachment)),
            messages: dispute.messages.map((message) => ({
                id: message.id,
                author_name: message.author.fullName || 'Пользователь',
                author_role: message.author.role.toLowerCase(),
                message_text: message.messageText,
                created_at: message.createdAt,
                attachments: message.attachments.map((attachment) =>
                    this.serializeAttachment(attachment)),
            })),
            events: dispute.events.map((event) => ({
                id: event.id,
                event_type: event.eventType,
                actor_name: event.actor?.fullName || 'Система',
                actor_role: event.actor?.role.toLowerCase() || null,
                from_status: event.fromStatus?.toLowerCase() || null,
                to_status: event.toStatus?.toLowerCase() || null,
                details: event.details,
                created_at: event.createdAt,
            })),
        };
    }

    private serializeAttachment(attachment: {
        id: number;
        originalName: string;
        mimeType: string;
        fileSize: number;
        createdAt: Date;
    }) {
        return {
            id: attachment.id,
            original_name: attachment.originalName,
            mime_type: attachment.mimeType,
            file_size: attachment.fileSize,
            created_at: attachment.createdAt,
        };
    }

    private writeAudit(
        transaction: Prisma.TransactionClient,
        actor: SessionUser,
        disputeId: number,
        previousStatus: LessonDisputeStatus,
        nextStatus: LessonDisputeStatus,
        decision: string | null,
        comment: string | null,
        metadata: RequestMetadata,
    ) {
        return transaction.adminAuditLog.create({
            data: {
                adminId: actor.id,
                action: decision
                    ? 'lesson_dispute.decided'
                    : 'lesson_dispute.review_started',
                entityType: 'lesson_dispute',
                entityId: disputeId,
                oldValue: { status: previousStatus },
                newValue: {
                    status: nextStatus,
                    decision,
                    comment,
                },
                ipAddress: metadata.ipAddress,
                userAgent: metadata.userAgent,
            },
        });
    }

    private requireModerator(actor: SessionUser) {
        if (actor.role !== UserRole.ADMIN && actor.role !== UserRole.MODERATOR) {
            throw new ForbiddenException('Недостаточно прав');
        }
    }
}
