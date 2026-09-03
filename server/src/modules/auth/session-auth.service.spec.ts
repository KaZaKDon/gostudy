import { describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import { SessionAuthService } from './session-auth.service';

function createPrisma(session: Record<string, unknown> | null) {
    return {
        authSession: {
            findUnique: vi.fn().mockResolvedValue(session),
            update: vi.fn().mockResolvedValue(undefined),
            delete: vi.fn().mockResolvedValue(undefined),
            deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
    } as unknown as PrismaService;
}

const activeUser = {
    id: 7,
    role: UserRole.TEACHER,
    email: 'teacher@example.com',
    fullName: null,
    phone: null,
    avatarUrl: null,
    status: UserStatus.ACTIVE,
    emailVerifiedAt: new Date(),
    profileCompleted: false,
};

describe('SessionAuthService', () => {
    it('accepts an active local PostgreSQL session', async () => {
        const prisma = createPrisma({
            id: '2e8f907b-2cf4-4318-88dd-c4eb89e08ca4',
            expiresAt: new Date(Date.now() + 60_000),
            user: activeUser,
        });
        const service = new SessionAuthService(prisma);

        await expect(service.authenticate('local-token')).resolves.toEqual(
            activeUser,
        );
        expect(prisma.authSession.update).toHaveBeenCalledOnce();
    });

    it('rejects a token absent from PostgreSQL', async () => {
        const service = new SessionAuthService(createPrisma(null));

        await expect(service.authenticate('unknown-token')).rejects.toThrow(
            'Сессия недействительна',
        );
    });

    it('deletes and rejects an expired session', async () => {
        const prisma = createPrisma({
            id: '2e8f907b-2cf4-4318-88dd-c4eb89e08ca4',
            expiresAt: new Date(Date.now() - 60_000),
            user: activeUser,
        });
        const service = new SessionAuthService(prisma);

        await expect(service.authenticate('expired-token')).rejects.toThrow(
            'Срок действия сессии истёк',
        );
        expect(prisma.authSession.delete).toHaveBeenCalledOnce();
    });

    it('revokes the current session token', async () => {
        const prisma = createPrisma(null);
        const service = new SessionAuthService(prisma);

        await service.revoke('local-token');

        expect(prisma.authSession.deleteMany).toHaveBeenCalledOnce();
    });
});
