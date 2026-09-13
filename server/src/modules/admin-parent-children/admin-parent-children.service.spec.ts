import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import type { RequestMetadata } from '../../common/http/request-metadata';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
    LegalRepresentativeType,
    ParentChildVerificationStatus,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { NotificationsService } from '../notifications/notifications.service';
import { AdminParentChildrenService } from './admin-parent-children.service';

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
const moderator = { ...admin, id: 2, role: UserRole.MODERATOR };
const metadata: RequestMetadata = {
    ipAddress: '127.0.0.1',
    userAgent: 'vitest',
};
const child = {
    id: 5,
    parentId: 9,
    studentId: null,
    firstName: 'Дмитрий',
    lastName: 'Внуков',
    middleName: 'Николаевич',
    birthDate: new Date('2010-01-01T00:00:00.000Z'),
    city: 'х. Белогорский',
    timezone: 'Europe/Moscow',
    classLevel: '9 класс',
    representativeType: LegalRepresentativeType.PARENT,
    verificationStatus: ParentChildVerificationStatus.PENDING,
    verificationComment: null,
    verifiedAt: null,
    archivedAt: null,
    createdAt: new Date('2026-09-08T12:00:00.000Z'),
};

function createService(current: Record<string, any> = child) {
    const transaction = {
        parentChildProfile: {
            findUnique: vi.fn().mockResolvedValue(current),
            update: vi.fn().mockImplementation(({ data }) => ({
                ...current,
                ...data,
            })),
        },
        adminAuditLog: { create: vi.fn().mockResolvedValue(undefined) },
        notification: { create: vi.fn().mockResolvedValue(undefined) },
    };
    const prisma = {
        parentChildProfile: {
            count: vi.fn().mockResolvedValue(1),
            findMany: vi.fn().mockResolvedValue([{ ...current }]),
        },
        $transaction: vi.fn(async (callback) => callback(transaction)),
    } as unknown as PrismaService;

    return {
        service: new AdminParentChildrenService(
            prisma,
            new NotificationsService(prisma),
        ),
        transaction,
    };
}

describe('AdminParentChildrenService', () => {
    it('returns pending child cards for the administrator', async () => {
        const { service } = createService();
        const result = await service.list(admin, {
            page: 1,
            limit: 20,
            status: 'pending',
        });

        expect(result.data).toMatchObject({
            items: [{ id: 5, verification_status: 'pending' }],
            pagination: { total: 1, pages: 1 },
        });
    });

    it('allows only an administrator to review legal representation', async () => {
        const { service } = createService();

        await expect(service.list(moderator, { page: 1, limit: 20 }))
            .rejects.toBeInstanceOf(ForbiddenException);
    });

    it('requires a comment for clarification or rejection', async () => {
        const { service } = createService();

        await expect(service.review(
            admin,
            child.id,
            { decision: 'needs_clarification' },
            metadata,
        )).rejects.toBeInstanceOf(BadRequestException);
    });

    it('verifies a pending child card, audits and notifies the parent', async () => {
        const { service, transaction } = createService();
        const result = await service.review(
            admin,
            child.id,
            { decision: 'approved' },
            metadata,
        );

        expect(transaction.parentChildProfile.update).toHaveBeenCalledWith({
            where: { id: child.id },
            data: expect.objectContaining({
                verificationStatus: ParentChildVerificationStatus.VERIFIED,
                verifiedAt: expect.any(Date),
            }),
        });
        expect(transaction.adminAuditLog.create).toHaveBeenCalledOnce();
        expect(transaction.notification.create).toHaveBeenCalledOnce();
        expect(result).toMatchObject({
            success: true,
            message: 'Карточка подтверждена',
        });
    });

    it('does not review an already completed card twice', async () => {
        const { service } = createService({
            ...child,
            verificationStatus: ParentChildVerificationStatus.VERIFIED,
            verifiedAt: new Date(),
        });

        await expect(service.review(
            admin,
            child.id,
            { decision: 'approved' },
            metadata,
        )).rejects.toBeInstanceOf(ConflictException);
    });
});
