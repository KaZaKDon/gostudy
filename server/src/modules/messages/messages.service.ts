import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { normalizeUploadedFileName } from '../../common/files/upload-file-name';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import {
    MessageChannelType,
    MessageReportReason,
    MessageReportStatus,
    MessageSenderContext,
    ParentStudentStatus,
    TeacherStudentStatus,
    UserRole,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { NotificationsService } from '../notifications/notifications.service';
import type {
    MessageDialogQueryDto,
    MessageThreadQueryDto,
} from './dto/message-dialog-query.dto';
import type { ReportMessageDto } from './dto/report-message.dto';
import type { SendMessageDto } from './dto/send-message.dto';
import {
    MessageFileStorageService,
    type MessageUploadFile,
} from './message-file-storage.service';

const REPORT_REASON = {
    spam: MessageReportReason.SPAM,
    abuse: MessageReportReason.ABUSE,
    inappropriate: MessageReportReason.INAPPROPRIATE,
    threat: MessageReportReason.THREAT,
    other: MessageReportReason.OTHER,
} as const;

const messageInclude = {
    sender: { select: { id: true, fullName: true, email: true } },
    attachments: { orderBy: { id: 'asc' as const } },
} satisfies Prisma.MessageInclude;

type MessageRecord = Prisma.MessageGetPayload<{
    include: typeof messageInclude;
}>;

type DialogAccess = {
    teacherId: number;
    studentId: number;
    parentId: number | null;
    channelType: MessageChannelType;
    channelKey: string;
    canSend: boolean;
};

@Injectable()
export class MessagesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly notifications: NotificationsService,
        private readonly files: MessageFileStorageService,
    ) {}

    async dialogs(user: SessionUser) {
        this.requireSupportedRole(user);
        const parentLinks = user.role === UserRole.PARENT
            ? await this.prisma.parentStudent.findMany({
                where: { parentId: user.id, verifiedAt: { not: null } },
                select: { studentId: true, status: true },
            })
            : [];
        const childIds = parentLinks.map((link) => link.studentId);
        const relations = await this.prisma.teacherStudent.findMany({
            where: {
                status: {
                    in: [TeacherStudentStatus.ACTIVE, TeacherStudentStatus.ARCHIVED],
                },
                ...(user.role === UserRole.TEACHER
                    ? { teacherId: user.id }
                    : user.role === UserRole.STUDENT
                        ? { studentId: user.id }
                        : { studentId: { in: childIds } }),
            },
            include: {
                teacher: { select: { id: true, fullName: true, avatarUrl: true } },
                student: {
                    select: {
                        id: true,
                        fullName: true,
                        avatarUrl: true,
                        studentProfile: {
                            select: { classLevel: true },
                        },
                    },
                },
                subject: { select: { name: true } },
            },
        });
        const pairKeys = new Set(
            relations.map((item) => `${item.teacherId}:${item.studentId}`),
        );
        const studentIds = [...new Set(relations.map((item) => item.studentId))];
        const linksForTeacher = user.role === UserRole.TEACHER && studentIds.length
            ? await this.prisma.parentStudent.findMany({
                where: {
                    studentId: { in: studentIds },
                    verifiedAt: { not: null },
                },
                include: {
                    parent: { select: { id: true, fullName: true, avatarUrl: true } },
                },
            })
            : [];
        const parentReadLinks = user.role === UserRole.TEACHER
            ? linksForTeacher
            : user.role === UserRole.STUDENT
                ? await this.prisma.parentStudent.findMany({
                    where: {
                        studentId: user.id,
                        verifiedAt: { not: null },
                        status: {
                            in: [ParentStudentStatus.ACTIVE, ParentStudentStatus.ARCHIVED],
                        },
                    },
                    select: { studentId: true },
                })
                : [];
        const storedDialogs = await this.prisma.messageDialog.findMany({
            where: user.role === UserRole.TEACHER
                ? { teacherId: user.id }
                : user.role === UserRole.STUDENT
                    ? { studentId: user.id, channelType: MessageChannelType.STUDENT }
                    : {
                        OR: [
                            { parentId: user.id, channelType: MessageChannelType.PARENT },
                            { studentId: { in: childIds }, channelType: MessageChannelType.STUDENT },
                        ],
                    },
            include: {
                teacher: { select: { fullName: true, avatarUrl: true } },
                student: {
                    select: {
                        fullName: true,
                        avatarUrl: true,
                        studentProfile: { select: { classLevel: true } },
                    },
                },
                parent: { select: { fullName: true, avatarUrl: true } },
                messages: {
                    orderBy: { id: 'desc' },
                    take: 1,
                    select: {
                        messageText: true,
                        hiddenAt: true,
                        attachments: { select: { id: true }, take: 1 },
                    },
                },
                _count: {
                    select: {
                        messages: {
                            where: {
                                isRead: false,
                                hiddenAt: null,
                                senderId: { not: user.id },
                            },
                        },
                    },
                },
            },
        });

        const pairs = this.groupRelations(relations);
        const dialogsByKey = new Map<string, Record<string, unknown>>();
        const storedByKey = new Map(
            storedDialogs.map((dialog) => [
                `${dialog.teacherId}:${dialog.studentId}:${dialog.channelKey}`,
                dialog,
            ]),
        );

        for (const pair of pairs.values()) {
            if (user.role !== UserRole.PARENT) {
                const key = `${pair.teacherId}:${pair.studentId}:student`;
                dialogsByKey.set(key, this.serializeDialogCandidate(
                    user,
                    pair,
                    MessageChannelType.STUDENT,
                    null,
                    storedByKey.get(key),
                    true,
                    parentReadLinks.some((link) => link.studentId === pair.studentId),
                ));
            }
            if (user.role === UserRole.PARENT) {
                const parentLink = parentLinks.find(
                    (link) => link.studentId === pair.studentId,
                );
                if (parentLink) {
                    const key = `${pair.teacherId}:${pair.studentId}:student`;
                    const stored = storedByKey.get(key);
                    if (parentLink.status === ParentStudentStatus.ACTIVE
                        || parentLink.status === ParentStudentStatus.ARCHIVED
                        || stored) {
                        dialogsByKey.set(key, this.serializeDialogCandidate(
                            user,
                            pair,
                            MessageChannelType.STUDENT,
                            null,
                            stored,
                            false,
                            false,
                        ));
                    }
                }
            }
            const availableLinks = user.role === UserRole.TEACHER
                ? linksForTeacher.filter((link) => link.studentId === pair.studentId)
                : user.role === UserRole.PARENT
                    ? parentLinks.filter((link) => link.studentId === pair.studentId)
                        .map((link) => ({
                            ...link,
                            parentId: user.id,
                            parent: {
                                id: user.id,
                                fullName: user.fullName,
                                avatarUrl: user.avatarUrl,
                            },
                        }))
                    : [];
            for (const link of availableLinks) {
                const channelKey = `parent:${link.parentId}`;
                const key = `${pair.teacherId}:${pair.studentId}:${channelKey}`;
                const stored = storedByKey.get(key);
                if (link.status === ParentStudentStatus.ACTIVE || stored) {
                    dialogsByKey.set(key, this.serializeDialogCandidate(
                        user,
                        pair,
                        MessageChannelType.PARENT,
                        link.parent,
                        stored,
                        link.status === ParentStudentStatus.ACTIVE,
                    ));
                }
            }
        }

        for (const dialog of storedDialogs) {
            const pairKey = `${dialog.teacherId}:${dialog.studentId}`;
            if (!pairKeys.has(pairKey)) continue;
            const key = `${pairKey}:${dialog.channelKey}`;
            if (!dialogsByKey.has(key)) {
                const pair = pairs.get(pairKey);
                if (pair) {
                    dialogsByKey.set(key, this.serializeDialogCandidate(
                        user,
                        pair,
                        dialog.channelType,
                        dialog.parent,
                        dialog,
                        false,
                    ));
                }
            }
        }

        const dialogs = [...dialogsByKey.values()].sort((left, right) => {
            const leftTime = String(left.last_message_at || '');
            const rightTime = String(right.last_message_at || '');
            return rightTime.localeCompare(leftTime)
                || String(left.display_name).localeCompare(String(right.display_name), 'ru');
        });

        return {
            success: true,
            dialogs,
            total_unread: dialogs.reduce(
                (sum, dialog) => sum + Number(dialog.unread_count || 0),
                0,
            ),
            upload_limits: this.serializeLimits(),
            transport: 'rest',
        };
    }

    async thread(user: SessionUser, query: MessageThreadQueryDto) {
        const access = await this.requireDialogAccess(user, query);
        const dialog = await this.prisma.messageDialog.findUnique({
            where: {
                teacherId_studentId_channelKey: {
                    teacherId: access.teacherId,
                    studentId: access.studentId,
                    channelKey: access.channelKey,
                },
            },
        });
        if (!dialog) {
            return {
                success: true,
                dialog_id: null,
                messages: [],
                has_more: false,
                next_before_id: null,
                can_send: access.canSend,
            };
        }

        const rows = await this.prisma.message.findMany({
            where: {
                dialogId: dialog.id,
                ...(query.before_id ? { id: { lt: query.before_id } } : {}),
            },
            include: messageInclude,
            orderBy: { id: 'desc' },
            take: query.limit + 1,
        });
        const hasMore = rows.length > query.limit;
        const page = (hasMore ? rows.slice(0, query.limit) : rows).reverse();

        return {
            success: true,
            dialog_id: dialog.id,
            messages: page.map((message) => this.serializeMessage(message, user)),
            has_more: hasMore,
            next_before_id: hasMore && page.length ? page[0].id : null,
            can_send: access.canSend,
        };
    }

    async send(
        user: SessionUser,
        input: SendMessageDto,
        uploads: MessageUploadFile[],
    ) {
        const access = await this.requireDialogAccess(user, input);
        if (!access.canSend) {
            throw new ConflictException(
                'Переписка сохранена в истории, но отправка недоступна',
            );
        }
        const validated = this.files.validateUploads(uploads);
        const text = input.message_text?.trim() || null;
        if (!text && !validated.length) {
            throw new BadRequestException('Введите сообщение или прикрепите файл');
        }

        const dialog = await this.prisma.messageDialog.upsert({
            where: {
                teacherId_studentId_channelKey: {
                    teacherId: access.teacherId,
                    studentId: access.studentId,
                    channelKey: access.channelKey,
                },
            },
            update: {},
            create: {
                teacherId: access.teacherId,
                studentId: access.studentId,
                parentId: access.parentId,
                channelType: access.channelType,
                channelKey: access.channelKey,
            },
        });
        const created = await this.prisma.message.create({
            data: {
                dialogId: dialog.id,
                senderId: user.id,
                senderContext: this.senderContext(user),
                messageText: text,
            },
        });
        let stored: Awaited<ReturnType<MessageFileStorageService['storeUploads']>> = [];

        try {
            stored = await this.files.storeUploads(created.id, validated);
            const recipientId = user.id === access.teacherId
                ? (access.channelType === MessageChannelType.STUDENT
                    ? access.studentId
                    : access.parentId)
                : access.teacherId;
            if (!recipientId) {
                throw new BadRequestException('Получатель сообщения не найден');
            }
            const now = new Date();
            await this.prisma.$transaction(async (transaction) => {
                if (stored.length) {
                    await transaction.messageAttachment.createMany({
                        data: stored.map((file) => ({
                            messageId: created.id,
                            storedPath: file.storedPath,
                            originalName: file.originalName,
                            mimeType: file.mimeType,
                            fileSize: file.fileSize,
                        })),
                    });
                }
                await transaction.messageDialog.update({
                    where: { id: dialog.id },
                    data: { lastMessageAt: now },
                });
                const parentRecipient = access.channelType
                    === MessageChannelType.PARENT
                    && recipientId === access.parentId;
                const recipientNotificationsEnabled = parentRecipient
                    ? await this.notifications.isParentCategoryEnabled(
                        transaction,
                        recipientId,
                        access.studentId,
                        'messages',
                    )
                    : true;

                if (recipientNotificationsEnabled) {
                    await this.notifications.create(transaction, {
                        userId: recipientId,
                        type: 'message_received',
                        title: access.channelType === MessageChannelType.PARENT
                            ? 'Новое сообщение в родительском чате'
                            : 'Новое сообщение',
                        message: `${user.fullName || 'Пользователь'}: ${this.preview(text, stored.length)}`,
                        targetSection: 'messages',
                        targetEntityType: 'dialog',
                        targetEntityId: dialog.id,
                        dedupeKey: `message:${created.id}`,
                    });
                }

                if (
                    user.id === access.teacherId
                    && access.channelType === MessageChannelType.STUDENT
                ) {
                    await this.notifications.createForActiveParents(
                        transaction,
                        access.studentId,
                        {
                            category: 'messages',
                            type: 'parent_child_message_received',
                            title: 'Новое сообщение в чате ребёнка',
                            message: `${user.fullName || 'Преподаватель'}: ${this.preview(text, stored.length)}`,
                            targetSection: 'messages',
                            targetEntityType: 'dialog',
                            targetEntityId: dialog.id,
                            dedupeKey: `message:${created.id}`,
                        },
                    );
                }
            });
        } catch (error) {
            await this.files.removeStoredPaths(
                stored.map((file) => file.storedPath),
            );
            await this.prisma.message.deleteMany({ where: { id: created.id } });
            throw error;
        }

        const message = await this.prisma.message.findUnique({
            where: { id: created.id },
            include: messageInclude,
        });
        if (!message) throw new NotFoundException('Сообщение не найдено');

        return {
            success: true,
            dialog_id: dialog.id,
            message: this.serializeMessage(message, user),
        };
    }

    async markRead(user: SessionUser, input: MessageDialogQueryDto) {
        const access = await this.requireDialogAccess(user, input);
        const dialog = await this.prisma.messageDialog.findUnique({
            where: {
                teacherId_studentId_channelKey: {
                    teacherId: access.teacherId,
                    studentId: access.studentId,
                    channelKey: access.channelKey,
                },
            },
        });
        if (!dialog) return { success: true, updated_count: 0 };
        const now = new Date();
        const result = await this.prisma.$transaction(async (transaction) => {
            const updated = await transaction.message.updateMany({
                where: {
                    dialogId: dialog.id,
                    senderId: { not: user.id },
                    isRead: false,
                },
                data: { isRead: true, readAt: now },
            });
            await this.notifications.markEntityRead(
                transaction,
                user.id,
                'dialog',
                dialog.id,
            );
            return updated;
        });

        return { success: true, updated_count: result.count };
    }

    async report(user: SessionUser, input: ReportMessageDto) {
        this.requireSupportedRole(user);
        const message = await this.prisma.message.findUnique({
            where: { id: input.message_id },
            include: { dialog: true },
        });
        if (!message) throw new NotFoundException('Сообщение не найдено');
        await this.requireAccessToStoredDialog(user, message.dialog);
        if (message.hiddenAt) {
            throw new ConflictException('Сообщение уже скрыто администрацией');
        }
        if (message.senderId === user.id) {
            throw new BadRequestException('Нельзя пожаловаться на своё сообщение');
        }
        const duplicate = await this.prisma.messageReport.findFirst({
            where: {
                messageId: message.id,
                reporterId: user.id,
                status: MessageReportStatus.PENDING,
            },
        });
        if (duplicate) {
            throw new ConflictException('Жалоба уже передана администрации');
        }
        await this.prisma.messageReport.create({
            data: {
                messageId: message.id,
                reporterId: user.id,
                reason: REPORT_REASON[input.reason],
                comment: input.comment?.trim() || null,
            },
        });

        return { success: true, message: 'Жалоба передана администрации' };
    }

    async download(user: SessionUser, attachmentId: number) {
        this.requireSupportedRole(user);
        const attachment = await this.prisma.messageAttachment.findUnique({
            where: { id: attachmentId },
            include: { message: { include: { dialog: true } } },
        });
        if (!attachment) throw new NotFoundException('Вложение не найдено');
        await this.requireAccessToStoredDialog(user, attachment.message.dialog);
        if (attachment.message.hiddenAt) {
            throw new ForbiddenException('Сообщение скрыто администрацией');
        }
        const stored = await this.files.readStoredFile(attachment.storedPath);

        return {
            ...stored,
            originalName: normalizeUploadedFileName(attachment.originalName),
            mimeType: attachment.mimeType,
        };
    }

    async downloadForAdministration(attachmentId: number) {
        const attachment = await this.prisma.messageAttachment.findUnique({
            where: { id: attachmentId },
        });
        if (!attachment) throw new NotFoundException('Вложение не найдено');
        const stored = await this.files.readStoredFile(attachment.storedPath);
        return {
            ...stored,
            originalName: normalizeUploadedFileName(attachment.originalName),
            mimeType: attachment.mimeType,
        };
    }

    serializeForAdministration(message: MessageRecord) {
        return {
            id: message.id,
            sender_id: message.senderId,
            sender_context: message.senderContext.toLowerCase(),
            author_name: message.sender.fullName || message.sender.email,
            message_text: message.messageText,
            is_read: message.isRead,
            is_hidden: Boolean(message.hiddenAt),
            hidden_reason: message.hiddenReason,
            created_at: message.createdAt,
            attachments: message.attachments.map((attachment) => ({
                id: attachment.id,
                original_name: normalizeUploadedFileName(attachment.originalName),
                mime_type: attachment.mimeType,
                file_size: attachment.fileSize,
            })),
        };
    }

    private async requireDialogAccess(
        user: SessionUser,
        input: MessageDialogQueryDto,
    ): Promise<DialogAccess> {
        this.requireSupportedRole(user);
        const relations = await this.prisma.teacherStudent.findMany({
            where: {
                teacherId: input.teacher_id,
                studentId: input.student_id,
                status: {
                    in: [TeacherStudentStatus.ACTIVE, TeacherStudentStatus.ARCHIVED],
                },
            },
            select: { status: true },
        });
        if (!relations.length) {
            throw new NotFoundException('Связь преподавателя с учеником не найдена');
        }
        const relationActive = relations.some(
            (relation) => relation.status === TeacherStudentStatus.ACTIVE,
        );
        if (input.channel_type === 'student') {
            if (input.parent_id) {
                throw new BadRequestException('Для чата с учеником parent_id не используется');
            }
            if (user.role === UserRole.PARENT) {
                const parentLink = await this.prisma.parentStudent.findFirst({
                    where: {
                        parentId: user.id,
                        studentId: input.student_id,
                        verifiedAt: { not: null },
                        status: {
                            in: [ParentStudentStatus.ACTIVE, ParentStudentStatus.ARCHIVED],
                        },
                    },
                });
                if (!parentLink) {
                    throw new NotFoundException('Подтверждённая связь с ребёнком не найдена');
                }
                return {
                    teacherId: input.teacher_id,
                    studentId: input.student_id,
                    parentId: null,
                    channelType: MessageChannelType.STUDENT,
                    channelKey: 'student',
                    canSend: false,
                };
            }
            if (
                (user.role === UserRole.TEACHER && user.id !== input.teacher_id)
                || (user.role === UserRole.STUDENT && user.id !== input.student_id)
            ) {
                throw new ForbiddenException('Нет доступа к этой переписке');
            }
            return {
                teacherId: input.teacher_id,
                studentId: input.student_id,
                parentId: null,
                channelType: MessageChannelType.STUDENT,
                channelKey: 'student',
                canSend: relationActive,
            };
        }
        if (!input.parent_id) {
            throw new BadRequestException('Для родительского чата требуется parent_id');
        }
        if (
            (user.role === UserRole.TEACHER && user.id !== input.teacher_id)
            || (user.role === UserRole.PARENT && user.id !== input.parent_id)
            || user.role === UserRole.STUDENT
        ) {
            throw new ForbiddenException('Нет доступа к родительской переписке');
        }
        const parentLink = await this.prisma.parentStudent.findFirst({
            where: {
                parentId: input.parent_id,
                studentId: input.student_id,
                verifiedAt: { not: null },
                status: {
                    in: [ParentStudentStatus.ACTIVE, ParentStudentStatus.ARCHIVED],
                },
            },
        });
        if (!parentLink) {
            throw new NotFoundException('Подтверждённая связь с родителем не найдена');
        }

        return {
            teacherId: input.teacher_id,
            studentId: input.student_id,
            parentId: input.parent_id,
            channelType: MessageChannelType.PARENT,
            channelKey: `parent:${input.parent_id}`,
            canSend: relationActive && parentLink.status === ParentStudentStatus.ACTIVE,
        };
    }

    private async requireAccessToStoredDialog(
        user: SessionUser,
        dialog: {
            teacherId: number;
            studentId: number;
            parentId: number | null;
            channelType: MessageChannelType;
        },
    ) {
        if (user.role === UserRole.TEACHER && user.id === dialog.teacherId) return;
        if (
            user.role === UserRole.STUDENT
            && dialog.channelType === MessageChannelType.STUDENT
            && user.id === dialog.studentId
        ) return;
        if (
            user.role === UserRole.PARENT
            && dialog.channelType === MessageChannelType.PARENT
            && user.id === dialog.parentId
        ) return;
        throw new ForbiddenException('Нет доступа к этой переписке');
    }

    private groupRelations(relations: Array<{
        teacherId: number;
        studentId: number;
        status: TeacherStudentStatus;
        teacher: { id: number; fullName: string | null; avatarUrl: string | null };
        student: {
            id: number;
            fullName: string | null;
            avatarUrl: string | null;
            studentProfile: { classLevel: string | null } | null;
        };
        subject: { name: string };
    }>) {
        const pairs = new Map<string, {
            teacherId: number;
            studentId: number;
            teacher: (typeof relations)[number]['teacher'];
            student: (typeof relations)[number]['student'];
            subjectNames: string[];
            canSend: boolean;
        }>();
        for (const relation of relations) {
            const key = `${relation.teacherId}:${relation.studentId}`;
            const current = pairs.get(key);
            if (current) {
                if (!current.subjectNames.includes(relation.subject.name)) {
                    current.subjectNames.push(relation.subject.name);
                }
                current.canSend ||= relation.status === TeacherStudentStatus.ACTIVE;
            } else {
                pairs.set(key, {
                    teacherId: relation.teacherId,
                    studentId: relation.studentId,
                    teacher: relation.teacher,
                    student: relation.student,
                    subjectNames: [relation.subject.name],
                    canSend: relation.status === TeacherStudentStatus.ACTIVE,
                });
            }
        }
        return pairs;
    }

    private serializeDialogCandidate(
        user: SessionUser,
        pair: {
            teacherId: number;
            studentId: number;
            teacher: { fullName: string | null; avatarUrl: string | null };
            student: {
                fullName: string | null;
                avatarUrl: string | null;
                studentProfile: { classLevel: string | null } | null;
            };
            subjectNames: string[];
            canSend: boolean;
        },
        channelType: MessageChannelType,
        parent: { id?: number; fullName: string | null; avatarUrl: string | null } | null,
        stored?: {
            id: number;
            parentId: number | null;
            channelKey: string;
            lastMessageAt: Date | null;
            messages: Array<{
                messageText: string | null;
                hiddenAt: Date | null;
                attachments: Array<{ id: number }>;
            }>;
            _count: { messages: number };
        },
        parentCanSend = true,
        parentCanRead = false,
    ) {
        const isParentChannel = channelType === MessageChannelType.PARENT;
        const channelKey = stored?.channelKey
            || (isParentChannel ? `parent:${parent?.id}` : 'student');
        const last = stored?.messages[0];
        const displayName = user.role === UserRole.TEACHER
            ? isParentChannel
                ? parent?.fullName || 'Родитель ученика'
                : pair.student.fullName || 'Ученик'
            : user.role === UserRole.PARENT && !isParentChannel
                ? `Чат ребёнка · ${pair.student.fullName || 'ученик'}`
                : pair.teacher.fullName || 'Преподаватель';
        const subtitleParts = user.role === UserRole.TEACHER
            ? isParentChannel
                ? [`Родитель · ${pair.student.fullName || 'ученика'}`, ...pair.subjectNames]
                : [pair.student.studentProfile?.classLevel, ...pair.subjectNames]
            : isParentChannel
                ? [`Родительский чат · ${pair.student.fullName || 'ученик'}`, ...pair.subjectNames]
                : [`Преподаватель · ${pair.student.fullName || 'ученик'}`, ...pair.subjectNames];

        return {
            id: stored?.id || null,
            key: `${pair.teacherId}:${pair.studentId}:${channelKey}`,
            teacher_id: pair.teacherId,
            student_id: pair.studentId,
            parent_id: isParentChannel ? (stored?.parentId || parent?.id || null) : null,
            channel_type: channelType.toLowerCase(),
            display_name: displayName,
            subtitle: subtitleParts.filter(Boolean).join(' · '),
            avatar_url: user.role === UserRole.TEACHER
                ? isParentChannel ? parent?.avatarUrl : pair.student.avatarUrl
                : pair.teacher.avatarUrl,
            last_message: last?.hiddenAt
                ? 'Сообщение скрыто администрацией'
                : last?.messageText || (last?.attachments.length ? 'Вложение' : ''),
            last_message_at: stored?.lastMessageAt || null,
            unread_count: stored?._count.messages || 0,
            can_send: user.role === UserRole.PARENT && !isParentChannel
                ? false
                : pair.canSend && (!isParentChannel || parentCanSend),
            parent_access_notice: isParentChannel
                ? null
                : parentCanRead
                    ? 'Эту переписку может читать подтверждённый родитель ученика.'
                    : null,
        };
    }

    private serializeMessage(message: MessageRecord, viewer: SessionUser | null) {
        const hidden = Boolean(message.hiddenAt);
        return {
            id: message.id,
            sender_id: message.senderId,
            sender_context: message.senderContext.toLowerCase(),
            author_name: message.sender.fullName || message.sender.email,
            message_text: hidden ? 'Сообщение скрыто администрацией' : message.messageText,
            is_read: message.isRead,
            is_own: viewer ? message.senderId === viewer.id : false,
            is_hidden: hidden,
            created_at: message.createdAt,
            attachments: hidden ? [] : message.attachments.map((attachment) => ({
                id: attachment.id,
                original_name: normalizeUploadedFileName(attachment.originalName),
                mime_type: attachment.mimeType,
                file_size: attachment.fileSize,
            })),
        };
    }

    private senderContext(user: SessionUser): MessageSenderContext {
        if (user.role === UserRole.TEACHER) return MessageSenderContext.TEACHER;
        if (user.role === UserRole.PARENT) return MessageSenderContext.PARENT;
        return MessageSenderContext.STUDENT;
    }

    private preview(text: string | null, filesCount: number): string {
        const value = text || (filesCount === 1 ? 'Вложение' : `Вложения: ${filesCount}`);
        return value.length > 180 ? `${value.slice(0, 177)}...` : value;
    }

    private serializeLimits() {
        const limits = this.files.limits();
        return {
            max_files: limits.maxFiles,
            max_file_bytes: limits.maxFileBytes,
            max_total_bytes: limits.maxTotalBytes,
        };
    }

    private requireSupportedRole(user: SessionUser) {
        if (
            user.role !== UserRole.TEACHER
            && user.role !== UserRole.STUDENT
            && user.role !== UserRole.PARENT
        ) {
            throw new ForbiddenException(
                'Сообщения доступны преподавателям, ученикам и родителям',
            );
        }
    }
}
