import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    GoneException,
    HttpException,
    HttpStatus,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { compare, hash } from 'bcryptjs';

import type { RequestMetadata } from '../../common/http/request-metadata';
import { createOpaqueToken, hashToken } from '../../common/security/token';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import { LegalConsentsService } from '../legal-consents/legal-consents.service';
import { MailService } from '../mail/mail.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { ResendVerificationDto } from './dto/resend-verification.dto';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
        private readonly legalConsents: LegalConsentsService,
        private readonly mail: MailService,
    ) {}

    async register(
        input: RegisterDto,
        metadata: RequestMetadata,
    ): Promise<Record<string, unknown>> {
        const email = input.email.trim().toLowerCase();
        const platformDocumentsAccepted =
            input.legal_acceptances.platform_documents.accepted;
        const personalDataAccepted =
            input.legal_acceptances.personal_data.accepted;

        if (!platformDocumentsAccepted) {
            throw new BadRequestException(
                'Необходимо принять документы платформы',
            );
        }

        if (!personalDataAccepted) {
            throw new BadRequestException(
                'Необходимо дать согласие на обработку персональных данных',
            );
        }

        const existingUser = await this.prisma.user.findUnique({
            where: { email },
            select: { id: true },
        });

        if (existingUser) {
            throw new ConflictException(
                'Пользователь с таким email уже существует',
            );
        }

        const role = input.role === 'student'
            ? UserRole.STUDENT
            : UserRole.TEACHER;
        const passwordHash = await hash(input.password, 12);
        const verificationToken = createOpaqueToken();
        const verificationTokenHash = hashToken(verificationToken);
        const now = new Date();
        const verificationExpiresAt = this.addHours(
            now,
            this.getNumber('EMAIL_VERIFICATION_HOURS', 24),
        );
        const legalSnapshots = this.legalConsents.getRegistrationSnapshots({
            platformDocumentsAccepted,
            personalDataAccepted,
            marketingAccepted:
                input.legal_acceptances.marketing.accepted,
        });

        let user;

        try {
            user = await this.prisma.user.create({
                data: {
                    role,
                    email,
                    passwordHash,
                    emailVerificationTokenHash: verificationTokenHash,
                    emailVerificationExpiresAt: verificationExpiresAt,
                    emailVerificationSentAt: now,
                    ...(role === UserRole.STUDENT
                        ? { studentProfile: { create: {} } }
                        : { teacherProfile: { create: {} } }),
                    legalAcceptances: {
                        create: legalSnapshots.map((snapshot) => ({
                            type: snapshot.type,
                            source: snapshot.source,
                            accepted: snapshot.accepted,
                            consentText: snapshot.consentText,
                            ipAddress: metadata.ipAddress,
                            userAgent: metadata.userAgent,
                            documents: {
                                create: snapshot.documents,
                            },
                        })),
                    },
                },
                select: {
                    id: true,
                    role: true,
                    email: true,
                    status: true,
                    emailVerifiedAt: true,
                    profileCompleted: true,
                },
            });
        } catch (error) {
            if (this.isUniqueConstraintError(error)) {
                throw new ConflictException(
                    'Пользователь с таким email уже существует',
                );
            }

            throw error;
        }

        const verificationUrl = this.createVerificationUrl(
            verificationToken,
        );
        const mailSent = await this.mail.sendVerificationEmail(
            email,
            'пользователь GoStudy',
            verificationUrl,
        );

        if (!mailSent) {
            await this.prisma.user.update({
                where: { id: user.id },
                data: { emailVerificationSentAt: null },
            });
        }

        return {
            success: true,
            message: mailSent
                ? 'Регистрация выполнена. Мы отправили письмо для подтверждения email.'
                : this.config.get('NODE_ENV') === 'development'
                    ? 'Регистрация выполнена. В локальном режиме ссылка подтверждения выведена в журнал API.'
                    : 'Регистрация выполнена, но письмо подтверждения не удалось отправить.',
            email_verification_required: true,
            mail_sent: mailSent,
            user: this.toPublicUser(user),
        };
    }

    async login(
        input: LoginDto,
        metadata: RequestMetadata,
    ): Promise<Record<string, unknown>> {
        return this.loginWithAccess(input, metadata);
    }

    async adminLogin(
        input: LoginDto,
        metadata: RequestMetadata,
    ): Promise<Record<string, unknown>> {
        return this.loginWithAccess(
            input,
            metadata,
            [UserRole.ADMIN, UserRole.MODERATOR],
        );
    }

    private async loginWithAccess(
        input: LoginDto,
        metadata: RequestMetadata,
        allowedRoles?: readonly UserRole[],
    ): Promise<Record<string, unknown>> {
        const email = input.email.trim().toLowerCase();
        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        if (!user || !await compare(input.password, user.passwordHash)) {
            throw new UnauthorizedException('Неверный email или пароль');
        }

        if (allowedRoles && !allowedRoles.includes(user.role)) {
            throw new ForbiddenException(
                'Доступ разрешён только администратору или модератору',
            );
        }

        if (user.status !== UserStatus.ACTIVE) {
            throw new ForbiddenException(
                user.status === UserStatus.BLOCKED
                    ? 'Аккаунт заблокирован. Обратитесь в поддержку.'
                    : 'Аккаунт недоступен',
            );
        }

        if (!user.emailVerifiedAt) {
            const verificationExpired = !user.emailVerificationExpiresAt
                || user.emailVerificationExpiresAt < new Date();

            throw new HttpException({
                message: verificationExpired
                    ? 'Срок действия письма подтверждения истёк.'
                    : 'Подтвердите электронную почту.',
                status: 'email_not_verified',
                email: user.email,
                verification_expired: verificationExpired,
            }, HttpStatus.FORBIDDEN);
        }

        const token = createOpaqueToken();
        const expiresAt = this.addDays(
            new Date(),
            this.getNumber('AUTH_SESSION_DAYS', 30),
        );

        await this.prisma.$transaction([
            this.prisma.authSession.create({
                data: {
                    userId: user.id,
                    tokenHash: hashToken(token),
                    expiresAt,
                    ipAddress: metadata.ipAddress,
                    userAgent: metadata.userAgent,
                },
            }),
            this.prisma.user.update({
                where: { id: user.id },
                data: { lastLoginAt: new Date() },
            }),
        ]);

        return {
            success: true,
            message: 'Вход выполнен',
            token,
            user: this.toPublicUser(user),
        };
    }

    async verifyEmail(token: string): Promise<Record<string, unknown>> {
        const normalizedToken = token?.trim();

        if (!normalizedToken) {
            throw new BadRequestException('Токен подтверждения не передан');
        }

        const user = await this.prisma.user.findUnique({
            where: {
                emailVerificationTokenHash: hashToken(normalizedToken),
            },
        });

        if (!user) {
            throw new NotFoundException(
                'Ссылка подтверждения недействительна',
            );
        }

        if (user.emailVerifiedAt) {
            return {
                success: true,
                message: 'Электронная почта уже подтверждена',
                email_verified: true,
            };
        }

        if (
            !user.emailVerificationExpiresAt
            || user.emailVerificationExpiresAt < new Date()
        ) {
            throw new GoneException({
                message: 'Срок действия ссылки подтверждения истёк',
                status: 'expired',
                email: user.email,
            });
        }

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerifiedAt: new Date(),
                emailVerificationTokenHash: null,
                emailVerificationExpiresAt: null,
                emailVerificationSentAt: null,
            },
        });

        return {
            success: true,
            message: 'Электронная почта успешно подтверждена',
            email_verified: true,
        };
    }

    async resendVerification(
        input: ResendVerificationDto,
    ): Promise<Record<string, unknown>> {
        const email = input.email.trim().toLowerCase();
        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            throw new NotFoundException(
                'Пользователь с таким email не найден',
            );
        }

        if (user.emailVerifiedAt) {
            throw new ConflictException(
                'Электронная почта уже подтверждена',
            );
        }

        const resendSeconds = this.getNumber(
            'EMAIL_VERIFICATION_RESEND_SECONDS',
            60,
        );

        if (
            user.emailVerificationSentAt
            && user.emailVerificationSentAt.getTime()
                + resendSeconds * 1000 > Date.now()
        ) {
            throw new HttpException(
                'Повторную отправку можно выполнить через минуту',
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }

        const token = createOpaqueToken();
        const now = new Date();

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerificationTokenHash: hashToken(token),
                emailVerificationExpiresAt: this.addHours(
                    now,
                    this.getNumber('EMAIL_VERIFICATION_HOURS', 24),
                ),
                emailVerificationSentAt: now,
            },
        });

        const mailSent = await this.mail.sendVerificationEmail(
            user.email,
            user.fullName || 'пользователь GoStudy',
            this.createVerificationUrl(token),
        );

        if (!mailSent) {
            await this.prisma.user.update({
                where: { id: user.id },
                data: { emailVerificationSentAt: null },
            });

            if (this.config.get('NODE_ENV') !== 'development') {
                throw new HttpException(
                    'Не удалось отправить письмо подтверждения',
                    HttpStatus.INTERNAL_SERVER_ERROR,
                );
            }
        }

        return {
            success: true,
            message: mailSent
                ? 'Новое письмо подтверждения отправлено'
                : 'В локальном режиме новая ссылка выведена в журнал API',
            email_verification_required: true,
            mail_sent: mailSent,
        };
    }

    private createVerificationUrl(token: string): string {
        const appUrl = this.config.get<string>(
            'APP_URL',
            'http://localhost:5174',
        );

        return `${appUrl}/verify-email?token=${encodeURIComponent(token)}`;
    }

    private toPublicUser(user: {
        id: number;
        role: UserRole;
        email: string;
        status: UserStatus;
        emailVerifiedAt: Date | null;
        profileCompleted: boolean;
        fullName?: string | null;
        phone?: string | null;
        avatarUrl?: string | null;
    }): Record<string, unknown> {
        return {
            id: user.id,
            role: user.role.toLowerCase(),
            email: user.email,
            full_name: user.fullName ?? null,
            phone: user.phone ?? null,
            avatar_url: user.avatarUrl ?? null,
            status: user.status.toLowerCase(),
            email_verified: Boolean(user.emailVerifiedAt),
            profile_completed: user.profileCompleted,
        };
    }

    private getNumber(key: string, fallback: number): number {
        const value = Number(this.config.get(key, fallback));

        return Number.isFinite(value) ? value : fallback;
    }

    private addHours(date: Date, hours: number): Date {
        return new Date(date.getTime() + hours * 60 * 60 * 1000);
    }

    private addDays(date: Date, days: number): Date {
        return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
    }

    private isUniqueConstraintError(error: unknown): boolean {
        return typeof error === 'object'
            && error !== null
            && 'code' in error
            && error.code === 'P2002';
    }
}
