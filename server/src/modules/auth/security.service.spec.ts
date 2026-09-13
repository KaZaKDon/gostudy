import { compare, hash } from 'bcryptjs';
import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { PrismaService } from '../../common/prisma/prisma.service';
import { hashToken } from '../../common/security/token';
import { SecurityService } from './security.service';

async function createSecurityService() {
    const passwordHash = await hash('current-password', 4);
    const transaction = {
        user: {
            update: vi.fn().mockResolvedValue(undefined),
        },
        authSession: {
            deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
            count: vi.fn().mockResolvedValue(1),
        },
    };
    const prisma = {
        user: {
            findUnique: vi.fn().mockResolvedValue({ passwordHash }),
        },
        authSession: {
            count: vi.fn().mockResolvedValue(2),
            deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
        $transaction: vi.fn(
            async (callback: (tx: typeof transaction) => Promise<unknown>) => (
                callback(transaction)
            ),
        ),
    } as unknown as PrismaService;

    return {
        prisma,
        transaction,
        service: new SecurityService(prisma),
    };
}

describe('SecurityService', () => {
    it('returns the number of active sessions', async () => {
        const { service, prisma } = await createSecurityService();

        await expect(service.getActiveSessions({ id: 15 })).resolves.toEqual({
            success: true,
            active_sessions: 2,
        });
        expect(prisma.authSession.count).toHaveBeenCalledOnce();
    });

    it('changes the password and closes other sessions', async () => {
        const { service, transaction } = await createSecurityService();

        const result = await service.execute(
            { id: 15 },
            {
                action: 'change_password',
                current_password: 'current-password',
                new_password: 'new-password',
                new_password_confirmation: 'new-password',
            },
            'current-session-token',
        );

        expect(result).toMatchObject({
            success: true,
            active_sessions: 1,
        });
        expect(transaction.user.update).toHaveBeenCalledOnce();
        expect(transaction.authSession.deleteMany).toHaveBeenCalledWith({
            where: {
                userId: 15,
                tokenHash: { not: hashToken('current-session-token') },
            },
        });
        const savedHash = transaction.user.update.mock.calls[0][0]
            .data.passwordHash;
        await expect(compare('new-password', savedHash)).resolves.toBe(true);
    });

    it('rejects an incorrect current password', async () => {
        const { service } = await createSecurityService();

        await expect(service.execute(
            { id: 15 },
            {
                action: 'change_password',
                current_password: 'wrong-password',
                new_password: 'new-password',
                new_password_confirmation: 'new-password',
            },
            'current-session-token',
        )).rejects.toThrow('Текущий пароль указан неверно');
    });

    it('rejects a short or repeated password', async () => {
        const { service } = await createSecurityService();

        await expect(service.execute(
            { id: 15 },
            {
                action: 'change_password',
                current_password: 'current-password',
                new_password: 'short',
                new_password_confirmation: 'short',
            },
            'current-session-token',
        )).rejects.toThrow('не менее 8 символов');

        await expect(service.execute(
            { id: 15 },
            {
                action: 'change_password',
                current_password: 'current-password',
                new_password: 'current-password',
                new_password_confirmation: 'current-password',
            },
            'current-session-token',
        )).rejects.toThrow('отличаться от текущего');
    });

    it('closes other sessions without changing the password', async () => {
        const { service, prisma } = await createSecurityService();

        await expect(service.execute(
            { id: 15 },
            { action: 'logout_other_sessions' },
            'current-session-token',
        )).resolves.toMatchObject({
            success: true,
            active_sessions: 2,
        });
        expect(prisma.authSession.deleteMany).toHaveBeenCalledWith({
            where: {
                userId: 15,
                tokenHash: { not: hashToken('current-session-token') },
            },
        });
    });
});
