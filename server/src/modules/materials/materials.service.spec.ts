import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
    MaterialAccessType,
    MaterialPublicationStatus,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { NotificationsService } from '../notifications/notifications.service';
import { MaterialFileStorageService } from './material-file-storage.service';
import { MaterialsService } from './materials.service';

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

function service(prisma: PrismaService, fileOverrides = {}) {
    const files = {
        validateUploads: vi.fn((items) => items),
        storeUploads: vi.fn().mockResolvedValue([]),
        removeStoredPaths: vi.fn().mockResolvedValue(undefined),
        releaseQuota: vi.fn().mockResolvedValue(undefined),
        discardStoredFiles: vi.fn().mockResolvedValue(undefined),
        limits: vi.fn().mockReturnValue({ maxFiles: 5, maxFileBytes: 20, maxTotalBytes: 50 }),
        ...fileOverrides,
    } as unknown as MaterialFileStorageService;
    return { instance: new MaterialsService(prisma, {} as NotificationsService, files), files };
}

describe('MaterialsService', () => {
    it('requires at least one file or a safe external link', async () => {
        const { instance } = service({} as PrismaService);
        await expect(instance.create(teacher, {
            subject_id: 1,
            category: 'extra',
            title: 'Конспект',
            access_type: 'free',
            publication_mode: 'private',
        }, [])).rejects.toBeInstanceOf(BadRequestException);
    });

    it('removes a material when storing uploaded files fails', async () => {
        const prisma = {
            subject: { findFirst: vi.fn().mockResolvedValue({ id: 1 }) },
            learningMaterial: {
                create: vi.fn().mockResolvedValue({ id: 42 }),
                delete: vi.fn().mockResolvedValue(undefined),
            },
        } as unknown as PrismaService;
        const upload = { originalname: 'урок.pdf', size: 5 };
        const { instance } = service(prisma, {
            validateUploads: vi.fn().mockReturnValue([upload]),
            storeUploads: vi.fn().mockRejectedValue(new Error('disk')),
            discardStoredFiles: vi.fn().mockResolvedValue(undefined),
        });

        await expect(instance.create(teacher, {
            subject_id: 1,
            category: 'textbook',
            title: 'Учебник',
            access_type: 'free',
            publication_mode: 'private',
        }, [upload] as never)).rejects.toThrow('disk');
        expect(prisma.learningMaterial.delete).toHaveBeenCalledWith({ where: { id: 42 } });
    });

    it('does not open a paid public material without an access grant', async () => {
        const prisma = {
            materialItem: {
                findUnique: vi.fn().mockResolvedValue({
                    id: 3,
                    contentType: 'FILE',
                    material: {
                        creatorId: 99,
                        publicationStatus: MaterialPublicationStatus.APPROVED,
                        accessType: MaterialAccessType.PAID,
                        accessGrants: [],
                    },
                }),
            },
        } as unknown as PrismaService;
        const { instance } = service(prisma);

        await expect(instance.download({ ...teacher, id: 8 }, 3))
            .rejects.toBeInstanceOf(ForbiddenException);
    });

    it('deletes an inactive personal material and releases its quota', async () => {
        const transaction = {
            learningMaterial: {
                delete: vi.fn().mockResolvedValue(undefined),
            },
        };
        const prisma = {
            learningMaterial: {
                findFirst: vi.fn().mockResolvedValue({
                    id: 42,
                    publicationStatus: MaterialPublicationStatus.HIDDEN,
                    items: [
                        { storedPath: 'materials/42/a.pdf', fileSize: 500 },
                        { storedPath: null, fileSize: null },
                    ],
                    assignments: [],
                    accessGrants: [],
                }),
            },
            $transaction: vi.fn(async (callback) => callback(transaction)),
        } as unknown as PrismaService;
        const { instance, files } = service(prisma);

        await expect(instance.delete(teacher, 42)).resolves.toMatchObject({
            success: true,
            material_id: 42,
            released_bytes: 500,
        });
        expect(transaction.learningMaterial.delete).toHaveBeenCalledWith({
            where: { id: 42 },
        });
        expect(files.releaseQuota).toHaveBeenCalledWith(
            teacher.id,
            500,
            transaction,
        );
        expect(files.removeStoredPaths).toHaveBeenCalledWith([
            'materials/42/a.pdf',
        ]);
    });

    it('does not delete a published material directly', async () => {
        const prisma = {
            learningMaterial: {
                findFirst: vi.fn().mockResolvedValue({
                    id: 42,
                    publicationStatus: MaterialPublicationStatus.APPROVED,
                    items: [],
                    assignments: [],
                    accessGrants: [],
                }),
            },
        } as unknown as PrismaService;
        const { instance } = service(prisma);

        await expect(instance.delete(teacher, 42))
            .rejects.toBeInstanceOf(ConflictException);
    });
});
