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
    TeacherProfileMediaStatus,
    TeacherProfileMediaType,
    UserRole,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { NotificationsService } from '../notifications/notifications.service';
import { TeacherProfileMediaFileStorageService } from '../teacher-profile-media/teacher-profile-media-file-storage.service';
import { TeacherProfileMediaService } from '../teacher-profile-media/teacher-profile-media.service';
import type { ListAdminProfileMediaQueryDto } from './dto/list-admin-profile-media-query.dto';
import type { ModerateAdminProfileMediaDto } from './dto/moderate-admin-profile-media.dto';

const STATUS_BY_VALUE = {
    pending: TeacherProfileMediaStatus.PENDING,
    approved: TeacherProfileMediaStatus.APPROVED,
    rejected: TeacherProfileMediaStatus.REJECTED,
    replaced: TeacherProfileMediaStatus.REPLACED,
} as const;

const TYPE_BY_VALUE = {
    photo: TeacherProfileMediaType.PHOTO,
    video: TeacherProfileMediaType.VIDEO,
} as const;

@Injectable()
export class AdminProfileMediaService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly files: TeacherProfileMediaFileStorageService,
        private readonly media: TeacherProfileMediaService,
        private readonly notifications: NotificationsService,
    ) {}

    async list(actor: SessionUser, query: ListAdminProfileMediaQueryDto) {
        this.requireModerator(actor);
        const page = query.page || 1;
        const limit = query.limit || 20;
        const search = query.q?.trim() || '';
        const numericId = /^\d+$/.test(search) ? Number(search) : null;
        const conditions: Prisma.TeacherProfileMediaWhereInput[] = [];

        if (query.status) conditions.push({ status: STATUS_BY_VALUE[query.status] });
        if (query.type) conditions.push({ type: TYPE_BY_VALUE[query.type] });
        if (search) {
            conditions.push({
                OR: [
                    ...(numericId ? [{ id: numericId }] : []),
                    { originalName: { contains: search, mode: 'insensitive' } },
                    { teacher: { fullName: { contains: search, mode: 'insensitive' } } },
                    { teacher: { email: { contains: search, mode: 'insensitive' } } },
                ],
            });
        }

        const where: Prisma.TeacherProfileMediaWhereInput = conditions.length
            ? { AND: conditions }
            : {};
        const [total, items] = await Promise.all([
            this.prisma.teacherProfileMedia.count({ where }),
            this.prisma.teacherProfileMedia.findMany({
                where,
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    teacher: {
                        select: { id: true, fullName: true, email: true },
                    },
                    checkedBy: {
                        select: { id: true, fullName: true, email: true },
                    },
                },
            }),
        ]);

        return {
            success: true,
            data: {
                items: items.map((item) => this.serialize(item)),
                pagination: {
                    page,
                    limit,
                    total,
                    pages: total ? Math.ceil(total / limit) : 0,
                },
            },
        };
    }

    async moderate(
        actor: SessionUser,
        mediaId: number,
        input: ModerateAdminProfileMediaDto,
        metadata: RequestMetadata,
    ) {
        this.requireModerator(actor);
        const comment = input.comment?.trim() || '';
        if (input.decision === 'rejected' && !comment) {
            throw new BadRequestException('Укажите причину отклонения');
        }

        const status = input.decision === 'approved'
            ? TeacherProfileMediaStatus.APPROVED
            : TeacherProfileMediaStatus.REJECTED;

        await this.prisma.$transaction(async (transaction) => {
            const item = await transaction.teacherProfileMedia.findUnique({
                where: { id: mediaId },
            });
            if (!item) throw new NotFoundException('Файл профиля не найден');
            if (item.status !== TeacherProfileMediaStatus.PENDING) {
                throw new ConflictException('Файл уже прошёл проверку');
            }

            if (status === TeacherProfileMediaStatus.APPROVED) {
                await transaction.teacherProfileMedia.updateMany({
                    where: {
                        teacherId: item.teacherId,
                        type: item.type,
                        status: TeacherProfileMediaStatus.APPROVED,
                    },
                    data: { status: TeacherProfileMediaStatus.REPLACED },
                });
            }

            const checkedAt = new Date();
            const updated = await transaction.teacherProfileMedia.update({
                where: { id: item.id },
                data: {
                    status,
                    rejectionReason: status === TeacherProfileMediaStatus.REJECTED
                        ? comment
                        : null,
                    checkedById: actor.id,
                    checkedAt,
                    publishedAt: status === TeacherProfileMediaStatus.APPROVED
                        ? checkedAt
                        : null,
                },
            });

            if (status === TeacherProfileMediaStatus.APPROVED) {
                const publicUrl = this.media.publicUrl(item.id);
                if (item.type === TeacherProfileMediaType.PHOTO) {
                    await transaction.user.update({
                        where: { id: item.teacherId },
                        data: { avatarUrl: publicUrl },
                    });
                } else {
                    await transaction.teacherProfile.updateMany({
                        where: { userId: item.teacherId },
                        data: { introVideoUrl: publicUrl },
                    });
                }
            }

            await transaction.adminAuditLog.create({
                data: {
                    adminId: actor.id,
                    action: input.decision === 'approved'
                        ? 'teacher_profile_media_approved'
                        : 'teacher_profile_media_rejected',
                    entityType: 'teacher_profile_media',
                    entityId: item.id,
                    oldValue: { status: item.status.toLowerCase() },
                    newValue: {
                        status: updated.status.toLowerCase(),
                        rejection_reason: updated.rejectionReason,
                    },
                    ipAddress: metadata.ipAddress,
                    userAgent: metadata.userAgent,
                },
            });

            const label = item.type === TeacherProfileMediaType.PHOTO
                ? 'Фотография профиля'
                : 'Видеовизитка';
            await this.notifications.create(transaction, {
                userId: item.teacherId,
                type: input.decision === 'approved'
                    ? 'teacher_profile_media_approved'
                    : 'teacher_profile_media_rejected',
                title: input.decision === 'approved'
                    ? `${label} подтверждена`
                    : `${label} отклонена`,
                message: input.decision === 'approved'
                    ? `${label} опубликована в анкете.`
                    : comment,
                targetSection: 'settings',
                targetEntityType: 'teacher_profile_media',
                targetEntityId: item.id,
                dedupeKey: `teacher-profile-media:${item.id}:${status.toLowerCase()}`,
            });
        });

        return {
            success: true,
            message: input.decision === 'approved'
                ? 'Файл профиля подтверждён'
                : 'Файл профиля отклонён',
        };
    }

    async download(actor: SessionUser, mediaId: number) {
        this.requireModerator(actor);
        const item = await this.prisma.teacherProfileMedia.findUnique({
            where: { id: mediaId },
        });
        if (!item) throw new NotFoundException('Файл профиля не найден');

        const stored = await this.files.readStoredFile(item.storedPath);
        return {
            ...stored,
            originalName: item.originalName,
            mimeType: item.mimeType,
        };
    }

    private serialize(item: Record<string, any>) {
        return {
            id: item.id,
            teacher_id: item.teacherId,
            teacher_name: item.teacher?.fullName,
            teacher_email: item.teacher?.email,
            type: String(item.type).toLowerCase(),
            original_name: item.originalName,
            mime_type: item.mimeType,
            file_size: Number(item.fileSize),
            status: String(item.status).toLowerCase(),
            reject_reason: item.rejectionReason,
            checked_by_name: item.checkedBy?.fullName
                || item.checkedBy?.email
                || null,
            checked_at: item.checkedAt,
            published_at: item.publishedAt,
            created_at: item.createdAt,
            updated_at: item.updatedAt,
        };
    }

    private requireModerator(actor: SessionUser): void {
        if (
            actor.role !== UserRole.ADMIN
            && actor.role !== UserRole.MODERATOR
        ) {
            throw new ForbiddenException(
                'Доступ разрешён только администратору или модератору',
            );
        }
    }
}
