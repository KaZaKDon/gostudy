import {
    BadRequestException,
    ForbiddenException,
    GoneException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { compare, hash } from 'bcryptjs';

import { PrismaService } from '../../common/prisma/prisma.service';
import { createOpaqueToken, hashToken } from '../../common/security/token';
import { UserStatus } from '../../generated/prisma/enums';
import { MailService } from '../mail/mail.service';
import type { ForgotPasswordDto } from './dto/forgot-password.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';

const GENERIC_REQUEST_MESSAGE =
    'Если аккаунт с такой почтой существует, мы отправили ссылку для восстановления пароля.';
const RESET_LINK_UNAVAILABLE_MESSAGE =
    'Ссылка восстановления недействительна, истекла или уже была использована';

@Injectable()
export class PasswordRecoveryService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
        private readonly mail: MailService,
    ) {}

    async requestReset(
        input: ForgotPasswordDto,
    ): Promise<Record<string, unknown>> {
        const email = input.email.trim().toLowerCase();
        const user = await this.prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                fullName: true,
                status: true,
            },
        });

        if (!user || user.status !== UserStatus.ACTIVE) {
            return this.genericRequestResponse();
        }

        const resendSeconds = this.getNumber(
            'PASSWORD_RESET_RESEND_SECONDS',
            60,
        );
        const latestToken = await this.prisma.passwordResetToken.findFirst({
            where: {
                userId: user.id,
                usedAt: null,
            },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
        });

        if (
            latestToken
            && latestToken.createdAt.getTime() + resendSeconds * 1000
                > Date.now()
        ) {
            return this.genericRequestResponse();
        }

        const token = createOpaqueToken();
        const now = new Date();
        const expiresInMinutes = this.getNumber(
            'PASSWORD_RESET_MINUTES',
            60,
        );
        const expiresAt = new Date(
            now.getTime() + expiresInMinutes * 60 * 1000,
        );

        await this.prisma.$transaction([
            this.prisma.passwordResetToken.updateMany({
                where: {
                    userId: user.id,
                    usedAt: null,
                },
                data: { usedAt: now },
            }),
            this.prisma.passwordResetToken.create({
                data: {
                    userId: user.id,
                    tokenHash: hashToken(token),
                    expiresAt,
                },
            }),
        ]);

        const mailSent = await this.mail.sendPasswordResetEmail(
            user.email,
            user.fullName || 'пользователь GoStudy',
            this.createResetUrl(token),
            expiresInMinutes,
        );

        if (!mailSent && this.config.get('NODE_ENV') !== 'development') {
            await this.prisma.passwordResetToken.updateMany({
                where: {
                    userId: user.id,
                    tokenHash: hashToken(token),
                    usedAt: null,
                },
                data: { usedAt: new Date() },
            });
        }

        return this.genericRequestResponse();
    }

    async resetPassword(
        input: ResetPasswordDto,
    ): Promise<Record<string, unknown>> {
        const token = input.token.trim();
        const newPassword = input.new_password;

        if (!token) {
            throw new BadRequestException(
                'Токен восстановления не передан',
            );
        }

        if (Buffer.byteLength(newPassword, 'utf8') > 72) {
            throw new BadRequestException(
                'Новый пароль не должен превышать 72 байта',
            );
        }

        if (newPassword !== input.new_password_confirmation) {
            throw new BadRequestException(
                'Новый пароль и подтверждение не совпадают',
            );
        }

        const resetToken = await this.prisma.passwordResetToken.findUnique({
            where: { tokenHash: hashToken(token) },
            include: { user: true },
        });

        if (!resetToken) {
            throw new NotFoundException(
                RESET_LINK_UNAVAILABLE_MESSAGE,
            );
        }

        if (resetToken.usedAt || resetToken.expiresAt <= new Date()) {
            throw new GoneException(
                RESET_LINK_UNAVAILABLE_MESSAGE,
            );
        }

        if (resetToken.user.status !== UserStatus.ACTIVE) {
            throw new ForbiddenException('Аккаунт недоступен');
        }

        if (await compare(newPassword, resetToken.user.passwordHash)) {
            throw new BadRequestException(
                'Новый пароль должен отличаться от текущего',
            );
        }

        const passwordHash = await hash(newPassword, 12);
        const usedAt = new Date();

        await this.prisma.$transaction(async (transaction) => {
            const claimedToken = await transaction.passwordResetToken
                .updateMany({
                    where: {
                        id: resetToken.id,
                        usedAt: null,
                        expiresAt: { gt: usedAt },
                    },
                    data: { usedAt },
                });

            if (claimedToken.count !== 1) {
                throw new GoneException(
                    RESET_LINK_UNAVAILABLE_MESSAGE,
                );
            }

            await transaction.user.update({
                where: { id: resetToken.userId },
                data: { passwordHash },
            });
            await transaction.passwordResetToken.updateMany({
                where: {
                    userId: resetToken.userId,
                    usedAt: null,
                },
                data: { usedAt },
            });
            await transaction.authSession.deleteMany({
                where: { userId: resetToken.userId },
            });
        });

        return {
            success: true,
            message: 'Пароль изменён. Теперь можно войти в аккаунт.',
        };
    }

    private genericRequestResponse(): Record<string, unknown> {
        return {
            success: true,
            message: GENERIC_REQUEST_MESSAGE,
        };
    }

    private createResetUrl(token: string): string {
        const appUrl = this.config.get<string>(
            'APP_URL',
            'http://localhost:5174',
        );

        return `${appUrl}/password-reset?token=${encodeURIComponent(token)}`;
    }

    private getNumber(key: string, fallback: number): number {
        const value = Number(this.config.get(key, fallback));

        return Number.isFinite(value) ? value : fallback;
    }
}
