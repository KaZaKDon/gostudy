import {
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';
import { hashToken } from '../../common/security/token';
import { UserStatus } from '../../generated/prisma/enums';
import type { SessionUser } from './session-user';

@Injectable()
export class SessionAuthService {
    constructor(private readonly prisma: PrismaService) {}

    async revoke(token: string | undefined): Promise<void> {
        const normalizedToken = token?.trim();

        if (!normalizedToken) {
            return;
        }

        await this.prisma.authSession.deleteMany({
            where: { tokenHash: hashToken(normalizedToken) },
        });
    }

    async authenticate(token: string | undefined): Promise<SessionUser> {
        const normalizedToken = token?.trim();

        if (!normalizedToken) {
            throw new UnauthorizedException('Требуется авторизация');
        }

        const session = await this.prisma.authSession.findUnique({
            where: { tokenHash: hashToken(normalizedToken) },
            select: {
                id: true,
                expiresAt: true,
                user: {
                    select: {
                        id: true,
                        role: true,
                        email: true,
                        fullName: true,
                        phone: true,
                        avatarUrl: true,
                        status: true,
                        emailVerifiedAt: true,
                        profileCompleted: true,
                    },
                },
            },
        });

        if (!session) {
            throw new UnauthorizedException('Сессия недействительна');
        }

        if (session.expiresAt <= new Date()) {
            await this.prisma.authSession.delete({
                where: { id: session.id },
            }).catch(() => undefined);

            throw new UnauthorizedException(
                'Срок действия сессии истёк. Войдите снова.',
            );
        }

        if (
            session.user.status !== UserStatus.ACTIVE
            || !session.user.emailVerifiedAt
        ) {
            throw new UnauthorizedException('Аккаунт недоступен');
        }

        await this.prisma.authSession.update({
            where: { id: session.id },
            data: { lastUsedAt: new Date() },
        });

        return session.user;
    }
}
