import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
    AccessibilityApplicationStatus,
    AccessibilityOfferType,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { NotificationsService } from '../notifications/notifications.service';
import { AccessibilityApplicationsService } from './accessibility-applications.service';

const student: SessionUser = {
    id: 9,
    role: UserRole.STUDENT,
    email: 'student@example.com',
    fullName: 'Иван Ученик',
    phone: null,
    avatarUrl: null,
    status: UserStatus.ACTIVE,
    emailVerifiedAt: new Date(),
    profileCompleted: true,
};

function application() {
    const now = new Date();
    return {
        id: 31,
        offerId: 4,
        teacherId: 7,
        studentId: 9,
        submittedById: 9,
        subjectId: 2,
        message: 'Нужна помощь',
        termsSnapshot: { offer_type: 'free' },
        status: AccessibilityApplicationStatus.PENDING,
        teacherComment: null,
        respondedAt: null,
        confirmationExpiresAt: null,
        confirmedAt: null,
        closedAt: null,
        createdAt: now,
        updatedAt: now,
        offer: { offerType: AccessibilityOfferType.FREE },
        teacher: { fullName: 'Анна Учитель' },
        student: { fullName: 'Иван Ученик' },
        submittedBy: { fullName: 'Иван Ученик', role: UserRole.STUDENT },
        subject: { name: 'Математика' },
    };
}

describe('AccessibilityApplicationsService', () => {
    it('creates an application with a snapshot of approved terms', async () => {
        const created = application();
        const transaction = {
            teacherStudent: {
                findUnique: vi.fn().mockResolvedValue(null),
            },
            accessibilityApplication: {
                updateMany: vi.fn().mockResolvedValue({ count: 0 }),
                findFirst: vi.fn().mockResolvedValue(null),
                count: vi.fn().mockResolvedValue(0),
                create: vi.fn().mockResolvedValue(created),
            },
            accessibilityOffer: {
                findFirst: vi.fn().mockResolvedValue({
                    id: 4,
                    teacherId: 7,
                    offerType: AccessibilityOfferType.FREE,
                    slots: 1,
                    discountPercent: null,
                    defaultDurationMonths: 3,
                    comment: 'Бесплатное место',
                    teacher: { fullName: 'Анна Учитель' },
                    subjects: [{ subject: { name: 'Математика' } }],
                }),
            },
        };
        const prisma = {
            studentProfile: {
                findUnique: vi.fn().mockResolvedValue({ birthYear: 2000 }),
            },
            $transaction: vi.fn(async (callback) => callback(transaction)),
        } as unknown as PrismaService;
        const notifications = {
            create: vi.fn().mockResolvedValue({}),
        } as unknown as NotificationsService;
        const service = new AccessibilityApplicationsService(prisma, notifications);

        await expect(service.create(student, {
            offer_id: 4,
            subject_id: 2,
            message: 'Нужна помощь',
        })).resolves.toMatchObject({
            success: true,
            application: { id: 31, status: 'pending' },
        });

        expect(transaction.accessibilityApplication.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    offerId: 4,
                    studentId: 9,
                    submittedById: 9,
                    termsSnapshot: expect.objectContaining({
                        offer_type: 'free',
                        subject_name: 'Математика',
                    }),
                }),
            }),
        );
        expect(notifications.create).toHaveBeenCalled();
    });

    it('does not allow a minor student to apply directly', async () => {
        const prisma = {
            studentProfile: {
                findUnique: vi.fn().mockResolvedValue({
                    birthYear: new Date().getFullYear() - 12,
                }),
            },
        } as unknown as PrismaService;
        const service = new AccessibilityApplicationsService(
            prisma,
            {} as NotificationsService,
        );

        await expect(service.create(student, {
            offer_id: 4,
            subject_id: 2,
        })).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows only a verified linked child for a parent application', async () => {
        const prisma = {
            parentChildProfile: { findFirst: vi.fn().mockResolvedValue(null) },
        } as unknown as PrismaService;
        const service = new AccessibilityApplicationsService(
            prisma,
            {} as NotificationsService,
        );

        await expect(service.create({ ...student, id: 12, role: UserRole.PARENT }, {
            offer_id: 4,
            subject_id: 2,
            student_id: 9,
        })).rejects.toBeInstanceOf(ForbiddenException);
    });
});
