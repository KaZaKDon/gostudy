import {
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
    TeacherProfileMediaStatus,
    TeacherProfileMediaType,
    UserRole,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import type { DeleteTeacherProfileMediaDto } from './dto/delete-teacher-profile-media.dto';
import {
    type TeacherProfileMediaInputType,
    TeacherProfileMediaFileStorageService,
    type TeacherProfileMediaUploadFile,
} from './teacher-profile-media-file-storage.service';

const TYPE_BY_VALUE = {
    photo: TeacherProfileMediaType.PHOTO,
    video: TeacherProfileMediaType.VIDEO,
} as const;

@Injectable()
export class TeacherProfileMediaService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly files: TeacherProfileMediaFileStorageService,
        private readonly config: ConfigService,
    ) {}

    async upload(
        user: SessionUser,
        type: TeacherProfileMediaInputType,
        file: TeacherProfileMediaUploadFile | undefined,
    ) {
        this.requireTeacher(user);
        const validated = this.files.validateUpload(type, file);
        const stored = await this.files.storeUpload(user.id, type, validated);
        const mediaType = TYPE_BY_VALUE[type];

        try {
            const obsolete = await this.prisma.teacherProfileMedia.findMany({
                where: {
                    teacherId: user.id,
                    type: mediaType,
                    status: {
                        in: [
                            TeacherProfileMediaStatus.PENDING,
                            TeacherProfileMediaStatus.REJECTED,
                        ],
                    },
                },
                select: { id: true, storedPath: true },
            });
            const media = await this.prisma.$transaction(async (transaction) => {
                if (obsolete.length) {
                    await transaction.teacherProfileMedia.deleteMany({
                        where: { id: { in: obsolete.map((item) => item.id) } },
                    });
                }

                return transaction.teacherProfileMedia.create({
                    data: {
                        teacherId: user.id,
                        type: mediaType,
                        storedPath: stored.storedPath,
                        originalName: stored.originalName,
                        mimeType: stored.mimeType,
                        fileSize: BigInt(stored.fileSize),
                        status: TeacherProfileMediaStatus.PENDING,
                    },
                });
            });

            await this.files.removeStoredPaths(
                obsolete.map((item) => item.storedPath),
            );

            return {
                success: true,
                message: type === 'photo'
                    ? 'Фотография отправлена на проверку'
                    : 'Видеовизитка отправлена на проверку',
                media: this.serialize(media),
            };
        } catch (error) {
            await this.files.removeStoredPath(stored.storedPath);
            throw error;
        }
    }

    async delete(user: SessionUser, input: DeleteTeacherProfileMediaDto) {
        this.requireTeacher(user);
        const type = TYPE_BY_VALUE[input.type];
        const media = input.media_id
            ? await this.prisma.teacherProfileMedia.findFirst({
                where: { id: input.media_id, teacherId: user.id, type },
            })
            : await this.prisma.teacherProfileMedia.findFirst({
                where: {
                    teacherId: user.id,
                    type,
                    status: TeacherProfileMediaStatus.APPROVED,
                },
                orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
            });

        if (input.media_id && !media) {
            throw new NotFoundException('Файл профиля не найден');
        }

        await this.prisma.$transaction(async (transaction) => {
            if (media) {
                await transaction.teacherProfileMedia.delete({
                    where: { id: media.id },
                });
            }

            if (!input.media_id || media?.status === TeacherProfileMediaStatus.APPROVED) {
                if (type === TeacherProfileMediaType.PHOTO) {
                    await transaction.user.update({
                        where: { id: user.id },
                        data: { avatarUrl: null },
                    });
                } else {
                    await transaction.teacherProfile.updateMany({
                        where: { userId: user.id },
                        data: { introVideoUrl: null },
                    });
                }
            }
        });

        if (media) await this.files.removeStoredPath(media.storedPath);

        return {
            success: true,
            message: input.type === 'photo'
                ? 'Фотография удалена'
                : 'Видеовизитка удалена',
            media_id: media?.id ?? null,
        };
    }

    async downloadOwn(user: SessionUser, mediaId: number) {
        this.requireTeacher(user);
        const media = await this.prisma.teacherProfileMedia.findFirst({
            where: { id: mediaId, teacherId: user.id },
        });
        if (!media) throw new NotFoundException('Файл профиля не найден');

        return this.fileResult(media);
    }

    async downloadPublic(mediaId: number) {
        const media = await this.prisma.teacherProfileMedia.findFirst({
            where: {
                id: mediaId,
                status: TeacherProfileMediaStatus.APPROVED,
            },
        });
        if (!media) throw new NotFoundException('Файл профиля не найден');

        return this.fileResult(media);
    }

    publicUrl(mediaId: number): string {
        const relative = `/api/v1/teachers/profile-media/${mediaId}`;
        const apiUrl = String(this.config.get('API_URL') || '').trim()
            .replace(/\/$/, '');
        return apiUrl ? `${apiUrl}${relative}` : relative;
    }

    serialize(media: Record<string, any>) {
        return {
            id: media.id,
            teacher_id: media.teacherId,
            type: String(media.type).toLowerCase(),
            original_name: media.originalName,
            mime_type: media.mimeType,
            file_size: Number(media.fileSize),
            status: String(media.status).toLowerCase(),
            reject_reason: media.rejectionReason,
            checked_at: media.checkedAt,
            published_at: media.publishedAt,
            created_at: media.createdAt,
            updated_at: media.updatedAt,
        };
    }

    private async fileResult(media: Record<string, any>) {
        const stored = await this.files.readStoredFile(media.storedPath);
        return {
            ...stored,
            originalName: media.originalName as string,
            mimeType: media.mimeType as string,
        };
    }

    private requireTeacher(user: SessionUser): void {
        if (user.role !== UserRole.TEACHER) {
            throw new ForbiddenException(
                'Файлы профиля доступны только преподавателю',
            );
        }
    }
}
