import { BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
    LegalRepresentativeType,
    ParentChildVerificationStatus,
    ParentStudentLinkRequestStatus,
    ParentStudentStatus,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ParentStudentLinksService } from './parent-student-links.service';

const parent: SessionUser = {
    id: 10,
    role: UserRole.PARENT,
    email: 'parent@example.com',
    fullName: 'Иванова Мария',
    phone: '+79000000000',
    avatarUrl: null,
    status: UserStatus.ACTIVE,
    emailVerifiedAt: new Date(),
    profileCompleted: true,
};
const student: SessionUser = {
    ...parent,
    id: 20,
    role: UserRole.STUDENT,
    email: 'student@example.com',
    fullName: 'Иван Иванов',
};
const child = {
    id: 7,
    parentId: parent.id,
    studentId: null,
    firstName: 'Иван',
    lastName: 'Иванов',
    middleName: 'Иванович',
    birthDate: new Date('2014-05-12T00:00:00.000Z'),
    representativeType: LegalRepresentativeType.PARENT,
    verificationStatus: ParentChildVerificationStatus.VERIFIED,
    verificationComment: null,
    verifiedAt: new Date(),
    archivedAt: null,
};
const request = {
    id: 30,
    childProfileId: child.id,
    studentId: student.id,
    status: ParentStudentLinkRequestStatus.PENDING,
    expiresAt: new Date(Date.now() + 86_400_000),
    respondedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    childProfile: child,
    student: { email: student.email },
};

