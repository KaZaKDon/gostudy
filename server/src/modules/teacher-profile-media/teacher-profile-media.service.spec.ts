import { ConfigService } from '@nestjs/config';
import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
    TeacherProfileMediaStatus,
    TeacherProfileMediaType,
    TeacherVerificationStatus,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { TeacherProfileMediaFileStorageService } from './teacher-profile-media-file-storage.service';
import { TeacherProfileMediaService } from './teacher-profile-media.service';

const teacher: SessionUser = {
    id: 17,
    role: UserRole.TEACHER,
    email: 'teacher@example.com',
    fullName: 'Наталья Кузнецова',
    phone: null,
    avatarUrl: 'https://old.example/photo.jpg',
    status: UserStatus.ACTIVE,
    emailVerifiedAt: new Date(),
    profileCompleted: true,
};

describe('TeacherProfileMediaService', () => {
    it('creates pending photo without replacing the current public photo', async () => {
        const created = {
            id: 41,
            teacherId: teacher.id,
            type: TeacherProfileMediaType.PHOTO,
            originalName: 'new-photo.jpg',
            mimeType: 'image/jpeg',
            fileSize: BigInt(1200),
            status: TeacherProfileMediaStatus.PENDING,
            rejectionReason: null,
            checkedAt: null,
            publishedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const transaction = {
            teacherProfileMedia: {
                deleteMany: vi.fn(),
                create: vi.fn().mockResolvedValue(created),
            },
        };
        const prisma = {
            teacherProfileMedia: {
                findMany: vi.fn().mockResolvedValue([]),
            },
            $transaction: vi.fn().mockImplementation((callback) => (
                callback(transaction)
            )),
            user: { update: vi.fn() },
        } as unknown as PrismaService;
        const files = {
            validateUpload: vi.fn().mockReturnValue({ extension: '.jpg' }),
            storeUpload: vi.fn().mockResolvedValue({
                storedPath: 'teacher-profile-media/17/photo/new.jpg',
                originalName: 'new-photo.jpg',
                mimeType: 'image/jpeg',
                fileSize: 1200,
            }),
            removeStoredPaths: vi.fn(),
            removeStoredPath: vi.fn(),
        } as unknown as TeacherProfileMediaFileStorageService;
        const service = new TeacherProfileMediaService(
            prisma,
            files,
            { get: vi.fn() } as unknown as ConfigService,
        );

        await expect(service.upload(teacher, 'photo', {
            originalname: 'new-photo.jpg',
            mimetype: 'image/jpeg',
            size: 1200,
            buffer: Buffer.from([0xff, 0xd8, 0xff]),
        })).resolves.toMatchObject({
            success: true,
            media: { id: 41, status: 'pending', type: 'photo' },
        });
        expect(transaction.teacherProfileMedia.create).toHaveBeenCalledOnce();
        expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('limits the public query to approved media of an active verified teacher', async () => {
        const prisma = {
            teacherProfileMedia: {
                findFirst: vi.fn().mockResolvedValue(null),
            },
        } as unknown as PrismaService;
        const service = new TeacherProfileMediaService(
            prisma,
            {} as TeacherProfileMediaFileStorageService,
            { get: vi.fn() } as unknown as ConfigService,
        );

        await expect(service.downloadPublic(41))
            .rejects.toThrow('Файл профиля не найден');
        expect(prisma.teacherProfileMedia.findFirst).toHaveBeenCalledWith({
            where: {
                id: 41,
                status: TeacherProfileMediaStatus.APPROVED,
                teacher: {
                    is: {
                        role: UserRole.TEACHER,
                        status: UserStatus.ACTIVE,
                        teacherProfile: {
                            is: {
                                verificationStatus:
                                    TeacherVerificationStatus.VERIFIED,
                            },
                        },
                    },
                },
            },
        });
    });

    it('returns a stored file when the publication policy query succeeds', async () => {
        const media = {
            id: 41,
            teacherId: teacher.id,
            type: TeacherProfileMediaType.PHOTO,
            originalName: 'teacher.jpg',
            mimeType: 'image/jpeg',
            fileSize: BigInt(1200),
            storedPath: 'teacher-profile-media/17/photo/teacher.jpg',
            status: TeacherProfileMediaStatus.APPROVED,
        };
        const prisma = {
            teacherProfileMedia: {
                findFirst: vi.fn().mockResolvedValue(media),
            },
        } as unknown as PrismaService;
        const files = {
            readStoredFile: vi.fn().mockResolvedValue({
                absolutePath: 'E:/storage/teacher.jpg',
                size: 1200,
            }),
        } as unknown as TeacherProfileMediaFileStorageService;
        const service = new TeacherProfileMediaService(
            prisma,
            files,
            { get: vi.fn() } as unknown as ConfigService,
        );

        await expect(service.downloadPublic(41)).resolves.toEqual({
            absolutePath: 'E:/storage/teacher.jpg',
            size: 1200,
            originalName: 'teacher.jpg',
            mimeType: 'image/jpeg',
        });
        expect(files.readStoredFile).toHaveBeenCalledWith(media.storedPath);
    });
});
