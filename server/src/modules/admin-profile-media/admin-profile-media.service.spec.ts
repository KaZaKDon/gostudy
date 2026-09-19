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
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { NotificationsService } from '../notifications/notifications.service';
import { TeacherProfileMediaFileStorageService } from '../teacher-profile-media/teacher-profile-media-file-storage.service';
import { TeacherProfileMediaService } from '../teacher-profile-media/teacher-profile-media.service';
import { AdminProfileMediaService } from './admin-profile-media.service';

const moderator: SessionUser = {
    id: 3,
    role: UserRole.MODERATOR,
    email: 'moderator@example.com',
    fullName: 'Модератор',
    phone: null,
    avatarUrl: null,
    status: UserStatus.ACTIVE,
    emailVerifiedAt: new Date(),
    profileCompleted: true,
};

describe('AdminProfileMediaService', () => {
    it('publishes a photo only after approval and replaces the old version', async () => {
        const pending = {
            id: 41,
            teacherId: 17,
            type: TeacherProfileMediaType.PHOTO,
            status: TeacherProfileMediaStatus.PENDING,
            rejectionReason: null,
        };
        const transaction = {
            teacherProfileMedia: {
                findUnique: vi.fn().mockResolvedValue(pending),
                updateMany: vi.fn().mockResolvedValue({ count: 1 }),
                update: vi.fn().mockResolvedValue({
                    ...pending,
                    status: TeacherProfileMediaStatus.APPROVED,
                    rejectionReason: null,
                }),
            },
            user: { update: vi.fn().mockResolvedValue({}) },
            teacherProfile: { updateMany: vi.fn() },
            adminAuditLog: { create: vi.fn().mockResolvedValue({}) },
        };
        const prisma = {
            $transaction: vi.fn().mockImplementation((callback) => (
                callback(transaction)
            )),
        } as unknown as PrismaService;
        const notifications = {
            create: vi.fn().mockResolvedValue(undefined),
        } as unknown as NotificationsService;
        const media = {
            publicUrl: vi.fn().mockReturnValue(
                'http://localhost:3002/api/v1/teachers/profile-media/41',
            ),
        } as unknown as TeacherProfileMediaService;
        const service = new AdminProfileMediaService(
            prisma,
            {} as TeacherProfileMediaFileStorageService,
            media,
            notifications,
        );

        await expect(service.moderate(
            moderator,
            pending.id,
            { decision: 'approved' },
            { ipAddress: '127.0.0.1', userAgent: 'vitest' },
        )).resolves.toMatchObject({ success: true });
        expect(transaction.teacherProfileMedia.updateMany)
            .toHaveBeenCalledWith({
                where: {
                    teacherId: pending.teacherId,
                    type: TeacherProfileMediaType.PHOTO,
                    status: TeacherProfileMediaStatus.APPROVED,
                },
                data: { status: TeacherProfileMediaStatus.REPLACED },
            });
        expect(transaction.user.update).toHaveBeenCalledWith({
            where: { id: pending.teacherId },
            data: {
                avatarUrl: 'http://localhost:3002/api/v1/teachers/profile-media/41',
            },
        });
        expect(notifications.create).toHaveBeenCalledOnce();
    });

    it('requires a reason when rejecting media', async () => {
        const service = new AdminProfileMediaService(
            {} as PrismaService,
            {} as TeacherProfileMediaFileStorageService,
            {} as TeacherProfileMediaService,
            {} as NotificationsService,
        );

        await expect(service.moderate(
            moderator,
            41,
            { decision: 'rejected', comment: '  ' },
            { ipAddress: null, userAgent: null },
        )).rejects.toThrow('Укажите причину отклонения');
    });
});
