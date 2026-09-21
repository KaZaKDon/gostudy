import { ConfigService } from '@nestjs/config';
import { hash } from 'bcryptjs';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
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
import { LegalConsentsService } from '../legal-consents/legal-consents.service';
import { MailService } from '../mail/mail.service';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';

function createService(): AuthService {
    return new AuthService(
        {} as PrismaService,
        new ConfigService({ NODE_ENV: 'test' }),
        {} as LegalConsentsService,
        {} as MailService,
    );
}

function createInput(overrides: {
    platform?: boolean;
    personal?: boolean;
} = {}): RegisterDto {
    return {
        role: 'student',
        birth_date: '1990-01-01',
        email: 'student@example.com',
        password: 'password',
        legal_acceptances: {
            platform_documents: {
                accepted: overrides.platform ?? true,
            },
            personal_data: {
                accepted: overrides.personal ?? true,
            },
            marketing: {
                accepted: false,
            },
        },
    };
}

describe('AuthService registration consent rules', () => {
    it('rejects registration without platform documents', async () => {
        await expect(createService().register(
            createInput({ platform: false }),
            { ipAddress: null, userAgent: null },
        )).rejects.toThrow('Необходимо принять документы платформы');
    });

    it('rejects registration without personal data consent', async () => {
        await expect(createService().register(
            createInput({ personal: false }),
            { ipAddress: null, userAgent: null },
        )).rejects.toThrow(
            'Необходимо дать согласие на обработку персональных данных',
        );
    });
});

describe('AuthService parent registration', () => {
    it('requires the parent name and phone', async () => {
        const input = plainToInstance(RegisterDto, {
            ...createInput(),
            role: 'parent',
        });

        const errors = await validate(input);

        expect(errors.map((error) => error.property)).toEqual(
            expect.arrayContaining(['full_name', 'phone']),
        );
    });

    it('requires a birth date for a student', async () => {
        const { birth_date: _birthDate, ...withoutBirthDate } = createInput();
        const input = plainToInstance(RegisterDto, withoutBirthDate);

        const errors = await validate(input);

        expect(errors.map((error) => error.property)).toContain('birth_date');
    });

    it('does not require parent fields for an adult student', async () => {
        const input = plainToInstance(RegisterDto, createInput());

        await expect(validate(input)).resolves.toHaveLength(0);
    });

    it('rejects direct registration of a minor student', async () => {
        const minorBirthDate = new Date();
        minorBirthDate.setUTCFullYear(minorBirthDate.getUTCFullYear() - 10);

        await expect(createService().register({
            ...createInput(),
            birth_date: minorBirthDate.toISOString().slice(0, 10),
        }, { ipAddress: null, userAgent: null })).rejects.toThrow(
            'Ученика младше 18 лет регистрирует родитель через свой аккаунт',
        );
    });

    it('stores the birth year for a self-registering adult student', async () => {
        const createdUser = {
            id: 42,
            role: UserRole.STUDENT,
            email: 'student@example.com',
            fullName: null,
            phone: null,
            avatarUrl: null,
            status: UserStatus.ACTIVE,
            emailVerifiedAt: null,
            profileCompleted: false,
        };
        const prisma = {
            user: {
                findUnique: vi.fn().mockResolvedValue(null),
                create: vi.fn().mockResolvedValue(createdUser),
                update: vi.fn(),
            },
        } as unknown as PrismaService;
        const legalConsents = {
            getRegistrationSnapshots: vi.fn().mockReturnValue([]),
        } as unknown as LegalConsentsService;
        const mail = {
            sendVerificationEmail: vi.fn().mockResolvedValue(true),
        } as unknown as MailService;
        const service = new AuthService(
            prisma,
            new ConfigService({ NODE_ENV: 'test' }),
            legalConsents,
            mail,
        );

        await service.register(
            createInput(),
            { ipAddress: null, userAgent: null },
        );

        expect(prisma.user.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    role: UserRole.STUDENT,
                    studentProfile: { create: { birthYear: 1990 } },
                }),
            }),
        );
    });

    it('creates a completed parent account without a student profile', async () => {
        const createdUser = {
            id: 41,
            role: UserRole.PARENT,
            email: 'parent@example.com',
            fullName: 'Иванова Мария Сергеевна',
            phone: '+7 900 000-00-00',
            avatarUrl: null,
            status: UserStatus.ACTIVE,
            emailVerifiedAt: null,
            profileCompleted: true,
        };
        const prisma = {
            user: {
                findUnique: vi.fn().mockResolvedValue(null),
                create: vi.fn().mockResolvedValue(createdUser),
                update: vi.fn(),
            },
        } as unknown as PrismaService;
        const legalConsents = {
            getRegistrationSnapshots: vi.fn().mockReturnValue([]),
        } as unknown as LegalConsentsService;
        const mail = {
            sendVerificationEmail: vi.fn().mockResolvedValue(true),
        } as unknown as MailService;
        const service = new AuthService(
            prisma,
            new ConfigService({ NODE_ENV: 'test' }),
            legalConsents,
            mail,
        );

        const result = await service.register({
            ...createInput(),
            role: 'parent',
            email: 'PARENT@example.com',
            full_name: ' Иванова Мария Сергеевна ',
            phone: ' +7 900 000-00-00 ',
        }, { ipAddress: '127.0.0.1', userAgent: 'test' });

        expect(prisma.user.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    role: UserRole.PARENT,
                    email: 'parent@example.com',
                    fullName: 'Иванова Мария Сергеевна',
                    phone: '+7 900 000-00-00',
                    profileCompleted: true,
                }),
            }),
        );
        const createData = vi.mocked(prisma.user.create).mock.calls[0][0].data;
        expect(createData).not.toHaveProperty('studentProfile');
        expect(createData).not.toHaveProperty('teacherProfile');
        expect(mail.sendVerificationEmail).toHaveBeenCalledWith(
            'parent@example.com',
            'пользователь GoStudy',
            expect.stringContaining('/verify-email?token='),
        );
        expect(result.user).toMatchObject({
            role: 'parent',
            full_name: 'Иванова Мария Сергеевна',
            profile_completed: true,
        });
    });
});

