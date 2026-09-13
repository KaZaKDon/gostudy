import {
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
    MessageChannelType,
    MessageSenderContext,
    TeacherStudentStatus,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { NotificationsService } from '../notifications/notifications.service';
import { MessageFileStorageService } from './message-file-storage.service';
import { MessagesService } from './messages.service';

const student: SessionUser = {
    id: 9,
    role: UserRole.STUDENT,
    email: 'student@example.com',
    fullName: 'Иван Ученик',
    phone: null,
    avatarUrl: null,
    status: UserStatus.ACTIVE,
    emailVerifiedAt: new Date(),
    profileCompleted: true,
};

function createService(prisma: PrismaService) {
    const notifications = {
        create: vi.fn().mockResolvedValue(undefined),
        createForActiveParents: vi.fn().mockResolvedValue(undefined),
        isParentCategoryEnabled: vi.fn().mockResolvedValue(true),
        markEntityRead: vi.fn().mockResolvedValue(undefined),
    } as unknown as NotificationsService;
    const files = {
        validateUploads: vi.fn((items) => items),
        storeUploads: vi.fn().mockResolvedValue([]),
        removeStoredPaths: vi.fn().mockResolvedValue(undefined),
        limits: vi.fn().mockReturnValue({
            maxFiles: 5,
            maxFileBytes: 10,
            maxTotalBytes: 30,
        }),
    } as unknown as MessageFileStorageService;
    return {
        instance: new MessagesService(prisma, notifications, files),
        notifications,
    };
}

describe('MessagesService', () => {
    it('does not let a student impersonate a parent', async () => {
        const prisma = {
            teacherStudent: {
                findMany: vi.fn().mockResolvedValue([{
                    status: TeacherStudentStatus.ACTIVE,
                }]),
            },
        } as unknown as PrismaService;
        const { instance } = createService(prisma);

        await expect(instance.thread(student, {
            teacher_id: 7,
            student_id: 9,
            channel_type: 'parent',
            parent_id: 12,
            limit: 50,
        })).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('keeps an archived dialog readable but disables sending', async () => {
        const prisma = {
            teacherStudent: {
                findMany: vi.fn().mockResolvedValue([{
                    status: TeacherStudentStatus.ARCHIVED,
                }]),
            },
            messageDialog: { findUnique: vi.fn().mockResolvedValue(null) },
        } as unknown as PrismaService;
        const { instance } = createService(prisma);

        const result = await instance.thread(student, {
            teacher_id: 7,
            student_id: 9,
            channel_type: 'student',
            limit: 50,
        });

        expect(result).toMatchObject({
            success: true,
            messages: [],
            can_send: false,
        });
    });

    it('creates a student message and notification for the teacher', async () => {
        const createdAt = new Date();
        const transaction = {
            messageDialog: { update: vi.fn().mockResolvedValue(undefined) },
            messageAttachment: { createMany: vi.fn() },
            notification: { upsert: vi.fn().mockResolvedValue(undefined) },
        };
        const prisma = {
            teacherStudent: {
                findMany: vi.fn().mockResolvedValue([{
                    status: TeacherStudentStatus.ACTIVE,
                }]),
            },
            messageDialog: {
                upsert: vi.fn().mockResolvedValue({ id: 18 }),
            },
            message: {
                create: vi.fn().mockResolvedValue({ id: 44 }),
                findUnique: vi.fn().mockResolvedValue({
                    id: 44,
                    dialogId: 18,
                    senderId: 9,
                    senderContext: MessageSenderContext.STUDENT,
                    messageText: 'Здравствуйте!',
                    isRead: false,
                    readAt: null,
                    hiddenAt: null,
                    hiddenById: null,
                    hiddenReason: null,
                    createdAt,
                    sender: {
                        id: 9,
                        fullName: 'Иван Ученик',
                        email: 'student@example.com',
                    },
                    attachments: [],
                }),
                deleteMany: vi.fn(),
            },
            $transaction: vi.fn(async (callback) => callback(transaction)),
        } as unknown as PrismaService;
        const { instance, notifications } = createService(prisma);

        const result = await instance.send(student, {
            teacher_id: 7,
            student_id: 9,
            channel_type: 'student',
            message_text: ' Здравствуйте! ',
        }, []);

        expect(prisma.messageDialog.upsert).toHaveBeenCalledWith(expect.objectContaining({
            create: expect.objectContaining({
                channelType: MessageChannelType.STUDENT,
                channelKey: 'student',
            }),
        }));
        expect(notifications.create).toHaveBeenCalledWith(
            transaction,
            expect.objectContaining({ userId: 7, targetEntityId: 18 }),
        );
        expect(result).toMatchObject({
            success: true,
            dialog_id: 18,
            message: { id: 44, is_own: true },
        });
    });

    it('does not allow reporting your own message', async () => {
        const prisma = {
            message: {
                findUnique: vi.fn().mockResolvedValue({
                    id: 44,
                    senderId: 9,
                    dialog: {
                        teacherId: 7,
                        studentId: 9,
                        parentId: null,
                        channelType: MessageChannelType.STUDENT,
                    },
                }),
            },
            messageReport: { create: vi.fn() },
        } as unknown as PrismaService;
        const { instance } = createService(prisma);

        await expect(instance.report(student, {
            message_id: 44,
            reason: 'spam',
        })).rejects.toBeInstanceOf(BadRequestException);
        expect(prisma.messageReport.create).not.toHaveBeenCalled();
    });
});
