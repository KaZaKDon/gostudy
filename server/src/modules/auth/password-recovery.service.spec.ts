import { ConfigService } from '@nestjs/config';
import { hash } from 'bcryptjs';
import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { PrismaService } from '../../common/prisma/prisma.service';
import { UserStatus } from '../../generated/prisma/enums';
import { MailService } from '../mail/mail.service';
import { PasswordRecoveryService } from './password-recovery.service';

async function createRecoveryService() {
    const passwordHash = await hash('current-password', 4);
    const user = {
        id: 15,
        email: 'student@example.com',
        fullName: 'Ученик',
        status: UserStatus.ACTIVE,
        passwordHash,
    };
    const resetToken = {
        id: 'reset-id',
        userId: user.id,
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: null,
        createdAt: new Date(),
        user,
    };
    const transaction = {
        passwordResetToken: {
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        user: {
            update: vi.fn().mockResolvedValue(undefined),
        },
        authSession: {
            deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
    };
    const prisma = {
        user: {
            findUnique: vi.fn().mockResolvedValue(user),
        },
        passwordResetToken: {
            findFirst: vi.fn().mockResolvedValue(null),
            findUnique: vi.fn().mockResolvedValue(resetToken),
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
            create: vi.fn().mockResolvedValue(undefined),
        },
        $transaction: vi.fn(async (operation) => (
            Array.isArray(operation)
                ? Promise.all(operation)
                : operation(transaction)
        )),
    } as unknown as PrismaService;
    const mail = {
        sendPasswordResetEmail: vi.fn().mockResolvedValue(true),
    } as unknown as MailService;
    const config = new ConfigService({
        NODE_ENV: 'test',
        APP_URL: 'https://gostudyonline.ru',
        PASSWORD_RESET_MINUTES: 60,
        PASSWORD_RESET_RESEND_SECONDS: 60,
    });

    return {
        mail,
        prisma,
        transaction,
        resetToken,
        user,
        service: new PasswordRecoveryService(prisma, config, mail),
    };
}

describe('PasswordRecoveryService', () => {
    it('does not disclose that an email is unknown', async () => {
        const { mail, prisma, service } = await createRecoveryService();
        vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

        await expect(service.requestReset({
            email: 'unknown@example.com',
        })).resolves.toMatchObject({ success: true });
        expect(mail.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('creates a hashed token and sends a reset link', async () => {
        const { mail, prisma, service } = await createRecoveryService();

        await expect(service.requestReset({
            email: 'STUDENT@example.com',
        })).resolves.toMatchObject({ success: true });
        expect(prisma.passwordResetToken.create).toHaveBeenCalledOnce();
        expect(mail.sendPasswordResetEmail).toHaveBeenCalledWith(
            'student@example.com',
            'Ученик',
            expect.stringMatching(
                /^https:\/\/gostudyonline\.ru\/password-reset\?token=/,
            ),
            60,
        );
        const createData = vi.mocked(
            prisma.passwordResetToken.create,
        ).mock.calls[0][0].data;
        expect(createData.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('does not send another letter during the cooldown', async () => {
        const { mail, prisma, service } = await createRecoveryService();
        vi.mocked(prisma.passwordResetToken.findFirst).mockResolvedValue({
            id: 'recent-reset-id',
            userId: 15,
            tokenHash: 'recent-hash',
            expiresAt: new Date(Date.now() + 60_000),
            usedAt: null,
            createdAt: new Date(),
        });

        await service.requestReset({ email: 'student@example.com' });

        expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
        expect(mail.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('changes the password, consumes tokens and closes sessions', async () => {
        const { service, transaction } = await createRecoveryService();

        await expect(service.resetPassword({
            token: 'reset-token',
            new_password: 'new-password',
            new_password_confirmation: 'new-password',
        })).resolves.toMatchObject({ success: true });
        expect(transaction.user.update).toHaveBeenCalledOnce();
        expect(transaction.passwordResetToken.updateMany).toHaveBeenCalledTimes(2);
        expect(transaction.authSession.deleteMany).toHaveBeenCalledWith({
            where: { userId: 15 },
        });
    });

    it('rejects an expired token with a clear safe message', async () => {
        const { prisma, resetToken, service } = await createRecoveryService();
        vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue({
            ...resetToken,
            expiresAt: new Date(Date.now() - 1_000),
        });

        await expect(service.resetPassword({
            token: 'expired-token',
            new_password: 'new-password',
            new_password_confirmation: 'new-password',
        })).rejects.toThrow(
            'Ссылка восстановления недействительна, истекла или уже была использована',
        );
    });

    it('rejects an already used token with the same safe message', async () => {
        const { prisma, resetToken, service } = await createRecoveryService();
        vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue({
            ...resetToken,
            usedAt: new Date(),
        });

        await expect(service.resetPassword({
            token: 'used-token',
            new_password: 'new-password',
            new_password_confirmation: 'new-password',
        })).rejects.toThrow(
            'Ссылка восстановления недействительна, истекла или уже была использована',
        );
    });

    it('rejects the current password as the new password', async () => {
        const { service } = await createRecoveryService();

        await expect(service.resetPassword({
            token: 'reset-token',
            new_password: 'current-password',
            new_password_confirmation: 'current-password',
        })).rejects.toThrow('Новый пароль должен отличаться от текущего');
    });
});
