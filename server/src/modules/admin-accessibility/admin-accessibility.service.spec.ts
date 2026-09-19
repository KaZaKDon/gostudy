import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
    AccessibilityOfferStatus,
    AccessibilityOfferType,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import { AccessibilityProgramService } from '../accessibility-program/accessibility-program.service';
import type { SessionUser } from '../auth/session-user';
import { NotificationsService } from '../notifications/notifications.service';
import { AdminAccessibilityService } from './admin-accessibility.service';

const moderator: SessionUser = {
    id: 2,
    role: UserRole.MODERATOR,
    email: 'moderator@example.com',
    fullName: 'Модератор',
    phone: null,
    avatarUrl: null,
    status: UserStatus.ACTIVE,
    emailVerifiedAt: new Date(),
    profileCompleted: true,
};

describe('AdminAccessibilityService', () => {
    it('publishes pending terms and archives the previous revision', async () => {
        const transaction = {
            accessibilityOffer: {
                updateMany: vi.fn().mockResolvedValue({ count: 1 }),
                update: vi.fn().mockResolvedValue({}),
            },
            adminAuditLog: { create: vi.fn().mockResolvedValue({}) },
        };
        const prisma = {
            accessibilityOffer: {
                findUnique: vi.fn().mockResolvedValue({
                    id: 21,
                    teacherId: 7,
                    offerType: AccessibilityOfferType.FREE,
                    status: AccessibilityOfferStatus.PENDING,
                }),
            },
            $transaction: vi.fn(async (callback) => callback(transaction)),
        } as unknown as PrismaService;
        const notifications = {
            create: vi.fn().mockResolvedValue({}),
        } as unknown as NotificationsService;
        const program = {
            syncLegacyProfile: vi.fn().mockResolvedValue(undefined),
        } as unknown as AccessibilityProgramService;
        const service = new AdminAccessibilityService(
            prisma,
            notifications,
            program,
        );

        await expect(service.moderate(
            moderator,
            21,
            { decision: 'approved', comment: '' },
            { ipAddress: '127.0.0.1', userAgent: 'vitest' },
        )).resolves.toMatchObject({ success: true });

        expect(transaction.accessibilityOffer.updateMany).toHaveBeenCalled();
        expect(transaction.accessibilityOffer.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    status: AccessibilityOfferStatus.APPROVED,
                    publishedAt: expect.any(Date),
                }),
            }),
        );
        expect(program.syncLegacyProfile).toHaveBeenCalledWith(transaction, 7);
        expect(notifications.create).toHaveBeenCalled();
    });

    it('requires a reason when rejecting terms', async () => {
        const service = new AdminAccessibilityService(
            {} as PrismaService,
            {} as NotificationsService,
            {} as AccessibilityProgramService,
        );

        await expect(service.moderate(
            moderator,
            21,
            { decision: 'rejected', comment: '  ' },
            { ipAddress: null, userAgent: null },
        )).rejects.toBeInstanceOf(BadRequestException);
    });

    it('does not moderate the same proposal twice', async () => {
        const prisma = {
            accessibilityOffer: {
                findUnique: vi.fn().mockResolvedValue({
                    id: 21,
                    status: AccessibilityOfferStatus.APPROVED,
                }),
            },
        } as unknown as PrismaService;
        const service = new AdminAccessibilityService(
            prisma,
            {} as NotificationsService,
            {} as AccessibilityProgramService,
        );

        await expect(service.moderate(
            moderator,
            21,
            { decision: 'approved', comment: '' },
            { ipAddress: null, userAgent: null },
        )).rejects.toBeInstanceOf(ConflictException);
    });
});
