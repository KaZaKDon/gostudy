import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
    TeacherVerificationStatus,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { NotificationsService } from '../notifications/notifications.service';
import { AdminTeachersService } from './admin-teachers.service';

const admin: SessionUser = {
    id: 1,
    role: UserRole.ADMIN,
    email: 'admin@example.com',
    fullName: 'Администратор',
    phone: null,
    avatarUrl: null,
    status: UserStatus.ACTIVE,
    emailVerifiedAt: new Date(),
    profileCompleted: true,
};

function createService() {
    const transaction = {
        teacherProfile: {
            update: vi.fn().mockResolvedValue({
                verificationStatus: TeacherVerificationStatus.VERIFIED,
                verificationComment: null,
                verifiedAt: new Date(),
                isVisible: true,
            }),
        },
        adminAuditLog: {
            create: vi.fn().mockResolvedValue(undefined),
        },
    };
    const prisma = {
        user: {
            count: vi.fn().mockResolvedValue(1),
            findMany: vi.fn().mockResolvedValue([{
                id: 7,
                fullName: 'Преподаватель',
                email: 'teacher@example.com',
                phone: null,
                status: UserStatus.ACTIVE,
                teacherProfile: {
                    id: 10,
                    verificationStatus: TeacherVerificationStatus.PENDING,
                    verificationComment: null,
                    isVisible: false,
                    profileCompletion: 100,
                },
                teacherSubjects: [],
                _count: { teachingRelations: 0 },
            }]),
            findUnique: vi.fn(),
        },
        $transaction: vi.fn(async (callback) => callback(transaction)),
    } as unknown as PrismaService;
    const notifications = {
        create: vi.fn().mockResolvedValue(undefined),
    } as unknown as NotificationsService;

    return {
        service: new AdminTeachersService(prisma, notifications),
        prisma,
        transaction,
        notifications,
    };
}

describe('AdminTeachersService', () => {
    it('returns a paginated teacher list', async () => {
        const { service } = createService();
        const result = await service.list(admin, {
            page: 1,
            limit: 20,
            verification_status: 'pending',
        });

        expect(result).toMatchObject({
            success: true,
            data: {
                items: [{
                    id: 7,
                    verification_status: 'pending',
                    is_visible: false,
                }],
                pagination: { total: 1, pages: 1 },
            },
        });
    });

    it('verifies and publishes a completed active profile', async () => {
        const {
            service,
            prisma,
            transaction,
            notifications,
        } = createService();
        vi.mocked(prisma.user.findUnique).mockResolvedValue({
            id: 7,
            role: UserRole.TEACHER,
            status: UserStatus.ACTIVE,
            teacherProfile: {
                profileCompletion: 100,
                verificationStatus: TeacherVerificationStatus.PENDING,
                verificationComment: null,
                isVisible: false,
            },
        } as never);

        const result = await service.updateVerification(
            admin,
            7,
            { status: 'verified', comment: '' },
            { ipAddress: '127.0.0.1', userAgent: 'test' },
        );

        expect(result.success).toBe(true);
        expect(transaction.teacherProfile.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    verificationStatus: TeacherVerificationStatus.VERIFIED,
                    isVisible: true,
                }),
            }),
        );
        expect(transaction.adminAuditLog.create).toHaveBeenCalledOnce();
        expect(notifications.create).toHaveBeenCalledOnce();
    });

    it('requires a comment when returning a profile', async () => {
        const { service } = createService();

        await expect(service.updateVerification(
            admin,
            7,
            { status: 'rejected', comment: '  ' },
            { ipAddress: null, userAgent: null },
        )).rejects.toThrow('Укажите причину возврата на доработку');
    });

    it('does not publish an unverified profile', async () => {
        const { service, prisma } = createService();
        vi.mocked(prisma.user.findUnique).mockResolvedValue({
            id: 7,
            role: UserRole.TEACHER,
            status: UserStatus.ACTIVE,
            teacherProfile: {
                verificationStatus: TeacherVerificationStatus.PENDING,
                isVisible: false,
            },
        } as never);

        await expect(service.updateVisibility(
            admin,
            7,
            { is_visible: true },
            { ipAddress: null, userAgent: null },
        )).rejects.toThrow('Опубликовать можно только подтверждённую анкету');
    });
});