describe('AuthService email verification', () => {
    it('keeps the token hash so reopening a verified link is idempotent', async () => {
        const user = {
            id: 51,
            email: 'student@example.com',
            emailVerifiedAt: null,
            emailVerificationExpiresAt: new Date(Date.now() + 60_000),
        };
        const prisma = {
            user: {
                findUnique: vi.fn().mockResolvedValue(user),
                update: vi.fn().mockResolvedValue(undefined),
            },
        } as unknown as PrismaService;
        const service = new AuthService(
            prisma,
            new ConfigService({ NODE_ENV: 'test' }),
            {} as LegalConsentsService,
            {} as MailService,
        );

        await expect(service.verifyEmail('verification-token')).resolves
            .toMatchObject({ email_verified: true });
        expect(prisma.user.update).toHaveBeenCalledWith({
            where: { id: user.id },
            data: {
                emailVerifiedAt: expect.any(Date),
                emailVerificationExpiresAt: null,
                emailVerificationSentAt: null,
            },
        });
    });

    it('accepts a repeated request for an already verified matching token', async () => {
        const prisma = {
            user: {
                findUnique: vi.fn().mockResolvedValue({
                    id: 51,
                    emailVerifiedAt: new Date(),
                }),
                update: vi.fn(),
            },
        } as unknown as PrismaService;
        const service = new AuthService(
            prisma,
            new ConfigService({ NODE_ENV: 'test' }),
            {} as LegalConsentsService,
            {} as MailService,
        );

        await expect(service.verifyEmail('verification-token')).resolves
            .toMatchObject({
                email_verified: true,
                message: 'Электронная почта уже подтверждена',
            });
        expect(prisma.user.update).not.toHaveBeenCalled();
    });
});

describe('AuthService admin login', () => {
    async function createLoginService(role: UserRole) {
        const passwordHash = await hash('strong-password', 4);
        const user = {
            id: 15,
            role,
            email: 'admin@example.com',
            passwordHash,
            fullName: 'Администратор',
            phone: null,
            avatarUrl: null,
            status: UserStatus.ACTIVE,
            emailVerifiedAt: new Date(),
            emailVerificationExpiresAt: null,
            profileCompleted: true,
        };
        const prisma = {
            user: {
                findUnique: vi.fn().mockResolvedValue(user),
                update: vi.fn().mockResolvedValue(user),
            },
            authSession: {
                create: vi.fn().mockResolvedValue(undefined),
            },
            $transaction: vi.fn().mockResolvedValue(undefined),
        } as unknown as PrismaService;

        return {
            prisma,
            service: new AuthService(
                prisma,
                new ConfigService({ NODE_ENV: 'test' }),
                {} as LegalConsentsService,
                {} as MailService,
            ),
        };
    }

    it('creates a session for an administrator', async () => {
        const { prisma, service } = await createLoginService(UserRole.ADMIN);

        const result = await service.adminLogin(
            {
                email: 'ADMIN@example.com',
                password: 'strong-password',
            },
            { ipAddress: '127.0.0.1', userAgent: 'test' },
        );

        expect(result.success).toBe(true);
        expect(result.user).toMatchObject({ role: 'admin' });
        expect(result.token).toEqual(expect.any(String));
        expect(prisma.$transaction).toHaveBeenCalledOnce();
    });

    it('denies the admin panel to a teacher', async () => {
        const { service } = await createLoginService(UserRole.TEACHER);

        await expect(service.adminLogin(
            {
                email: 'teacher@example.com',
                password: 'strong-password',
            },
            { ipAddress: null, userAgent: null },
        )).rejects.toThrow(
            'Доступ разрешён только администратору или модератору',
        );
    });
});
