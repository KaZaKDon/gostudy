import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { AdminAccountsService } from './admin-accounts.service';

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

const account = {
    id: 7,
    fullName: 'Ученик',
    email: 'student@example.com',
    phone: null,
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
    blockedReason: null,
    archivedAt: null,
    archiveReason: null,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
};

function createPrisma() {
    const transaction = {
        user: {
            update: vi.fn().mockResolvedValue(account),
        },
        authSession: {
            deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        adminAuditLog: {
            create: vi.fn().mockResolvedValue(undefined),
        },
        studentProfile: {
            upsert: vi.fn().mockResolvedValue(undefined),
        },
        teacherProfile: {
            upsert: vi.fn().mockResolvedValue(undefined),
        },
    };
    const prisma = {
        user: {
            count: vi.fn().mockResolvedValue(1),
            findMany: vi.fn().mockResolvedValue([account]),
            findUnique: vi.fn().mockResolvedValue(account),
        },
        teacherStudentRequest: {
            count: vi.fn().mockResolvedValue(2),
        },
        lesson: {
            count: vi.fn().mockResolvedValue(3),
        },
        homework: {
            count: vi.fn().mockResolvedValue(0),
        },
        $transaction: vi.fn(async (callback) => callback(transaction)),
    } as unknown as PrismaService;

    return {
        prisma,
        service: new AdminAccountsService(prisma),
        transaction,
    };
}

describe('AdminAccountsService', () => {
    it('returns a paginated account list', async () => {
        const { service } = createPrisma();

        const result = await service.list(admin, {
            page: 1,
            limit: 20,
            q: 'student',
            role: 'student',
            status: 'active',
        });

        expect(result.success).toBe(true);
        expect(result.data).toMatchObject({
            items: [{ id: 7, role: 'student', status: 'active' }],
            pagination: { total: 1, pages: 1 },
        });
    });

    it('does not allow an administrator to block themself', async () => {
        const { service } = createPrisma();

        await expect(service.updateStatus(
            admin,
            admin.id,
            {
                status: 'blocked',
                blocked_reason: 'Причина',
            },
            { ipAddress: null, userAgent: null },
        )).rejects.toThrow(
            'Нельзя заблокировать или архивировать собственный аккаунт',
        );
    });

    it('blocks an account, revokes sessions and writes an audit record', async () => {
        const { service, transaction } = createPrisma();
        transaction.user.update.mockResolvedValue({
            ...account,
            status: UserStatus.BLOCKED,
            blockedReason: 'Нарушение правил',
        });

        await service.updateStatus(
            admin,
            account.id,
            {
                status: 'blocked',
                blocked_reason: 'Нарушение правил',
            },
            { ipAddress: '127.0.0.1', userAgent: 'test' },
        );

        expect(transaction.authSession.deleteMany).toHaveBeenCalledWith({
            where: { userId: account.id },
        });
        expect(transaction.adminAuditLog.create).toHaveBeenCalledOnce();
    });

    it('creates a teacher profile when the role changes', async () => {
        const { service, transaction } = createPrisma();
        transaction.user.update.mockResolvedValue({
            ...account,
            role: UserRole.TEACHER,
        });

        await service.updateRole(
            admin,
            account.id,
            { role: 'teacher' },
            { ipAddress: null, userAgent: null },
        );

        expect(transaction.teacherProfile.upsert).toHaveBeenCalledWith({
            where: { userId: account.id },
            create: { userId: account.id },
            update: {},
        });
        expect(transaction.authSession.deleteMany).toHaveBeenCalledOnce();
        expect(transaction.adminAuditLog.create).toHaveBeenCalledOnce();
    });
});
