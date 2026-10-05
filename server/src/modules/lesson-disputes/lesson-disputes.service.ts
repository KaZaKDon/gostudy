import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { ParentChildAccessService } from '../../common/access/parent-child-access.service';
import { normalizeUploadedFileName } from '../../common/files/upload-file-name';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import {
    LessonDisputeReason,
    LessonDisputeStatus,
    LessonSessionStatus,
    LessonStatus,
    UserRole,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { NotificationsService } from '../notifications/notifications.service';
import type { CreateLessonDisputeDto } from './dto/create-lesson-dispute.dto';
import type { CreateLessonDisputeMessageDto } from './dto/create-lesson-dispute-message.dto';
import type { ListLessonDisputesQueryDto } from './dto/list-lesson-disputes-query.dto';
import {
    LessonDisputeFileStorageService,
    type LessonDisputeUploadFile,
} from './lesson-dispute-file-storage.service';

const REASON_BY_INPUT = {
    no_show: LessonDisputeReason.NO_SHOW,
    late_cancellation: LessonDisputeReason.LATE_CANCELLATION,
    lesson_not_held: LessonDisputeReason.LESSON_NOT_HELD,
    lesson_quality: LessonDisputeReason.LESSON_QUALITY,
    other: LessonDisputeReason.OTHER,
} as const;

const STATUS_BY_INPUT = {
    open: LessonDisputeStatus.OPEN,
    under_review: LessonDisputeStatus.UNDER_REVIEW,
    resolved: LessonDisputeStatus.RESOLVED,
    rejected: LessonDisputeStatus.REJECTED,
} as const;

const ACTIVE_DISPUTE_STATUSES: LessonDisputeStatus[] = [
    LessonDisputeStatus.OPEN,
    LessonDisputeStatus.UNDER_REVIEW,
];

const disputeListInclude = {
    lesson: {
        include: {
            subject: { select: { name: true } },
        },
    },
    openedBy: { select: { id: true, fullName: true, role: true } },
    teacher: { select: { id: true, fullName: true } },
    student: { select: { id: true, fullName: true } },
    _count: { select: { messages: true, attachments: true } },
} satisfies Prisma.LessonDisputeInclude;

const disputeDetailsInclude = {
    lesson: {
        include: {
            subject: { select: { name: true } },
        },
    },
    openedBy: { select: { id: true, fullName: true, role: true } },
    teacher: { select: { id: true, fullName: true } },
    student: { select: { id: true, fullName: true } },
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

type DisputeListRecord = Prisma.LessonDisputeGetPayload<{
    include: typeof disputeListInclude;
}>;

type DisputeDetailsRecord = Prisma.LessonDisputeGetPayload<{
    include: typeof disputeDetailsInclude;
}>;

type DisputeNotificationRecord = {
    id: number;
    teacherId: number;
    studentId: number;
};

@Injectable()
export class LessonDisputesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly parentChildAccess: ParentChildAccessService,
        private readonly notifications: NotificationsService,
        private readonly files: LessonDisputeFileStorageService,
    ) {}

    async list(user: SessionUser, query: ListLessonDisputesQueryDto) {
        this.requireSupportedRole(user);
        const accessWhere = await this.accessWhere(user, query.student_id);
        const rows = await this.prisma.lessonDispute.findMany({
            where: {
                ...accessWhere,
                ...(query.status ? { status: STATUS_BY_INPUT[query.status] } : {}),
            },
            include: disputeListInclude,
            orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        });

        return {
            success: true,
            disputes: rows.map((row) => this.serializeListItem(row)),
            upload_limits: this.serializeUploadLimits(),
        };
    }

    async options(user: SessionUser, selectedStudentId?: number) {
        this.requireSupportedRole(user);
        const studentIds = user.role === UserRole.PARENT
            ? await this.parentStudentIds(user, selectedStudentId)
            : [];
        const now = new Date();
        const lessons = await this.prisma.lesson.findMany({
            where: {
                ...(user.role === UserRole.TEACHER
                    ? { teacherId: user.id }
                    : user.role === UserRole.STUDENT
                        ? { studentId: user.id }
                        : { studentId: { in: studentIds } }),
                OR: [
                    { status: LessonStatus.CANCELLED },
                    { lessonDate: { lte: now } },
                ],
            },
            include: {
                subject: { select: { name: true } },
                teacher: { select: { fullName: true } },
                student: { select: { fullName: true } },
                session: { select: { status: true } },
                dispute: { select: { id: true } },
            },
            orderBy: [{ lessonDate: 'desc' }, { id: 'desc' }],
            take: 100,
        });

        const children = user.role === UserRole.PARENT
            ? await this.parentChildAccess.listCurrentMinorChildren(user.id)
            : [];

        return {
            success: true,
            children: children.map((child) => ({
                student_id: child.studentId,
                full_name: [
                    child.lastName,
                    child.firstName,
                    child.middleName,
                ].filter(Boolean).join(' '),
            })),
            lessons: lessons
                .filter((lesson) => (
                    !lesson.dispute
                    && lesson.session?.status !== LessonSessionStatus.ACTIVE
                    && this.isLessonEligible(lesson, now)
                ))
                .map((lesson) => ({
                    id: lesson.id,
                    title: lesson.subject?.name || lesson.title || 'Занятие',
                    lesson_date: lesson.lessonDate,
                    status: lesson.status.toLowerCase(),
                    teacher_name: lesson.teacher.fullName || 'Преподаватель',
                    student_name: lesson.student.fullName || 'Ученик',
                })),
            upload_limits: this.serializeUploadLimits(),
        };
    }

    async details(user: SessionUser, disputeId: number) {
        this.requireSupportedRole(user);
        const dispute = await this.findDetails(disputeId);
        if (!dispute) throw new NotFoundException('Спор не найден');
        await this.requireAccess(user, dispute);
        await this.prisma.notification.updateMany({
            where: {
                userId: user.id,
                targetEntityType: 'lesson_dispute',
                targetEntityId: dispute.id,
                isRead: false,
            },
            data: { isRead: true, readAt: new Date() },
        });

        return {
            success: true,
            dispute: this.serializeDetails(dispute),
            upload_limits: this.serializeUploadLimits(),
        };
    }

    async create(
        user: SessionUser,
        input: CreateLessonDisputeDto,
        uploads: LessonDisputeUploadFile[],
    ) {
        this.requireSupportedRole(user);
        const description = input.description.trim();
        if (description.length < 10) {
            throw new BadRequestException('Опишите ситуацию подробнее');
        }
        const validated = this.files.validateUploads(uploads);
        const lesson = await this.prisma.lesson.findUnique({
            where: { id: input.lesson_id },
            include: {
                subject: { select: { name: true } },
                session: { select: { status: true } },
                dispute: { select: { id: true } },
            },
        });
        if (!lesson) throw new NotFoundException('Урок не найден');
        await this.requireLessonAccess(user, lesson);
        if (lesson.dispute) {
            throw new ConflictException('По этому уроку уже открыт спор');
        }
        if (!this.isLessonEligible(lesson, new Date())) {
            throw new ConflictException(
                'Спор можно открыть после завершения или отмены урока',
            );
        }

        let created;
        try {
            created = await this.prisma.lessonDispute.create({
                data: {
                    lessonId: lesson.id,
                    openedById: user.id,
                    teacherId: lesson.teacherId,
                    studentId: lesson.studentId,
                    reason: REASON_BY_INPUT[input.reason],
                    description,
                },
            });
        } catch (error) {
            if (this.isUniqueConflict(error)) {
                throw new ConflictException('По этому уроку уже открыт спор');
            }
            throw error;
        }

        let stored: Awaited<ReturnType<LessonDisputeFileStorageService['storeUploads']>> = [];
        try {
            stored = await this.files.storeUploads(
                user.id,
                created.id,
                null,
                validated,
            );
            await this.prisma.$transaction(async (transaction) => {
                if (stored.length) {
                    await transaction.lessonDisputeAttachment.createMany({
                        data: stored.map((file) => ({
                            disputeId: created.id,
                            uploadedById: user.id,
                            storedPath: file.storedPath,
                            originalName: file.originalName,
                            mimeType: file.mimeType,
                            fileSize: file.fileSize,
                        })),
                    });
                }
                await transaction.lessonDisputeEvent.create({
                    data: {
                        disputeId: created.id,
                        actorId: user.id,
                        eventType: 'dispute.opened',
                        toStatus: LessonDisputeStatus.OPEN,
                        details: { reason: input.reason },
                    },
                });
                await this.notifyParticipants(
                    transaction,
                    created,
                    user,
                    'Открыт спор по уроку',
                    `${user.fullName || 'Участник'} открыл(а) спор по уроку «${lesson.subject?.name || lesson.title || 'Занятие'}».`,
                    `lesson-dispute-opened:${created.id}`,
                );
            });
        } catch (error) {
            if (stored.length) {
                await this.files.discardStoredFiles(user.id, stored);
            }
            await this.prisma.lessonDispute.deleteMany({
                where: { id: created.id },
            });
            throw error;
        }

        const result = await this.details(user, created.id);
        return {
            ...result,
            message: 'Спор передан на модерацию',
        };
    }

    async addMessage(
        user: SessionUser,
        disputeId: number,
        input: CreateLessonDisputeMessageDto,
        uploads: LessonDisputeUploadFile[],
    ) {
        this.requireSupportedRole(user);
        const text = input.message_text?.trim() || null;
        const validated = this.files.validateUploads(uploads);
        if (!text && !validated.length) {
            throw new BadRequestException('Введите ответ или прикрепите файл');
        }
        const dispute = await this.prisma.lessonDispute.findUnique({
            where: { id: disputeId },
        });
        if (!dispute) throw new NotFoundException('Спор не найден');
        await this.requireAccess(user, dispute);
        if (!ACTIVE_DISPUTE_STATUSES.includes(dispute.status)) {
            throw new ConflictException('Решённый спор нельзя дополнить');
        }

        const message = await this.prisma.lessonDisputeMessage.create({
            data: {
                disputeId: dispute.id,
                authorId: user.id,
                messageText: text,
            },
        });
        let stored: Awaited<ReturnType<LessonDisputeFileStorageService['storeUploads']>> = [];
        try {
            stored = await this.files.storeUploads(
                user.id,
                dispute.id,
                message.id,
                validated,
            );
            await this.prisma.$transaction(async (transaction) => {
                if (stored.length) {
                    await transaction.lessonDisputeAttachment.createMany({
                        data: stored.map((file) => ({
                            disputeId: dispute.id,
                            messageId: message.id,
                            uploadedById: user.id,
                            storedPath: file.storedPath,
                            originalName: file.originalName,
                            mimeType: file.mimeType,
                            fileSize: file.fileSize,
                        })),
                    });
                }
                await transaction.lessonDisputeEvent.create({
                    data: {
                        disputeId: dispute.id,
                        actorId: user.id,
                        eventType: 'participant.message_added',
                        details: { message_id: message.id },
                    },
                });
                await this.notifyParticipants(
                    transaction,
                    dispute,
                    user,
                    'Новый ответ в споре',
                    `${user.fullName || 'Участник'} добавил(а) ответ к спору по уроку.`,
                    `lesson-dispute-message:${message.id}`,
                );
            });
        } catch (error) {
            if (stored.length) {
                await this.files.discardStoredFiles(user.id, stored);
            }
            await this.prisma.lessonDisputeMessage.deleteMany({
                where: { id: message.id },
            });
            throw error;
        }

        const result = await this.details(user, dispute.id);
        return { ...result, message: 'Ответ добавлен' };
    }

    async download(user: SessionUser, disputeId: number, attachmentId: number) {
        this.requireSupportedRole(user);
        const attachment = await this.prisma.lessonDisputeAttachment.findFirst({
            where: { id: attachmentId, disputeId },
            include: { dispute: true },
        });
        if (!attachment) throw new NotFoundException('Вложение не найдено');
        await this.requireAccess(user, attachment.dispute);
        return this.readAttachment(attachment);
    }

    async downloadForAdministration(disputeId: number, attachmentId: number) {
        const attachment = await this.prisma.lessonDisputeAttachment.findFirst({
            where: { id: attachmentId, disputeId },
        });
        if (!attachment) {
            throw new NotFoundException('Вложение не относится к этому спору');
        }
        return this.readAttachment(attachment);
    }

    async notifyStatusChange(
        transaction: Prisma.TransactionClient,
        dispute: DisputeNotificationRecord,
        actor: SessionUser,
        title: string,
        message: string,
        dedupeKey: string,
    ) {
        await this.notifyParticipants(
            transaction,
            dispute,
            actor,
            title,
            message,
            dedupeKey,
            true,
        );
    }

    serializeDetails(dispute: DisputeDetailsRecord) {
        return {
            ...this.serializeListItem(dispute),
            description: dispute.description,
            resolution: dispute.resolution?.toLowerCase() || null,
            resolution_comment: dispute.resolutionComment,
            handled_by: dispute.handledBy?.fullName || null,
            handled_at: dispute.handledAt,
            can_reply: ACTIVE_DISPUTE_STATUSES.includes(dispute.status),
            attachments: dispute.attachments
                .filter((attachment) => attachment.messageId === null)
                .map((attachment) => this.serializeAttachment(attachment)),
            messages: dispute.messages.map((message) => ({
                id: message.id,
                author_id: message.authorId,
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
                from_status: event.fromStatus?.toLowerCase() || null,
                to_status: event.toStatus?.toLowerCase() || null,
                actor_name: event.actor?.fullName || 'Система',
                actor_role: event.actor?.role.toLowerCase() || null,
                details: event.details,
                created_at: event.createdAt,
            })),
        };
    }

    private async findDetails(disputeId: number) {
        return this.prisma.lessonDispute.findUnique({
            where: { id: disputeId },
            include: disputeDetailsInclude,
        });
    }

    private async readAttachment(attachment: {
        storedPath: string;
        originalName: string;
        mimeType: string;
    }) {
        const stored = await this.files.readStoredFile(attachment.storedPath);
        return {
            ...stored,
            originalName: normalizeUploadedFileName(attachment.originalName),
            mimeType: attachment.mimeType,
        };
    }

    private serializeListItem(dispute: DisputeListRecord) {
        return {
            id: dispute.id,
            lesson_id: dispute.lessonId,
            reason: dispute.reason.toLowerCase(),
            status: dispute.status.toLowerCase(),
            opened_by_id: dispute.openedById,
            opened_by_name: dispute.openedBy.fullName || 'Пользователь',
            opened_by_role: dispute.openedBy.role.toLowerCase(),
            teacher_id: dispute.teacherId,
            teacher_name: dispute.teacher.fullName || 'Преподаватель',
            student_id: dispute.studentId,
            student_name: dispute.student.fullName || 'Ученик',
            lesson: {
                id: dispute.lesson.id,
                title: dispute.lesson.subject?.name
                    || dispute.lesson.title
                    || 'Занятие',
                lesson_date: dispute.lesson.lessonDate,
                status: dispute.lesson.status.toLowerCase(),
            },
            message_count: dispute._count.messages,
            attachment_count: dispute._count.attachments,
            created_at: dispute.createdAt,
            updated_at: dispute.updatedAt,
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
            original_name: normalizeUploadedFileName(attachment.originalName),
            mime_type: attachment.mimeType,
            file_size: attachment.fileSize,
            created_at: attachment.createdAt,
        };
    }

    private serializeUploadLimits() {
        const limits = this.files.limits();
        return {
            max_files: limits.maxFiles,
            max_file_bytes: limits.maxFileBytes,
            max_total_bytes: limits.maxTotalBytes,
        };
    }

    private async accessWhere(
        user: SessionUser,
        selectedStudentId?: number,
    ): Promise<Prisma.LessonDisputeWhereInput> {
        if (user.role === UserRole.TEACHER) return { teacherId: user.id };
        if (user.role === UserRole.STUDENT) return { studentId: user.id };
        const studentIds = await this.parentStudentIds(user, selectedStudentId);
        return { studentId: { in: studentIds } };
    }

    private async parentStudentIds(
        user: SessionUser,
        selectedStudentId?: number,
    ) {
        if (user.role !== UserRole.PARENT) return [];
        const ids = await this.parentChildAccess.listCurrentMinorStudentIds(user.id);
        if (selectedStudentId && !ids.includes(selectedStudentId)) {
            throw new ForbiddenException('Данные этого ребёнка недоступны');
        }
        return selectedStudentId ? [selectedStudentId] : ids;
    }

    private async requireAccess(
        user: SessionUser,
        dispute: { teacherId: number; studentId: number },
    ) {
        if (user.role === UserRole.TEACHER && dispute.teacherId === user.id) return;
        if (user.role === UserRole.STUDENT && dispute.studentId === user.id) return;
        if (
            user.role === UserRole.PARENT
            && await this.parentChildAccess.hasCurrentMinorAccess(
                user.id,
                dispute.studentId,
            )
        ) return;
        throw new ForbiddenException('Спор вам недоступен');
    }

    private async requireLessonAccess(
        user: SessionUser,
        lesson: { teacherId: number; studentId: number },
    ) {
        if (user.role === UserRole.TEACHER && lesson.teacherId === user.id) return;
        if (user.role === UserRole.STUDENT && lesson.studentId === user.id) return;
        if (
            user.role === UserRole.PARENT
            && await this.parentChildAccess.hasCurrentMinorAccess(
                user.id,
                lesson.studentId,
            )
        ) return;
        throw new ForbiddenException('Урок вам недоступен');
    }

    private isLessonEligible(lesson: {
        lessonDate: Date;
        durationMinutes: number;
        status: LessonStatus;
        session?: { status: LessonSessionStatus } | null;
    }, now: Date) {
        if (
            lesson.status === LessonStatus.ACTIVE
            || lesson.session?.status === LessonSessionStatus.ACTIVE
        ) return false;
        if (
            lesson.status === LessonStatus.CANCELLED
            || lesson.status === LessonStatus.COMPLETED
        ) return true;
        const scheduledEnd = lesson.lessonDate.getTime()
            + lesson.durationMinutes * 60_000;
        return scheduledEnd <= now.getTime();
    }

    private async notifyParticipants(
        transaction: Prisma.TransactionClient,
        dispute: DisputeNotificationRecord,
        actor: SessionUser,
        title: string,
        message: string,
        dedupeKey: string,
        includeParents = false,
    ) {
        const recipients = [dispute.teacherId, dispute.studentId]
            .filter((id) => id !== actor.id);
        await Promise.all(recipients.map((userId) => this.notifications.create(
            transaction,
            {
                userId,
                type: 'lesson_dispute_updated',
                title,
                message,
                targetSection: 'disputes',
                targetEntityType: 'lesson_dispute',
                targetEntityId: dispute.id,
                dedupeKey: `${dedupeKey}:${userId}`,
            },
        )));
        if (includeParents || actor.role !== UserRole.PARENT) {
            await this.notifications.createForActiveParents(
                transaction,
                dispute.studentId,
                {
                    category: 'schedule',
                    type: 'parent_lesson_dispute_updated',
                    title,
                    message,
                    targetSection: 'disputes',
                    targetEntityType: 'lesson_dispute',
                    targetEntityId: dispute.id,
                    dedupeKey,
                },
            );
        }
    }

    private requireSupportedRole(user: SessionUser) {
        if (
            user.role !== UserRole.TEACHER
            && user.role !== UserRole.STUDENT
            && user.role !== UserRole.PARENT
        ) {
            throw new ForbiddenException('Споры доступны только участникам обучения');
        }
    }

    private isUniqueConflict(error: unknown) {
        return Boolean(
            error
            && typeof error === 'object'
            && 'code' in error
            && error.code === 'P2002',
        );
    }
}
