import { BadRequestException, ForbiddenException } from '@nestjs/common';
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
        const remove = vi.fn().mockResolvedValue(undefined);
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
            removeStoredPaths: remove,
        });

        await expect(instance.create(teacher, {
            subject_id: 1,
            category: 'textbook',
            title: 'Учебник',
            access_type: 'free',
            publication_mode: 'private',
        }, [upload] as never)).rejects.toThrow('disk');
        expect(prisma.learningMaterial.delete).toHaveBeenCalledWith({ where: { id: 42 } });
        expect(remove).toHaveBeenCalledWith([]);
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
});
