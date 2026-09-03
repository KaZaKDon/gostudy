import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import type { RequestMetadata } from '../../common/http/request-metadata';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
    MaterialPublicationStatus,
    MaterialReportStatus,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { MaterialsService } from '../materials/materials.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AdminMaterialsService } from './admin-materials.service';

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
const metadata: RequestMetadata = { ipAddress: '127.0.0.1', userAgent: 'vitest' };

describe('AdminMaterialsService', () => {
    it('requires a reason when a material is rejected', async () => {
        const service = new AdminMaterialsService(
            {} as PrismaService,
            {} as NotificationsService,
            {} as MaterialsService,
        );
        await expect(service.moderate(admin, 5, { decision: 'rejected' }, metadata))
            .rejects.toBeInstanceOf(BadRequestException);
    });

    it('approves a pending material, logs the decision and notifies its creator', async () => {
        const current = {
            id: 5,
            creatorId: 7,
            title: 'Алгебра',
            publicationStatus: MaterialPublicationStatus.PENDING,
        };
        const transaction = {
            learningMaterial: { update: vi.fn().mockResolvedValue(undefined) },
            adminAuditLog: { create: vi.fn().mockResolvedValue(undefined) },
            notification: { upsert: vi.fn().mockResolvedValue(undefined) },
        };
        const prisma = {
            learningMaterial: { findUnique: vi.fn().mockResolvedValue(current) },
            $transaction: vi.fn(async (callback) => callback(transaction)),
        } as unknown as PrismaService;
        const service = new AdminMaterialsService(
            prisma,
            new NotificationsService(prisma),
            {} as MaterialsService,
        );

        const result = await service.moderate(admin, 5, { decision: 'approved' }, metadata);

        expect(transaction.learningMaterial.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ publicationStatus: MaterialPublicationStatus.APPROVED }),
        }));
        expect(transaction.adminAuditLog.create).toHaveBeenCalledOnce();
        expect(transaction.notification.upsert).toHaveBeenCalledOnce();
        expect(result).toMatchObject({ success: true, message: 'Материал опубликован' });
    });

    it('does not moderate the same publication twice', async () => {
        const prisma = {
            learningMaterial: {
                findUnique: vi.fn().mockResolvedValue({
                    id: 5,
                    publicationStatus: MaterialPublicationStatus.APPROVED,
                }),
            },
        } as unknown as PrismaService;
        const service = new AdminMaterialsService(
            prisma,
            {} as NotificationsService,
            {} as MaterialsService,
        );
        await expect(service.moderate(admin, 5, { decision: 'approved' }, metadata))
            .rejects.toBeInstanceOf(ConflictException);
    });

    it('revokes assignments and grants when a confirmed complaint takes content down', async () => {
        const report = {
            id: 9,
            materialId: 5,
            status: MaterialReportStatus.PENDING,
            material: { creatorId: 7, title: 'Спорный материал' },
        };
        const transaction = {
            materialReport: { update: vi.fn().mockResolvedValue(undefined) },
            learningMaterial: { update: vi.fn().mockResolvedValue(undefined) },
            materialAssignment: { updateMany: vi.fn().mockResolvedValue(undefined) },
            materialAccessGrant: { updateMany: vi.fn().mockResolvedValue(undefined) },
            adminAuditLog: { create: vi.fn().mockResolvedValue(undefined) },
            notification: { upsert: vi.fn().mockResolvedValue(undefined) },
        };
        const prisma = {
            materialReport: { findUnique: vi.fn().mockResolvedValue(report) },
            $transaction: vi.fn(async (callback) => callback(transaction)),
        } as unknown as PrismaService;
        const service = new AdminMaterialsService(
            prisma,
            new NotificationsService(prisma),
            {} as MaterialsService,
        );

        await service.resolveReport(admin, 9, {
            decision: 'resolved',
            hide_material: true,
        }, metadata);

        expect(transaction.learningMaterial.update).toHaveBeenCalledWith({
            where: { id: 5 },
            data: { publicationStatus: MaterialPublicationStatus.HIDDEN },
        });
        expect(transaction.materialAssignment.updateMany).toHaveBeenCalledOnce();
        expect(transaction.materialAccessGrant.updateMany).toHaveBeenCalledOnce();
    });
});
