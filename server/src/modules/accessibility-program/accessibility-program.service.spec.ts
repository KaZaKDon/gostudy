import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
    AccessibilityOfferStatus,
    AccessibilityOfferType,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { AccessibilityProgramService } from './accessibility-program.service';

const teacher: SessionUser = {
    id: 7,
    role: UserRole.TEACHER,
    email: 'teacher@example.com',
    fullName: 'Анна Учитель',
    phone: null,
    avatarUrl: null,
    status: UserStatus.ACTIVE,
    emailVerifiedAt: new Date(),
    profileCompleted: true,
};

function pendingOffer() {
    const now = new Date();
    return {
        id: 21,
        teacherId: 7,
        offerType: AccessibilityOfferType.DISCOUNT,
        slots: 2,
        discountPercent: 25,
        defaultDurationMonths: 3,
        comment: 'Готов помочь',
        status: AccessibilityOfferStatus.PENDING,
        supersedesId: 10,
        moderationComment: null,
        moderatedById: null,
        moderatedAt: null,
        publishedAt: null,
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
        subjects: [{ subject: { id: 4, name: 'Математика' } }],
    };
}

describe('AccessibilityProgramService', () => {
    it('keeps the approved revision while creating new pending terms', async () => {
        const created = pendingOffer();
        const transaction = {
            accessibilityOffer: {
                findFirst: vi.fn()
                    .mockResolvedValueOnce(null)
                    .mockResolvedValueOnce({
                        id: 10,
                        status: AccessibilityOfferStatus.APPROVED,
                    }),
                updateMany: vi.fn().mockResolvedValue({ count: 0 }),
                create: vi.fn().mockResolvedValue(created),
            },
        };
        const prisma = {
            teacherSubject: { count: vi.fn().mockResolvedValue(1) },
            $transaction: vi.fn(async (callback) => callback(transaction)),
        } as unknown as PrismaService;
        const service = new AccessibilityProgramService(prisma);

        const result = await service.save(teacher, {
            offer_type: 'discount',
            slots: 2,
            discount_percent: 25,
            default_duration_months: 3,
            subject_ids: [4],
            comment: 'Готов помочь',
        });

        expect(transaction.accessibilityOffer.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    supersedesId: 10,
                    status: AccessibilityOfferStatus.PENDING,
                }),
            }),
        );
        expect(result.offer).toMatchObject({
            offer_type: 'discount',
            status: 'pending',
            discount_percent: 25,
        });
    });

    it('requires a discount with a five-percent step', async () => {
        const service = new AccessibilityProgramService({} as PrismaService);

        await expect(service.save(teacher, {
            offer_type: 'discount',
            slots: 1,
            discount_percent: 23,
            default_duration_months: 3,
            subject_ids: [4],
        })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('is unavailable to a student account', async () => {
        const service = new AccessibilityProgramService({} as PrismaService);

        await expect(service.show({ ...teacher, role: UserRole.STUDENT }))
            .rejects.toBeInstanceOf(ForbiddenException);
    });
});
