import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';
import { adultBirthDateCutoff } from '../../common/date/birth-date';
import {
    ParentChildVerificationStatus,
    ParentStudentStatus,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import type { ClearNotificationsDto } from './dto/clear-notifications.dto';
import type { DeleteNotificationDto } from './dto/delete-notification.dto';
import type { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import type { MarkNotificationsReadDto } from './dto/mark-notifications-read.dto';
import type { UpdateParentNotificationSettingsDto } from './dto/update-parent-notification-settings.dto';
import type { UpdateStudentNotificationSettingsDto } from './dto/update-student-notification-settings.dto';
import type {
    CreateNotificationInput,
    CreateParentNotificationInput,
    NotificationWriteClient,
    ParentNotificationCategory,
} from './notifications.types';

const PARENT_PREFERENCE_FIELD = {
    homework: 'homeworkEnabled',
    diary: 'diaryEnabled',
    schedule: 'scheduleEnabled',
    messages: 'messagesEnabled',
} as const satisfies Record<ParentNotificationCategory, string>;

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

    async listParentSettings(
        user: SessionUser,
    ): Promise<Record<string, unknown>> {
        this.requireParent(user);
        const children = await this.activeParentChildren(user.id);
        const preferences = children.length
            ? await this.prisma.parentNotificationPreference.findMany({
                where: {
                    parentId: user.id,
                    studentId: {
                        in: children.map((child) => child.studentId),
                    },
                },
            })
            : [];
        const byStudentId = new Map(
            preferences.map((preference) => [
                preference.studentId,
                preference,
            ]),
        );

        return {
            success: true,
            settings: children.map((child) => this.serializeParentSetting(
                child,
                byStudentId.get(child.studentId),
            )),
        };
    }

    async updateParentSettings(
        user: SessionUser,
        input: UpdateParentNotificationSettingsDto,
    ): Promise<Record<string, unknown>> {
        this.requireParent(user);
        const children = await this.activeParentChildren(user.id);
        const child = children.find(
            (item) => item.studentId === input.student_id,
        );

        if (!child) {
            throw new NotFoundException(
                'Настройки уведомлений этого ребёнка недоступны',
            );
        }

        const preference = await this.prisma.parentNotificationPreference.upsert({
            where: {
                parentId_studentId: {
                    parentId: user.id,
                    studentId: child.studentId,
                },
            },
            update: {
                homeworkEnabled: input.homework_enabled,
                diaryEnabled: input.diary_enabled,
                scheduleEnabled: input.schedule_enabled,
                messagesEnabled: input.messages_enabled,
            },
            create: {
                parentId: user.id,
                studentId: child.studentId,
                homeworkEnabled: input.homework_enabled,
                diaryEnabled: input.diary_enabled,
                scheduleEnabled: input.schedule_enabled,
                messagesEnabled: input.messages_enabled,
            },
        });

        return {
            success: true,
            message: 'Настройки уведомлений сохранены',
            setting: this.serializeParentSetting(child, preference),
        };
    }

    async getStudentSettings(
        user: SessionUser,
    ): Promise<Record<string, unknown>> {
        this.requireStudent(user);
        const profile = await this.prisma.studentProfile.findUnique({
            where: { userId: user.id },
            select: {
                parentEmail: true,
                parentNotificationsEnabled: true,
            },
        });

        if (!profile) {
            throw new NotFoundException('Профиль ученика не найден');
        }

        return {
            success: true,
            settings: this.serializeStudentSettings(profile),
        };
    }

    async updateStudentSettings(
        user: SessionUser,
        input: UpdateStudentNotificationSettingsDto,
    ): Promise<Record<string, unknown>> {
        this.requireStudent(user);
        const profile = await this.prisma.studentProfile.findUnique({
            where: { userId: user.id },
            select: { parentEmail: true },
        });

        if (!profile) {
            throw new NotFoundException('Профиль ученика не найден');
        }

        if (input.parent_notifications_enabled && !profile.parentEmail) {
            throw new BadRequestException(
                'Сначала укажите корректный email родителя в анкете',
            );
        }

        const updated = await this.prisma.studentProfile.update({
            where: { userId: user.id },
            data: {
                parentNotificationsEnabled:
                    input.parent_notifications_enabled,
            },
            select: {
                parentEmail: true,
                parentNotificationsEnabled: true,
            },
        });

        return {
            success: true,
            message: 'Настройки уведомлений сохранены',
            settings: this.serializeStudentSettings(updated),
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

    async createForActiveParents(
        client: NotificationWriteClient,
        studentId: number,
        input: CreateParentNotificationInput,
    ): Promise<void> {
        const links = await client.parentStudent.findMany({
            where: {
                studentId,
                status: ParentStudentStatus.ACTIVE,
                verifiedAt: { not: null },
                parent: {
                    role: UserRole.PARENT,
                    status: UserStatus.ACTIVE,
                },
            },
            select: { parentId: true },
        });

        if (!links.length) {
            return;
        }

        const adultBirthDate = adultBirthDateCutoff();

        const childProfiles = await client.parentChildProfile.findMany({
            where: {
                studentId,
                parentId: { in: links.map((link) => link.parentId) },
                verificationStatus: ParentChildVerificationStatus.VERIFIED,
                verifiedAt: { not: null },
                archivedAt: null,
                birthDate: { gt: adultBirthDate },
            },
            select: {
                parentId: true,
                firstName: true,
                lastName: true,
                middleName: true,
            },
        });

        const preferences = childProfiles.length
            ? await client.parentNotificationPreference.findMany({
                where: {
                    studentId,
                    parentId: {
                        in: childProfiles.map((child) => child.parentId),
                    },
                },
            })
            : [];
        const preferenceByParentId = new Map(
            preferences.map((preference) => [
                preference.parentId,
                preference,
            ]),
        );
        const preferenceField = PARENT_PREFERENCE_FIELD[input.category];
        const { category: _category, ...notificationInput } = input;

        await Promise.all(childProfiles.map(async (child) => {
            const preference = preferenceByParentId.get(child.parentId);

            if (preference && !preference[preferenceField]) {
                return;
            }

            const childName = [
                child.lastName,
                child.firstName,
                child.middleName,
            ].filter(Boolean).join(' ') || 'Ребёнок';

            await this.create(client, {
                ...notificationInput,
                userId: child.parentId,
                message: `${childName}: ${input.message}`.slice(0, 500),
                dedupeKey: input.dedupeKey
                    ? `parent:${studentId}:${input.dedupeKey}`
                    : null,
            });
        }));
    }

    async isParentCategoryEnabled(
        client: NotificationWriteClient,
        parentId: number,
        studentId: number,
        category: ParentNotificationCategory,
    ): Promise<boolean> {
        const preference = await client.parentNotificationPreference.findUnique({
            where: {
                parentId_studentId: { parentId, studentId },
            },
        });

        return preference
            ? preference[PARENT_PREFERENCE_FIELD[category]]
            : true;
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

    private requireParent(user: SessionUser): void {
        if (user.role !== UserRole.PARENT) {
            throw new BadRequestException(
                'Настройки детей доступны только родителю',
            );
        }
    }

    private requireStudent(user: SessionUser): void {
        if (user.role !== UserRole.STUDENT) {
            throw new BadRequestException(
                'Настройки доступны только ученику',
            );
        }
    }

    private async activeParentChildren(parentId: number) {
        const links = await this.prisma.parentStudent.findMany({
            where: {
                parentId,
                status: ParentStudentStatus.ACTIVE,
                verifiedAt: { not: null },
            },
            select: { studentId: true },
        });

        if (!links.length) {
            return [];
        }

        const adultBirthDate = adultBirthDateCutoff();

        const profiles = await this.prisma.parentChildProfile.findMany({
            where: {
                parentId,
                studentId: {
                    in: links.map((link) => link.studentId),
                },
                verificationStatus: ParentChildVerificationStatus.VERIFIED,
                verifiedAt: { not: null },
                archivedAt: null,
                birthDate: { gt: adultBirthDate },
            },
            orderBy: [
                { createdAt: 'asc' },
                { id: 'asc' },
            ],
            select: {
                studentId: true,
                firstName: true,
                lastName: true,
                middleName: true,
            },
        });

        return profiles.flatMap((profile) => profile.studentId
            ? [{
                studentId: profile.studentId,
                fullName: [
                    profile.lastName,
                    profile.firstName,
                    profile.middleName,
                ].filter(Boolean).join(' '),
            }]
            : []);
    }

    private serializeParentSetting(
        child: { studentId: number; fullName: string },
        preference?: {
            homeworkEnabled: boolean;
            diaryEnabled: boolean;
            scheduleEnabled: boolean;
            messagesEnabled: boolean;
        },
    ) {
        return {
            student_id: child.studentId,
            full_name: child.fullName,
            homework_enabled: preference?.homeworkEnabled ?? true,
            diary_enabled: preference?.diaryEnabled ?? true,
            schedule_enabled: preference?.scheduleEnabled ?? true,
            messages_enabled: preference?.messagesEnabled ?? true,
        };
    }

    private serializeStudentSettings(profile: {
        parentEmail: string | null;
        parentNotificationsEnabled: boolean;
    }): Record<string, unknown> {
        return {
            parent_email: profile.parentEmail,
            parent_notifications_enabled:
                profile.parentNotificationsEnabled,
        };
    }
}
