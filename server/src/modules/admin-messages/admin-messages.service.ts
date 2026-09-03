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
    MessageReportStatus,
    UserRole,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { MessagesService } from '../messages/messages.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { ListMessageReportsQueryDto } from './dto/list-message-reports-query.dto';
import type { ResolveMessageReportDto } from './dto/resolve-message-report.dto';

const REPORT_STATUS = {
    pending: MessageReportStatus.PENDING,
    resolved: MessageReportStatus.RESOLVED,
    dismissed: MessageReportStatus.DISMISSED,
} as const;

const adminMessageInclude = {
    sender: { select: { id: true, fullName: true, email: true } },
    attachments: { orderBy: { id: 'asc' as const } },
} satisfies Prisma.MessageInclude;

@Injectable()
export class AdminMessagesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly notifications: NotificationsService,
        private readonly messages: MessagesService,
    ) {}

    async list(actor: SessionUser, query: ListMessageReportsQueryDto) {
        this.requireModerator(actor);
        const page = query.page || 1;
        const limit = query.limit || 20;
        const where: Prisma.MessageReportWhereInput = query.status
            ? { status: REPORT_STATUS[query.status] }
            : {};
        const [total, rows] = await Promise.all([
            this.prisma.messageReport.count({ where }),
            this.prisma.messageReport.findMany({
                where,
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    reporter: { select: { fullName: true, email: true } },
                    message: {
                        include: {
                            sender: { select: { fullName: true, email: true } },
                            dialog: {
                                select: {
                                    channelType: true,
                                    teacher: { select: { fullName: true } },
                                    student: { select: { fullName: true } },
                                    parent: { select: { fullName: true } },
                                },
                            },
                        },
                    },
                },
            }),
        ]);

        return {
            success: true,
            data: {
                items: rows.map((report) => ({
                    id: report.id,
                    message_id: report.messageId,
                    reporter_name: report.reporter.fullName || 'Пользователь',
                    reporter_email: report.reporter.email,
                    sender_name: report.message.sender.fullName || 'Пользователь',
                    sender_email: report.message.sender.email,
                    channel_type: report.message.dialog.channelType.toLowerCase(),
                    participants: this.participants(report.message.dialog),
                    reason: report.reason.toLowerCase(),
                    comment: report.comment,
                    status: report.status.toLowerCase(),
                    resolution_comment: report.resolutionComment,
                    message_preview: report.message.hiddenAt
                        ? 'Сообщение скрыто администрацией'
                        : this.preview(report.message.messageText),
                    is_hidden: Boolean(report.message.hiddenAt),
                    created_at: report.createdAt,
                    handled_at: report.handledAt,
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
        reportId: number,
        metadata: RequestMetadata,
    ) {
        this.requireModerator(actor);
        const report = await this.prisma.messageReport.findUnique({
            where: { id: reportId },
            include: {
                reporter: { select: { id: true, fullName: true, email: true } },
                handledBy: { select: { fullName: true } },
                message: { include: adminMessageInclude },
            },
        });
        if (!report) throw new NotFoundException('Жалоба не найдена');

        const [before, after, dialog] = await Promise.all([
            this.prisma.message.findMany({
                where: {
                    dialogId: report.message.dialogId,
                    id: { lt: report.messageId },
                },
                include: adminMessageInclude,
                orderBy: { id: 'desc' },
                take: 5,
            }),
            this.prisma.message.findMany({
                where: {
                    dialogId: report.message.dialogId,
                    id: { gt: report.messageId },
                },
                include: adminMessageInclude,
                orderBy: { id: 'asc' },
                take: 5,
            }),
            this.prisma.messageDialog.findUnique({
                where: { id: report.message.dialogId },
                include: {
                    teacher: { select: { fullName: true } },
                    student: { select: { fullName: true } },
                    parent: { select: { fullName: true } },
                },
            }),
        ]);

        await this.prisma.adminAuditLog.create({
            data: {
                adminId: actor.id,
                action: 'message_report.context_viewed',
                entityType: 'message_report',
                entityId: report.id,
                newValue: { message_id: report.messageId, context_messages: before.length + after.length },
                ipAddress: metadata.ipAddress,
                userAgent: metadata.userAgent,
            },
        });

        return {
            success: true,
            data: {
                report: {
                    id: report.id,
                    message_id: report.messageId,
                    reporter_name: report.reporter.fullName || 'Пользователь',
                    reporter_email: report.reporter.email,
                    reason: report.reason.toLowerCase(),
                    comment: report.comment,
                    status: report.status.toLowerCase(),
                    resolution_comment: report.resolutionComment,
                    handled_by: report.handledBy?.fullName || null,
                    created_at: report.createdAt,
                    handled_at: report.handledAt,
                },
                dialog: dialog ? {
                    channel_type: dialog.channelType.toLowerCase(),
                    participants: this.participants(dialog),
                } : null,
                context: [...before.reverse(), report.message, ...after].map((message) => ({
                    ...this.messages.serializeForAdministration(message),
                    is_reported: message.id === report.messageId,
                })),
            },
        };
    }

    async resolve(
        actor: SessionUser,
        reportId: number,
        input: ResolveMessageReportDto,
        metadata: RequestMetadata,
    ) {
        this.requireModerator(actor);
        const comment = input.comment?.trim() || '';
        if (input.hide_message && !comment) {
            throw new BadRequestException('Укажите причину скрытия сообщения');
        }
        if (input.decision === 'dismissed' && input.hide_message) {
            throw new BadRequestException('Отклонённая жалоба не может скрывать сообщение');
        }
        const report = await this.prisma.messageReport.findUnique({
            where: { id: reportId },
            include: { message: true },
        });
        if (!report) throw new NotFoundException('Жалоба не найдена');
        if (report.status !== MessageReportStatus.PENDING) {
            throw new ConflictException('Жалоба уже обработана');
        }
        const now = new Date();
        const nextStatus = input.decision === 'resolved'
            ? MessageReportStatus.RESOLVED
            : MessageReportStatus.DISMISSED;

        await this.prisma.$transaction(async (transaction) => {
            await transaction.messageReport.update({
                where: { id: report.id },
                data: {
                    status: nextStatus,
                    resolutionComment: comment || null,
                    handledById: actor.id,
                    handledAt: now,
                },
            });
            if (input.hide_message) {
                await transaction.message.update({
                    where: { id: report.messageId },
                    data: {
                        hiddenAt: now,
                        hiddenById: actor.id,
                        hiddenReason: comment,
                    },
                });
                await this.notifications.create(transaction, {
                    userId: report.message.senderId,
                    type: 'message_hidden',
                    title: 'Сообщение скрыто администрацией',
                    message: `Причина: ${comment}`,
                    targetSection: 'messages',
                    targetEntityType: 'dialog',
                    targetEntityId: report.message.dialogId,
                    dedupeKey: `message-hidden:${report.messageId}`,
                });
            }
            await transaction.adminAuditLog.create({
                data: {
                    adminId: actor.id,
                    action: `message_report.${input.decision}`,
                    entityType: 'message_report',
                    entityId: report.id,
                    oldValue: { status: report.status },
                    newValue: {
                        status: nextStatus,
                        hide_message: Boolean(input.hide_message),
                        comment: comment || null,
                    },
                    ipAddress: metadata.ipAddress,
                    userAgent: metadata.userAgent,
                },
            });
        });

        return { success: true, message: 'Решение по жалобе сохранено' };
    }

    async download(actor: SessionUser, reportId: number, attachmentId: number) {
        this.requireModerator(actor);
        const attachment = await this.prisma.messageAttachment.findFirst({
            where: {
                id: attachmentId,
                message: { reports: { some: { id: reportId } } },
            },
        });
        if (!attachment) {
            throw new NotFoundException('Вложение не относится к этой жалобе');
        }
        return this.messages.downloadForAdministration(attachment.id);
    }

    private participants(dialog: {
        teacher: { fullName: string | null };
        student: { fullName: string | null };
        parent?: { fullName: string | null } | null;
    }) {
        return [
            dialog.teacher.fullName || 'Преподаватель',
            dialog.parent?.fullName || dialog.student.fullName || 'Ученик',
        ].join(' — ');
    }

    private preview(text: string | null) {
        if (!text) return 'Вложение без текста';
        return text.length > 160 ? `${text.slice(0, 157)}...` : text;
    }

    private requireModerator(actor: SessionUser) {
        if (actor.role !== UserRole.ADMIN && actor.role !== UserRole.MODERATOR) {
            throw new ForbiddenException('Недостаточно прав');
        }
    }
}
