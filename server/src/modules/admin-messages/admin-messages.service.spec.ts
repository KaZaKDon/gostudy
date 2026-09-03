import { describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
    MessageChannelType,
    MessageReportReason,
    MessageReportStatus,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { MessagesService } from '../messages/messages.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AdminMessagesService } from './admin-messages.service';

const admin: SessionUser = {
    id: 1,
    role: UserRole.ADMIN,
    email: 'admin@example.com',
    fullName: 'Администратор',
    phone: null,
    avatarUrl: null,
    status: UserStatus.ACTIVE,
    emailVerifiedAt: new Date(),
    profileCompleted: true,
};

describe('AdminMessagesService', () => {
    it('lists only reports rather than exposing a dialog browser', async () => {
        const createdAt = new Date();
        const prisma = {
            messageReport: {
                count: vi.fn().mockResolvedValue(1),
                findMany: vi.fn().mockResolvedValue([{
                    id: 3,
                    messageId: 8,
                    reason: MessageReportReason.SPAM,
                    comment: null,
                    status: MessageReportStatus.PENDING,
                    resolutionComment: null,
                    createdAt,
                    handledAt: null,
                    reporter: { fullName: 'Ученик', email: 's@example.com' },
                    message: {
                        messageText: 'Реклама',
                        hiddenAt: null,
                        sender: { fullName: 'Учитель', email: 't@example.com' },
                        dialog: {
                            channelType: MessageChannelType.STUDENT,
                            teacher: { fullName: 'Учитель' },
                            student: { fullName: 'Ученик' },
                            parent: null,
                        },
                    },
                }]),
            },
        } as unknown as PrismaService;
        const service = new AdminMessagesService(
            prisma,
            {} as NotificationsService,
            {} as MessagesService,
        );

        const result = await service.list(admin, {
            page: 1,
            limit: 20,
            status: 'pending',
        });

        expect(prisma.messageReport.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { status: MessageReportStatus.PENDING },
            }),
        );
        expect(result).toMatchObject({
            success: true,
            data: { items: [{ id: 3, message_preview: 'Реклама' }] },
        });
    });

    it('audits every opening of the limited message context', async () => {
        const createdAt = new Date();
        const reportedMessage = {
            id: 8,
            dialogId: 4,
            senderId: 7,
            messageText: 'Сообщение',
            createdAt,
            sender: { id: 7, fullName: 'Учитель', email: 't@example.com' },
            attachments: [],
        };
        const prisma = {
            messageReport: {
                findUnique: vi.fn().mockResolvedValue({
                    id: 3,
                    messageId: 8,
                    reason: MessageReportReason.OTHER,
                    comment: 'Проверить',
                    status: MessageReportStatus.PENDING,
                    resolutionComment: null,
                    createdAt,
                    handledAt: null,
                    handledBy: null,
                    reporter: { id: 9, fullName: 'Ученик', email: 's@example.com' },
                    message: reportedMessage,
                }),
            },
            message: {
                findMany: vi.fn().mockResolvedValue([]),
            },
            messageDialog: {
                findUnique: vi.fn().mockResolvedValue({
                    channelType: MessageChannelType.STUDENT,
                    teacher: { fullName: 'Учитель' },
                    student: { fullName: 'Ученик' },
                    parent: null,
                }),
            },
            adminAuditLog: {
                create: vi.fn().mockResolvedValue(undefined),
            },
        } as unknown as PrismaService;
        const messages = {
            serializeForAdministration: vi.fn().mockReturnValue({ id: 8 }),
        } as unknown as MessagesService;
        const service = new AdminMessagesService(
            prisma,
            {} as NotificationsService,
            messages,
        );

        const result = await service.details(admin, 3, {
            ipAddress: '127.0.0.1',
            userAgent: 'test',
        });

        expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                adminId: 1,
                action: 'message_report.context_viewed',
                entityId: 3,
            }),
        });
        expect(result).toMatchObject({
            success: true,
            data: { context: [{ id: 8, is_reported: true }] },
        });
    });
});
