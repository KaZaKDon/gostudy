import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
    TeacherDocumentStatus,
    TeacherDocumentType,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { NotificationsService } from '../notifications/notifications.service';
import { TeacherDocumentFileStorageService } from '../teacher-documents/teacher-document-file-storage.service';
import { AdminDocumentsService } from './admin-documents.service';

const moderator: SessionUser = {
    id: 3,
    role: UserRole.MODERATOR,
    email: 'moderator@example.com',
    fullName: 'Модератор',
    phone: null,
    avatarUrl: null,
    status: UserStatus.ACTIVE,
    emailVerifiedAt: new Date(),
    profileCompleted: true,
};

describe('AdminDocumentsService', () => {
    it('approves a pending document, writes audit and notifies teacher', async () => {
        const pending = {
            id: 8,
            teacherId: 17,
            type: TeacherDocumentType.DIPLOMA,
            documentTitle: 'Диплом',
            status: TeacherDocumentStatus.PENDING,
            rejectionReason: null,
            teacher: { fullName: 'Наталья Кузнецова' },
        };
        const transaction = {
            teacherDocument: {
                findUnique: vi.fn().mockResolvedValue(pending),
                update: vi.fn().mockResolvedValue({
                    ...pending,
                    status: TeacherDocumentStatus.APPROVED,
                }),
            },
            adminAuditLog: { create: vi.fn().mockResolvedValue({}) },
        };
        const prisma = {
            $transaction: vi.fn().mockImplementation((callback) => (
                callback(transaction)
            )),
        } as unknown as PrismaService;
        const notifications = {
            create: vi.fn().mockResolvedValue(undefined),
        } as unknown as NotificationsService;
        const service = new AdminDocumentsService(
            prisma,
            {} as TeacherDocumentFileStorageService,
            notifications,
        );

        await expect(service.moderate(
            moderator,
            pending.id,
            { decision: 'approved' },
            { ipAddress: '127.0.0.1', userAgent: 'vitest' },
        )).resolves.toMatchObject({
            success: true,
            message: 'Документ подтверждён',
        });
        expect(transaction.teacherDocument.update).toHaveBeenCalledWith({
            where: { id: pending.id },
            data: expect.objectContaining({
                status: TeacherDocumentStatus.APPROVED,
                checkedById: moderator.id,
            }),
        });
        expect(transaction.adminAuditLog.create).toHaveBeenCalledOnce();
        expect(notifications.create).toHaveBeenCalledWith(
            transaction,
            expect.objectContaining({
                userId: pending.teacherId,
                type: 'teacher_document_approved',
            }),
        );
    });

    it('requires a reason when rejecting a document', async () => {
        const service = new AdminDocumentsService(
            {} as PrismaService,
            {} as TeacherDocumentFileStorageService,
            {} as NotificationsService,
        );

        await expect(service.moderate(
            moderator,
            8,
            { decision: 'rejected', comment: '   ' },
            { ipAddress: null, userAgent: null },
        )).rejects.toThrow('Укажите причину отклонения');
    });
});
