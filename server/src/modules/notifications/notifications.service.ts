import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';
import { UserRole } from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import type { ClearNotificationsDto } from './dto/clear-notifications.dto';
import type { DeleteNotificationDto } from './dto/delete-notification.dto';
import type { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import type { MarkNotificationsReadDto } from './dto/mark-notifications-read.dto';
import type {
    CreateNotificationInput,
    NotificationWriteClient,
} from './notifications.types';

@Injectable()
export class NotificationsService {
    constructor(private readonly prisma: PrismaService) {}

    async list(
        user: SessionUser,
        query: ListNotificationsQueryDto,
    ): Promise<Record<string, unknown>> {
        const where = {
            userId: user.id,
            ...(query.before_id ? { id: { lt: query.before_id } } : {}),
        };
        const [rows, unreadCount, teacherRequestsCount] = await Promise.all([
            this.prisma.notification.findMany({
                where,
                orderBy: { id: 'desc' },
                take: query.limit + 1,
            }),
            this.unreadCount(user.id),
            user.role === UserRole.TEACHER
                ? this.prisma.teacherStudentRequest.count({
                    where: { teacherId: user.id, status: 'PENDING' },
                })
                : Promise.resolve(0),
        ]);
        const hasMore = rows.length > query.limit;
        const notifications = hasMore ? rows.slice(0, query.limit) : rows;

        return {
            success: true,
            notifications: notifications.map((notification) => ({
                id: notification.id,
                type: notification.type,
                dedupe_key: notification.dedupeKey,
                title: notification.title,
                message: notification.message,
                target_section: notification.targetSection,
                target_entity_type: notification.targetEntityType,
                target_entity_id: notification.targetEntityId,
                target_date: notification.targetDate,
                is_read: notification.isRead,
                read_at: notification.readAt,
                created_at: notification.createdAt,
            })),
            unread_count: unreadCount,
            has_more: hasMore,
            next_before_id: hasMore && notifications.length
                ? notifications.at(-1)?.id ?? null
                : null,
            counters: {
                teacher_requests: teacherRequestsCount,
            },
        };
    }

    async markRead(
        user: SessionUser,
        input: MarkNotificationsReadDto,
    ): Promise<Record<string, unknown>> {
        if (!input.mark_all && !input.notification_id) {
            throw new BadRequestException('Уведомление не выбрано');
        }

        const result = input.mark_all
            ? await this.prisma.notification.updateMany({
                where: { userId: user.id, isRead: false },
                data: { isRead: true, readAt: new Date() },
            })
            : await this.prisma.notification.updateMany({
                where: { id: input.notification_id, userId: user.id },
                data: { isRead: true, readAt: new Date() },
            });

        if (!input.mark_all && result.count === 0) {
            const exists = await this.prisma.notification.findFirst({
                where: { id: input.notification_id, userId: user.id },
                select: { id: true },
            });

            if (!exists) {
                throw new NotFoundException('Уведомление не найдено');
            }
        }

        return {
            success: true,
            updated_count: result.count,
            unread_count: await this.unreadCount(user.id),
        };
    }

    async delete(
        user: SessionUser,
        input: DeleteNotificationDto,
    ): Promise<Record<string, unknown>> {
        const result = await this.prisma.notification.deleteMany({
            where: { id: input.notification_id, userId: user.id },
        });

        if (result.count === 0) {
            throw new NotFoundException('Уведомление не найдено');
        }

        return {
            success: true,
            deleted_count: result.count,
            unread_count: await this.unreadCount(user.id),
        };
    }

    async clear(
        user: SessionUser,
        input: ClearNotificationsDto,
    ): Promise<Record<string, unknown>> {
        const result = await this.prisma.notification.deleteMany({
            where: {
                userId: user.id,
                ...(input.mode === 'read' ? { isRead: true } : {}),
            },
        });

        return {
            success: true,
            deleted_count: result.count,
            unread_count: await this.unreadCount(user.id),
        };
    }

    async create(
        client: NotificationWriteClient,
        input: CreateNotificationInput,
    ): Promise<void> {
        const data = {
            userId: input.userId,
            type: input.type.trim(),
            title: input.title.trim(),
            message: input.message.trim(),
            targetSection: input.targetSection ?? null,
            targetEntityType: input.targetEntityType ?? null,
            targetEntityId: input.targetEntityId ?? null,
            targetDate: input.targetDate ?? null,
            dedupeKey: input.dedupeKey?.trim() || null,
        };

        if (data.dedupeKey) {
            await client.notification.upsert({
                where: {
                    userId_dedupeKey: {
                        userId: data.userId,
                        dedupeKey: data.dedupeKey,
                    },
                },
                update: {
                    ...data,
                    isRead: false,
                    readAt: null,
                    createdAt: new Date(),
                },
                create: data,
            });
            return;
        }

        await client.notification.create({ data });
    }

    async markDedupeRead(
        client: NotificationWriteClient,
        userId: number,
        dedupeKey: string,
    ): Promise<void> {
        await client.notification.updateMany({
            where: { userId, dedupeKey, isRead: false },
            data: { isRead: true, readAt: new Date() },
        });
    }

    async markEntityRead(
        client: NotificationWriteClient,
        userId: number,
        entityType: string,
        entityId: number,
    ): Promise<void> {
        await client.notification.updateMany({
            where: {
                userId,
                targetEntityType: entityType,
                targetEntityId: entityId,
                isRead: false,
            },
            data: { isRead: true, readAt: new Date() },
        });
    }

    private unreadCount(userId: number): Promise<number> {
        return this.prisma.notification.count({
            where: { userId, isRead: false },
        });
    }
}
