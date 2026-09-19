import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import type { RequestMetadata } from '../../common/http/request-metadata';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import {
    TeacherDocumentStatus,
    TeacherDocumentType,
    UserRole,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { NotificationsService } from '../notifications/notifications.service';
import { TeacherDocumentFileStorageService } from '../teacher-documents/teacher-document-file-storage.service';
import type { ListAdminDocumentsQueryDto } from './dto/list-admin-documents-query.dto';
import type { ModerateTeacherDocumentDto } from './dto/moderate-teacher-document.dto';

const STATUS_BY_VALUE = {
    pending: TeacherDocumentStatus.PENDING,
    approved: TeacherDocumentStatus.APPROVED,
    rejected: TeacherDocumentStatus.REJECTED,
} as const;

const TYPE_BY_VALUE = {
    diploma: TeacherDocumentType.DIPLOMA,
    certificate: TeacherDocumentType.CERTIFICATE,
    qualification: TeacherDocumentType.QUALIFICATION,
    other: TeacherDocumentType.OTHER,
} as const;

@Injectable()
export class AdminDocumentsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly files: TeacherDocumentFileStorageService,
        private readonly notifications: NotificationsService,
    ) {}

    async list(actor: SessionUser, query: ListAdminDocumentsQueryDto) {
        this.requireModerator(actor);
        const page = query.page || 1;
        const limit = query.limit || 20;
        const search = query.q?.trim() || '';
        const numericId = /^\d+$/.test(search) ? Number(search) : null;
        const conditions: Prisma.TeacherDocumentWhereInput[] = [];

        if (query.status) {
            conditions.push({ status: STATUS_BY_VALUE[query.status] });
        }
        if (query.type) {
            conditions.push({ type: TYPE_BY_VALUE[query.type] });
        }
        if (search) {
            conditions.push({
                OR: [
                    ...(numericId ? [{ id: numericId }] : []),
                    { documentTitle: { contains: search, mode: 'insensitive' } },
                    { institution: { contains: search, mode: 'insensitive' } },
                    { originalName: { contains: search, mode: 'insensitive' } },
                    { teacher: { fullName: { contains: search, mode: 'insensitive' } } },
                    { teacher: { email: { contains: search, mode: 'insensitive' } } },
                ],
            });
        }

        const where: Prisma.TeacherDocumentWhereInput = conditions.length
            ? { AND: conditions }
            : {};
        const [total, documents] = await Promise.all([
            this.prisma.teacherDocument.count({ where }),
            this.prisma.teacherDocument.findMany({
                where,
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    teacher: {
                        select: { id: true, fullName: true, email: true },
                    },
                    checkedBy: {
                        select: { id: true, fullName: true, email: true },
                    },
                },
            }),
        ]);

        return {
            success: true,
            data: {
                items: documents.map((document) => this.serialize(document)),
                pagination: {
                    page,
                    limit,
                    total,
                    pages: total ? Math.ceil(total / limit) : 0,
                },
            },
        };
    }

    async moderate(
        actor: SessionUser,
        documentId: number,
        input: ModerateTeacherDocumentDto,
        metadata: RequestMetadata,
    ) {
        this.requireModerator(actor);
        const comment = input.comment?.trim() || '';

        if (input.decision === 'rejected' && !comment) {
            throw new BadRequestException('Укажите причину отклонения');
        }

        const status = input.decision === 'approved'
            ? TeacherDocumentStatus.APPROVED
            : TeacherDocumentStatus.REJECTED;

        await this.prisma.$transaction(async (transaction) => {
            const document = await transaction.teacherDocument.findUnique({
                where: { id: documentId },
                include: {
                    teacher: { select: { fullName: true } },
                },
            });

            if (!document) {
                throw new NotFoundException('Документ не найден');
            }
            if (document.status !== TeacherDocumentStatus.PENDING) {
                throw new ConflictException('Документ уже прошёл проверку');
            }

            const updated = await transaction.teacherDocument.update({
                where: { id: document.id },
                data: {
                    status,
                    rejectionReason: input.decision === 'rejected'
                        ? comment
                        : null,
                    checkedById: actor.id,
                    checkedAt: new Date(),
                },
            });

            await transaction.adminAuditLog.create({
                data: {
                    adminId: actor.id,
                    action: input.decision === 'approved'
                        ? 'teacher_document_approved'
                        : 'teacher_document_rejected',
                    entityType: 'teacher_document',
                    entityId: document.id,
                    oldValue: {
                        status: document.status.toLowerCase(),
                        rejection_reason: document.rejectionReason,
                    },
                    newValue: {
                        status: updated.status.toLowerCase(),
                        rejection_reason: updated.rejectionReason,
                    },
                    ipAddress: metadata.ipAddress,
                    userAgent: metadata.userAgent,
                },
            });

            await this.notifications.create(transaction, {
                userId: document.teacherId,
                type: input.decision === 'approved'
                    ? 'teacher_document_approved'
                    : 'teacher_document_rejected',
                title: input.decision === 'approved'
                    ? 'Документ подтверждён'
                    : 'Документ нужно заменить',
                message: input.decision === 'approved'
                    ? `«${document.documentTitle}» прошёл проверку.`
                    : comment,
                targetSection: 'settings',
                targetEntityType: 'teacher_document',
                targetEntityId: document.id,
                dedupeKey: `teacher-document:${document.id}:${status.toLowerCase()}`,
            });
        });

        return {
            success: true,
            message: input.decision === 'approved'
                ? 'Документ подтверждён'
                : 'Документ отклонён',
        };
    }

    async download(actor: SessionUser, documentId: number) {
        this.requireModerator(actor);
        const document = await this.prisma.teacherDocument.findUnique({
            where: { id: documentId },
        });

        if (!document) {
            throw new NotFoundException('Документ не найден');
        }

        const stored = await this.files.readStoredFile(document.storedPath);

        return {
            ...stored,
            originalName: document.originalName,
            mimeType: document.mimeType,
        };
    }

    private serialize(document: Record<string, any>) {
        return {
            id: document.id,
            teacher_id: document.teacherId,
            teacher_name: document.teacher?.fullName,
            teacher_email: document.teacher?.email,
            education_id: document.educationId,
            type: String(document.type).toLowerCase(),
            document_title: document.documentTitle,
            institution: document.institution,
            document_year: document.documentYear,
            original_name: document.originalName,
            mime_type: document.mimeType,
            file_size: Number(document.fileSize),
            status: String(document.status).toLowerCase(),
            reject_reason: document.rejectionReason,
            checked_by: document.checkedById,
            checked_by_name: document.checkedBy?.fullName
                || document.checkedBy?.email
                || null,
            checked_at: document.checkedAt,
            created_at: document.createdAt,
            updated_at: document.updatedAt,
            download_url: `/api/v1/admin/documents/${document.id}/file`,
        };
    }

    private requireModerator(actor: SessionUser): void {
        if (
            actor.role !== UserRole.ADMIN
            && actor.role !== UserRole.MODERATOR
        ) {
            throw new ForbiddenException(
                'Доступ разрешён только администратору или модератору',
            );
        }
    }
}
