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
