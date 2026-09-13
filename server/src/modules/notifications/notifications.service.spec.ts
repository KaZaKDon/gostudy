import { describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import type { NotificationWriteClient } from './notifications.types';
import { NotificationsService } from './notifications.service';

const teacher: SessionUser = {
    id: 7,
    role: UserRole.TEACHER,
    email: 'teacher@example.com',
    fullName: 'Анна Учитель',
    phone: null,
    avatarUrl: null,
    status: UserStatus.ACTIVE,
    emailVerifiedAt: new Date(),
    profileCompleted: true,
};

const parent: SessionUser = {
    id: 15,
    role: UserRole.PARENT,
    email: 'parent@example.com',
    fullName: 'Мария Родитель',
    phone: null,
    avatarUrl: null,
    status: UserStatus.ACTIVE,
    emailVerifiedAt: new Date(),
    profileCompleted: true,
};

describe('NotificationsService', () => {
    it('returns notifications, unread count and pending request count', async () => {
        const prisma = {
            notification: {
                findMany: vi.fn().mockResolvedValue([{
                    id: 3,
                    userId: 7,
                    type: 'teacher_request',
                    dedupeKey: 'teacher-request:5',
                    title: 'Новая заявка',
                    message: 'Иван отправил заявку',
                    targetSection: 'students',
                    targetEntityType: 'teacher_request',
                    targetEntityId: 5,
                    targetDate: null,
                    isRead: false,
                    readAt: null,
                    createdAt: new Date('2026-09-01T10:00:00.000Z'),
                }]),
                count: vi.fn().mockResolvedValue(1),
            },
            teacherStudentRequest: {
                count: vi.fn().mockResolvedValue(2),
            },
        } as unknown as PrismaService;
        const service = new NotificationsService(prisma);
        const result = await service.list(teacher, { limit: 20 });

        expect(result).toMatchObject({
            unread_count: 1,
            counters: { teacher_requests: 2 },
            notifications: [{
                id: 3,
                target_section: 'students',
                is_read: false,
            }],
        });
    });

    it('creates a deduplicated unread notification', async () => {
        const upsert = vi.fn().mockResolvedValue(undefined);
        const client = {
            notification: { upsert },
        } as unknown as NotificationWriteClient;
        const service = new NotificationsService({} as PrismaService);

        await service.create(client, {
            userId: 7,
            type: 'teacher_request',
            title: 'Новая заявка',
            message: 'Иван отправил заявку',
            dedupeKey: 'teacher-request:5',
        });

        expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
            where: {
                userId_dedupeKey: {
                    userId: 7,
                    dedupeKey: 'teacher-request:5',
                },
            },
            update: expect.objectContaining({ isRead: false, readAt: null }),
        }));
    });

    it('notifies only an active verified parent of a minor student', async () => {
        const upsert = vi.fn().mockResolvedValue(undefined);
        const client = {
            parentStudent: {
                findMany: vi.fn().mockResolvedValue([{ parentId: 15 }]),
            },
            parentChildProfile: {
                findMany: vi.fn().mockResolvedValue([{
                    parentId: 15,
                    firstName: 'Иван',
                    lastName: 'Ученик',
                    middleName: null,
                }]),
            },
            parentNotificationPreference: {
                findMany: vi.fn().mockResolvedValue([]),
            },
            notification: { upsert },
        } as unknown as NotificationWriteClient;
        const service = new NotificationsService({} as PrismaService);

        await service.createForActiveParents(client, 9, {
            category: 'homework',
            type: 'parent_homework_assigned',
            title: 'Новое домашнее задание',
            message: 'Математика: Упражнение 5',
            targetSection: 'homework',
            targetEntityType: 'homework',
            targetEntityId: 21,
            dedupeKey: 'homework-assigned:21',
        });

        expect(client.parentStudent.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    studentId: 9,
                    status: 'ACTIVE',
                    verifiedAt: { not: null },
                    parent: {
                        role: 'PARENT',
                        status: 'ACTIVE',
                    },
                }),
            }),
        );
        expect(client.parentChildProfile.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    studentId: 9,
                    parentId: { in: [15] },
                    verificationStatus: 'VERIFIED',
                    verifiedAt: { not: null },
                    archivedAt: null,
                    birthDate: { gt: expect.any(Date) },
                }),
            }),
        );
        expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
            create: expect.objectContaining({
                userId: 15,
                message: 'Ученик Иван: Математика: Упражнение 5',
                targetEntityId: 21,
                dedupeKey: 'parent:9:homework-assigned:21',
            }),
        }));
    });

    it('returns enabled defaults for every connected child', async () => {
        const prisma = {
            parentStudent: {
                findMany: vi.fn().mockResolvedValue([{ studentId: 9 }]),
            },
            parentChildProfile: {
                findMany: vi.fn().mockResolvedValue([{
                    studentId: 9,
                    firstName: 'Иван',
                    lastName: 'Ученик',
                    middleName: null,
                }]),
            },
            parentNotificationPreference: {
                findMany: vi.fn().mockResolvedValue([]),
            },
        } as unknown as PrismaService;
        const service = new NotificationsService(prisma);

        const result = await service.listParentSettings(parent);

        expect(result).toMatchObject({
            success: true,
            settings: [{
                student_id: 9,
                full_name: 'Ученик Иван',
                homework_enabled: true,
                diary_enabled: true,
                schedule_enabled: true,
                messages_enabled: true,
            }],
        });
    });

    it('saves notification categories for one connected child', async () => {
        const upsert = vi.fn().mockResolvedValue({
            homeworkEnabled: false,
            diaryEnabled: true,
            scheduleEnabled: false,
            messagesEnabled: true,
        });
        const prisma = {
            parentStudent: {
                findMany: vi.fn().mockResolvedValue([{ studentId: 9 }]),
            },
            parentChildProfile: {
                findMany: vi.fn().mockResolvedValue([{
                    studentId: 9,
                    firstName: 'Иван',
                    lastName: 'Ученик',
                    middleName: null,
                }]),
            },
            parentNotificationPreference: { upsert },
        } as unknown as PrismaService;
        const service = new NotificationsService(prisma);

        const result = await service.updateParentSettings(parent, {
            student_id: 9,
            homework_enabled: false,
            diary_enabled: true,
            schedule_enabled: false,
            messages_enabled: true,
        });

        expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
            where: {
                parentId_studentId: { parentId: 15, studentId: 9 },
            },
            update: expect.objectContaining({
                homeworkEnabled: false,
                scheduleEnabled: false,
            }),
        }));
        expect(result).toMatchObject({
            setting: {
                student_id: 9,
                homework_enabled: false,
                schedule_enabled: false,
            },
        });
    });

    it('does not create a parent notification for a disabled category', async () => {
        const upsert = vi.fn().mockResolvedValue(undefined);
        const client = {
            parentStudent: {
                findMany: vi.fn().mockResolvedValue([{ parentId: 15 }]),
            },
            parentChildProfile: {
                findMany: vi.fn().mockResolvedValue([{
                    parentId: 15,
                    firstName: 'Иван',
                    lastName: 'Ученик',
                    middleName: null,
                }]),
            },
            parentNotificationPreference: {
                findMany: vi.fn().mockResolvedValue([{
                    parentId: 15,
                    homeworkEnabled: false,
                    diaryEnabled: true,
                    scheduleEnabled: true,
                    messagesEnabled: true,
                }]),
            },
            notification: { upsert },
        } as unknown as NotificationWriteClient;
        const service = new NotificationsService({} as PrismaService);

        await service.createForActiveParents(client, 9, {
            category: 'homework',
            type: 'parent_homework_assigned',
            title: 'Новое домашнее задание',
            message: 'Математика: Упражнение 5',
        });

        expect(upsert).not.toHaveBeenCalled();
    });

    it('marks only the current user notification as read', async () => {
        const prisma = {
            notification: {
                updateMany: vi.fn().mockResolvedValue({ count: 1 }),
                count: vi.fn().mockResolvedValue(0),
            },
        } as unknown as PrismaService;
        const service = new NotificationsService(prisma);
        const result = await service.markRead(teacher, {
            notification_id: 12,
        });

        expect(prisma.notification.updateMany).toHaveBeenCalledWith({
            where: { id: 12, userId: 7 },
            data: { isRead: true, readAt: expect.any(Date) },
        });
        expect(result).toMatchObject({ unread_count: 0 });
    });

    it('marks notifications for an opened domain entity as read', async () => {
        const updateMany = vi.fn().mockResolvedValue({ count: 2 });
        const client = {
            notification: { updateMany },
        } as unknown as NotificationWriteClient;
        const service = new NotificationsService({} as PrismaService);

        await service.markEntityRead(client, 7, 'homework', 21);

        expect(updateMany).toHaveBeenCalledWith({
            where: {
                userId: 7,
                targetEntityType: 'homework',
                targetEntityId: 21,
                isRead: false,
            },
            data: { isRead: true, readAt: expect.any(Date) },
        });
    });
});