function createService(options: {
    matchedStudent?: boolean;
    currentRequest?: typeof request | null;
    existingAccount?: boolean;
} = {}) {
    const matchedUser = options.matchedStudent === false
        ? null
        : {
            ...student,
            archivedAt: null,
            studentProfile: {
                firstName: child.firstName,
                lastName: child.lastName,
                birthYear: child.birthDate.getUTCFullYear(),
            },
            linkedChildProfile: null,
        };
    const transaction = {
        user: {
            create: vi.fn().mockResolvedValue({
                id: student.id,
                email: student.email,
                fullName: student.fullName,
            }),
        },
        parentStudentLinkRequest: {
            findUnique: vi.fn().mockResolvedValue(request),
            update: vi.fn().mockResolvedValue(undefined),
            updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
        parentChildProfile: {
            findFirst: vi.fn().mockResolvedValue(null),
            update: vi.fn().mockResolvedValue(undefined),
        },
        parentStudent: {
            create: vi.fn().mockResolvedValue(undefined),
            upsert: vi.fn().mockResolvedValue(undefined),
        },
        notification: { upsert: vi.fn().mockResolvedValue(undefined) },
    };
    const prisma = {
        parentChildProfile: { findFirst: vi.fn().mockResolvedValue(child) },
        parentStudentLinkRequest: {
            updateMany: vi.fn().mockResolvedValue({ count: 0 }),
            findFirst: vi.fn().mockResolvedValue(options.currentRequest ?? null),
            findMany: vi.fn().mockResolvedValue([]),
            create: vi.fn().mockResolvedValue(request),
        },
        user: {
            findUnique: vi.fn().mockImplementation((args) => (
                args.select
                    ? options.existingAccount ? { id: student.id } : null
                    : matchedUser
            )),
            update: vi.fn().mockResolvedValue(undefined),
        },
        notification: { upsert: vi.fn().mockResolvedValue(undefined) },
        $transaction: vi.fn(async (callback) => callback(transaction)),
    } as unknown as PrismaService;

    const mail = {
        sendVerificationEmail: vi.fn().mockResolvedValue(true),
    } as unknown as MailService;

    return {
        prisma,
        transaction,
        mail,
        service: new ParentStudentLinksService(
            prisma,
            new ConfigService({
                NODE_ENV: 'test',
                APP_URL: 'http://localhost:5174',
                EMAIL_VERIFICATION_HOURS: 24,
            }),
            mail,
            new NotificationsService(prisma),
        ),
    };
}

describe('ParentStudentLinksService', () => {
    it('creates and immediately links a new student account from a verified card', async () => {
        const { service, transaction, mail } = createService();
        const result = await service.createStudentAccount(parent, child.id, {
            email: student.email,
            password: 'student-password',
            password_confirmation: 'student-password',
        });

        expect(transaction.user.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                role: UserRole.STUDENT,
                email: student.email,
                profileCompleted: false,
                studentProfile: {
                    create: expect.objectContaining({
                        firstName: child.firstName,
                        lastName: child.lastName,
                        birthYear: 2014,
                        parentEmail: parent.email,
                    }),
                },
            }),
            select: { id: true, email: true, fullName: true },
        });
        expect(transaction.parentChildProfile.update).toHaveBeenCalledWith({
            where: { id: child.id },
            data: { studentId: student.id },
        });
        expect(transaction.parentStudent.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                parentId: parent.id,
                studentId: student.id,
                status: ParentStudentStatus.ACTIVE,
            }),
        });
        expect(mail.sendVerificationEmail).toHaveBeenCalledOnce();
        expect(result).toMatchObject({
            success: true,
            email_verification_required: true,
            mail_sent: true,
        });
    });

    it('does not create an account when password confirmation differs', async () => {
        const { service } = createService();

        await expect(service.createStudentAccount(parent, child.id, {
            email: student.email,
            password: 'student-password',
            password_confirmation: 'different-password',
        })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates a request for a matching verified student account', async () => {
        const { prisma, service } = createService();
        const result = await service.requestExisting(parent, child.id, {
            email: student.email,
        });

        expect(prisma.parentStudentLinkRequest.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                childProfileId: child.id,
                studentId: student.id,
            }),
            include: { student: { select: { email: true } } },
        });
        expect(prisma.notification.upsert).toHaveBeenCalledOnce();
        expect(result).toMatchObject({
            success: true,
            message: 'Запрос отправлен в кабинет ученика',
        });
    });

    it('does not disclose why an account does not match the child card', async () => {
        const { service } = createService({ matchedStudent: false });

        await expect(service.requestExisting(parent, child.id, {
            email: 'unknown@example.com',
        })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('requires administrator verification before requesting a link', async () => {
        const { prisma, service } = createService();
        vi.mocked(prisma.parentChildProfile.findFirst).mockResolvedValue({
            ...child,
            verificationStatus: ParentChildVerificationStatus.PENDING,
        } as never);

        await expect(service.requestExisting(parent, child.id, {
            email: student.email,
        })).rejects.toBeInstanceOf(ConflictException);
    });

    it('accepts the request and creates an active verified parent link', async () => {
        const { service, transaction } = createService();
        const result = await service.respond(student, request.id, { accept: true });

        expect(transaction.parentChildProfile.update).toHaveBeenCalledWith({
            where: { id: child.id },
            data: { studentId: student.id },
        });
        expect(transaction.parentStudent.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                create: expect.objectContaining({
                    status: ParentStudentStatus.ACTIVE,
                    verifiedAt: expect.any(Date),
                }),
            }),
        );
        expect(transaction.parentStudentLinkRequest.update).toHaveBeenCalledWith({
            where: { id: request.id },
            data: expect.objectContaining({
                status: ParentStudentLinkRequestStatus.ACCEPTED,
            }),
        });
        expect(result).toMatchObject({ success: true, linked: true });
    });

    it('allows the student to reject a request without creating a link', async () => {
        const { service, transaction } = createService();
        const result = await service.respond(student, request.id, { accept: false });

        expect(transaction.parentStudent.upsert).not.toHaveBeenCalled();
        expect(transaction.parentStudentLinkRequest.update).toHaveBeenCalledWith({
            where: { id: request.id },
            data: expect.objectContaining({
                status: ParentStudentLinkRequestStatus.REJECTED,
            }),
        });
        expect(result).toMatchObject({ success: true, linked: false });
    });
});
