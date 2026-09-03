import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import type { RequestMetadata } from '../../common/http/request-metadata';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import {
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import type { ListAdminAccountsQueryDto } from './dto/list-admin-accounts-query.dto';
import type { UpdateAdminAccountRoleDto } from './dto/update-admin-account-role.dto';
import type { UpdateAdminAccountStatusDto } from './dto/update-admin-account-status.dto';

const ROLE_BY_VALUE: Record<string, UserRole> = {
    student: UserRole.STUDENT,
    teacher: UserRole.TEACHER,
    parent: UserRole.PARENT,
    moderator: UserRole.MODERATOR,
    admin: UserRole.ADMIN,
};

const STATUS_BY_VALUE: Record<string, UserStatus> = {
    active: UserStatus.ACTIVE,
    blocked: UserStatus.BLOCKED,
    archived: UserStatus.ARCHIVED,
    deleted: UserStatus.DELETED,
};

const ACCOUNT_SELECT = {
    id: true,
    fullName: true,
    email: true,
    phone: true,
    role: true,
    status: true,
    blockedReason: true,
    archivedAt: true,
    archiveReason: true,
    lastLoginAt: true,
    createdAt: true,
    updatedAt: true,
} as const;

type AccountRecord = Prisma.UserGetPayload<{
    select: typeof ACCOUNT_SELECT;
}>;

@Injectable()
export class AdminAccountsService {
    constructor(private readonly prisma: PrismaService) {}

    async list(
        actor: SessionUser,
        query: ListAdminAccountsQueryDto,
    ): Promise<Record<string, unknown>> {
        this.requireModerator(actor);

        const page = query.page || 1;
        const limit = query.limit || 20;
        const search = query.q?.trim() || '';
        const numericId = /^\d+$/.test(search)
            ? Number(search)
            : null;
        const where: Prisma.UserWhereInput = {
            ...(query.role ? { role: ROLE_BY_VALUE[query.role] } : {}),
            ...(query.status ? { status: STATUS_BY_VALUE[query.status] } : {}),
            ...(search
                ? {
                    OR: [
                        { fullName: { contains: search, mode: 'insensitive' } },
                        { email: { contains: search, mode: 'insensitive' } },
                        { phone: { contains: search, mode: 'insensitive' } },
                        ...(numericId ? [{ id: numericId }] : []),
                    ],
                }
                : {}),
        };

        const [total, users] = await Promise.all([
            this.prisma.user.count({ where }),
            this.prisma.user.findMany({
                where,
                select: ACCOUNT_SELECT,
                orderBy: { id: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
        ]);

        return {
            success: true,
            data: {
                items: users.map((user) => this.serialize(user)),
                pagination: {
                    page,
                    limit,
                    total,
                    pages: total > 0 ? Math.ceil(total / limit) : 0,
                },
            },
        };
    }

    async show(
        actor: SessionUser,
        userId: number,
    ): Promise<Record<string, unknown>> {
        this.requireModerator(actor);

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: ACCOUNT_SELECT,
        });

        if (!user) {
            throw new NotFoundException('Пользователь не найден');
        }

        const [requestsTotal, lessonsTotal, homeworkTotal] = await Promise.all([
            this.prisma.teacherStudentRequest.count({
                where: {
                    OR: [
                        { studentId: userId },
                        { teacherId: userId },
                    ],
                },
            }),
            this.prisma.lesson.count({
                where: {
                    OR: [
                        { studentId: userId },
                        { teacherId: userId },
                    ],
                },
            }),
            this.prisma.homework.count({
                where: {
                    OR: [
                        { studentId: userId },
                        { teacherId: userId },
                    ],
                },
            }),
        ]);

        return {
            success: true,
            data: {
                user: this.serialize(user),
                stats: {
                    requests_total: requestsTotal,
                    lessons_total: lessonsTotal,
                    homework_total: homeworkTotal,
                    messages_total: 0,
                },
            },
        };
    }

    async updateStatus(
        actor: SessionUser,
        userId: number,
        input: UpdateAdminAccountStatusDto,
        metadata: RequestMetadata,
    ): Promise<Record<string, unknown>> {
        this.requireAdmin(actor);

        const status = STATUS_BY_VALUE[input.status];

        if (!status || status === UserStatus.DELETED) {
            throw new BadRequestException('Некорректный статус');
        }

        if (actor.id === userId && status !== UserStatus.ACTIVE) {
            throw new BadRequestException(
                'Нельзя заблокировать или архивировать собственный аккаунт',
            );
        }

        const blockedReason = input.blocked_reason?.trim() || '';
        const archiveReason = input.archive_reason?.trim()
            || 'Архивирован администратором';

        if (status === UserStatus.BLOCKED && !blockedReason) {
            throw new BadRequestException('Укажите причину блокировки');
        }

        const target = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                role: true,
                status: true,
                blockedReason: true,
                archiveReason: true,
            },
        });

        if (!target) {
            throw new NotFoundException('Пользователь не найден');
        }

        if (target.status === UserStatus.DELETED) {
            throw new BadRequestException(
                'Удалённый аккаунт нельзя изменить через этот раздел',
            );
        }

        const updated = await this.prisma.$transaction(async (transaction) => {
            const user = await transaction.user.update({
                where: { id: userId },
                data: {
                    status,
                    blockedReason: status === UserStatus.BLOCKED
                        ? blockedReason
                        : null,
                    archivedAt: status === UserStatus.ARCHIVED
                        ? new Date()
                        : null,
                    archivedById: status === UserStatus.ARCHIVED
                        ? actor.id
                        : null,
                    archiveReason: status === UserStatus.ARCHIVED
                        ? archiveReason
                        : null,
                },
                select: ACCOUNT_SELECT,
            });

            if (status !== UserStatus.ACTIVE) {
                await transaction.authSession.deleteMany({
                    where: { userId },
                });
            }

            await transaction.adminAuditLog.create({
                data: {
                    adminId: actor.id,
                    action: 'user_status_updated',
                    entityType: 'user',
                    entityId: userId,
                    oldValue: {
                        status: target.status,
                        blocked_reason: target.blockedReason,
                        archive_reason: target.archiveReason,
                    },
                    newValue: {
                        status,
                        blocked_reason: user.blockedReason,
                        archive_reason: user.archiveReason,
                    },
                    ipAddress: metadata.ipAddress,
                    userAgent: metadata.userAgent,
                },
            });

            return user;
        });

        return {
            success: true,
            message: 'Статус пользователя обновлён',
            data: { user: this.serialize(updated) },
        };
    }

    async updateRole(
        actor: SessionUser,
        userId: number,
        input: UpdateAdminAccountRoleDto,
        metadata: RequestMetadata,
    ): Promise<Record<string, unknown>> {
        this.requireAdmin(actor);

        if (actor.id === userId) {
            throw new BadRequestException(
                'Нельзя изменить роль собственного аккаунта',
            );
        }

        const role = ROLE_BY_VALUE[input.role];

        if (!role) {
            throw new BadRequestException('Недопустимая роль пользователя');
        }

        const target = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                role: true,
                status: true,
            },
        });

        if (!target) {
            throw new NotFoundException('Пользователь не найден');
        }

        if (target.role === role) {
            return {
                success: true,
                message: 'Роль пользователя не изменилась',
            };
        }

        const updated = await this.prisma.$transaction(async (transaction) => {
            if (role === UserRole.STUDENT) {
                await transaction.studentProfile.upsert({
                    where: { userId },
                    create: { userId },
                    update: {},
                });
            }

            if (role === UserRole.TEACHER) {
                await transaction.teacherProfile.upsert({
                    where: { userId },
                    create: { userId },
                    update: {},
                });
            }

            const user = await transaction.user.update({
                where: { id: userId },
                data: {
                    role,
                    profileCompleted:
                        role === UserRole.ADMIN || role === UserRole.MODERATOR,
                },
                select: ACCOUNT_SELECT,
            });

            await transaction.authSession.deleteMany({
                where: { userId },
            });

            await transaction.adminAuditLog.create({
                data: {
                    adminId: actor.id,
                    action: 'user_role_updated',
                    entityType: 'user',
                    entityId: userId,
                    oldValue: { role: target.role },
                    newValue: { role },
                    ipAddress: metadata.ipAddress,
                    userAgent: metadata.userAgent,
                },
            });

            return user;
        });

        return {
            success: true,
            message: 'Роль пользователя обновлена',
            data: { user: this.serialize(updated) },
        };
    }

    private serialize(user: AccountRecord): Record<string, unknown> {
        return {
            id: user.id,
            full_name: user.fullName,
            email: user.email,
            phone: user.phone,
            role: user.role.toLowerCase(),
            status: user.status.toLowerCase(),
            blocked_reason: user.blockedReason,
            archived_at: user.archivedAt,
            archive_reason: user.archiveReason,
            last_login_at: user.lastLoginAt,
            created_at: user.createdAt,
            updated_at: user.updatedAt,
        };
    }

    private requireModerator(user: SessionUser): void {
        if (user.role !== UserRole.ADMIN && user.role !== UserRole.MODERATOR) {
            throw new ForbiddenException(
                'Доступ разрешён только администратору или модератору',
            );
        }
    }

    private requireAdmin(user: SessionUser): void {
        if (user.role !== UserRole.ADMIN) {
            throw new ForbiddenException('Недостаточно прав');
        }
    }
}
