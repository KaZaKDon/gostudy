import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { compare, hash } from 'bcryptjs';

import { PrismaService } from '../../common/prisma/prisma.service';
import { hashToken } from '../../common/security/token';
import type { SecurityActionDto } from './dto/security-action.dto';
import type { SessionUser } from './session-user';

@Injectable()
export class SecurityService {
    constructor(private readonly prisma: PrismaService) {}

    async getActiveSessions(
        user: Pick<SessionUser, 'id'>,
    ): Promise<Record<string, unknown>> {
        return {
            success: true,
            active_sessions: await this.countActiveSessions(user.id),
        };
    }

    async execute(
        user: Pick<SessionUser, 'id'>,
        input: SecurityActionDto,
        currentToken: string | undefined,
    ): Promise<Record<string, unknown>> {
        const token = currentToken?.trim();

        if (!token) {
            throw new UnauthorizedException('Требуется авторизация');
        }

        if (input.action === 'logout_other_sessions') {
            await this.closeOtherSessions(user.id, token);

            return {
                success: true,
                message: 'Остальные сеансы завершены',
                active_sessions: await this.countActiveSessions(user.id),
            };
        }

        return this.changePassword(user.id, input, token);
    }

    private async changePassword(
        userId: number,
        input: SecurityActionDto,
        currentToken: string,
    ): Promise<Record<string, unknown>> {
        const currentPassword = input.current_password ?? '';
        const newPassword = input.new_password ?? '';
        const confirmation = input.new_password_confirmation ?? '';

        if (!currentPassword) {
            throw new BadRequestException('Введите текущий пароль');
        }

        if (newPassword.length < 8) {
            throw new BadRequestException(
                'Новый пароль должен содержать не менее 8 символов',
            );
        }

        if (Buffer.byteLength(newPassword, 'utf8') > 72) {
            throw new BadRequestException(
                'Новый пароль не должен превышать 72 байта',
            );
        }

        if (newPassword !== confirmation) {
            throw new BadRequestException(
                'Новый пароль и подтверждение не совпадают',
            );
        }

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { passwordHash: true },
        });

        if (!user || !await compare(currentPassword, user.passwordHash)) {
            throw new ForbiddenException('Текущий пароль указан неверно');
        }

        if (await compare(newPassword, user.passwordHash)) {
            throw new BadRequestException(
                'Новый пароль должен отличаться от текущего',
            );
        }

        const passwordHash = await hash(newPassword, 12);
        const currentTokenHash = hashToken(currentToken);

        const activeSessions = await this.prisma.$transaction(
            async (transaction) => {
                await transaction.user.update({
                    where: { id: userId },
                    data: { passwordHash },
                });
                await transaction.authSession.deleteMany({
                    where: {
                        userId,
                        tokenHash: { not: currentTokenHash },
                    },
                });

                return transaction.authSession.count({
                    where: {
                        userId,
                        expiresAt: { gt: new Date() },
                    },
                });
            },
        );

        return {
            success: true,
            message: 'Пароль изменён. Остальные сеансы завершены',
            active_sessions: activeSessions,
        };
    }

    private async closeOtherSessions(
        userId: number,
        currentToken: string,
    ): Promise<void> {
        await this.prisma.authSession.deleteMany({
            where: {
                userId,
                tokenHash: { not: hashToken(currentToken) },
            },
        });
    }

    private countActiveSessions(userId: number): Promise<number> {
        return this.prisma.authSession.count({
            where: {
                userId,
                expiresAt: { gt: new Date() },
            },
        });
    }
}
