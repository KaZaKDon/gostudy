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
    MaterialPublicationStatus,
    MaterialReportStatus,
    UserRole,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { MaterialsService } from '../materials/materials.service';
import { NotificationsService } from '../notifications/notifications.service';
import type {
    ListAdminMaterialReportsQueryDto,
    ListAdminMaterialsQueryDto,
} from './dto/list-admin-materials-query.dto';
import type {
    ModerateMaterialDto,
    ResolveMaterialReportDto,
} from './dto/moderate-material.dto';

const PUBLICATION_STATUS = {
    private: MaterialPublicationStatus.PRIVATE,
    pending: MaterialPublicationStatus.PENDING,
    approved: MaterialPublicationStatus.APPROVED,
    rejected: MaterialPublicationStatus.REJECTED,
    hidden: MaterialPublicationStatus.HIDDEN,
} as const;

const REPORT_STATUS = {
    pending: MaterialReportStatus.PENDING,
    resolved: MaterialReportStatus.RESOLVED,
    dismissed: MaterialReportStatus.DISMISSED,
} as const;

const adminMaterialInclude = {
    creator: { select: { id: true, fullName: true, email: true } },
    subject: { select: { id: true, name: true } },
    items: { orderBy: [{ sortOrder: 'asc' as const }, { id: 'asc' as const }] },
    assignments: {
        where: { revokedAt: null },
        orderBy: { assignedAt: 'desc' as const },
        include: {
            student: { select: { id: true, fullName: true } },
            teacherStudent: { select: { id: true } },
        },
    },
    accessGrants: { where: { revokedAt: null } },
} satisfies Prisma.LearningMaterialInclude;

@Injectable()
export class AdminMaterialsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly notifications: NotificationsService,
        private readonly materials: MaterialsService,
    ) {}

    async list(actor: SessionUser, query: ListAdminMaterialsQueryDto) {
        this.requireModerator(actor);
        const page = query.page || 1;
        const limit = query.limit || 20;
        const search = query.q?.trim() || '';
        const numericId = /^\d+$/.test(search) ? Number(search) : null;
        const where: Prisma.LearningMaterialWhereInput = {
            ...(query.status ? {
                publicationStatus: PUBLICATION_STATUS[query.status],
            } : {}),
            ...(search ? {
                OR: [
                    ...(numericId ? [{ id: numericId }] : []),
                    { title: { contains: search, mode: 'insensitive' } },
                    { authorName: { contains: search, mode: 'insensitive' } },
                    { creator: { email: { contains: search, mode: 'insensitive' } } },
                    { subject: { name: { contains: search, mode: 'insensitive' } } },
                ],
            } : {}),
        };
        const [total, rows] = await Promise.all([
            this.prisma.learningMaterial.count({ where }),
            this.prisma.learningMaterial.findMany({
                where,
                include: adminMaterialInclude,
                orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
                skip: (page - 1) * limit,
                take: limit,
            }),
        ]);

        return {
            success: true,
            data: {
                items: rows.map((material) => ({
                    ...this.materials.serializeForAdministration(material),
                    creator_email: material.creator.email,
                })),
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
        materialId: number,
        input: ModerateMaterialDto,
        metadata: RequestMetadata,
    ) {
        this.requireModerator(actor);
        const comment = input.comment?.trim() || '';
        if (input.decision === 'rejected' && !comment) {
            throw new BadRequestException('Укажите причину отклонения');
        }

        const current = await this.prisma.learningMaterial.findUnique({
            where: { id: materialId },
        });
        if (!current) {
            throw new NotFoundException('Материал не найден');
        }
        if (current.publicationStatus !== MaterialPublicationStatus.PENDING) {
            throw new ConflictException('Материал уже обработан');
        }
        const now = new Date();
        const nextStatus = input.decision === 'approved'
            ? MaterialPublicationStatus.APPROVED
            : MaterialPublicationStatus.REJECTED;

        await this.prisma.$transaction(async (transaction) => {
            await transaction.learningMaterial.update({
                where: { id: current.id },
                data: {
                    publicationStatus: nextStatus,
                    moderationComment: comment || null,
                    moderatedById: actor.id,
                    moderatedAt: now,
                    publishedAt: input.decision === 'approved' ? now : null,
                },
            });
            await transaction.adminAuditLog.create({
                data: {
                    adminId: actor.id,
                    action: `material.${input.decision}`,
                    entityType: 'learning_material',
                    entityId: current.id,
                    oldValue: { publication_status: current.publicationStatus },
                    newValue: {
                        publication_status: nextStatus,
                        comment: comment || null,
                    },
                    ipAddress: metadata.ipAddress,
                    userAgent: metadata.userAgent,
                },
            });
            await this.notifications.create(transaction, {
                userId: current.creatorId,
                type: `material_${input.decision}`,
                title: input.decision === 'approved'
                    ? 'Материал опубликован'
                    : 'Материал отклонён',
                message: input.decision === 'approved'
                    ? `Материал «${current.title}» появился в общем каталоге`
                    : `Материал «${current.title}» отклонён: ${comment}`,
                targetSection: 'materials',
                targetEntityType: 'material',
                targetEntityId: current.id,
                dedupeKey: `material-moderation:${current.id}:${now.getTime()}`,
            });
        });

        return {
            success: true,
            message: input.decision === 'approved'
                ? 'Материал опубликован'
                : 'Материал отклонён',
        };
    }

    async listReports(
        actor: SessionUser,
        query: ListAdminMaterialReportsQueryDto,
    ) {
        this.requireModerator(actor);
        const page = query.page || 1;
        const limit = query.limit || 20;
        const where = query.status
            ? { status: REPORT_STATUS[query.status] }
            : {};
        const [total, rows] = await Promise.all([
            this.prisma.materialReport.count({ where }),
            this.prisma.materialReport.findMany({
                where,
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    reporter: { select: { fullName: true, email: true } },
                    material: {
                        select: {
                            id: true,
                            title: true,
                            creatorId: true,
                            publicationStatus: true,
                        },
                    },
                },
            }),
        ]);

        return {
            success: true,
            data: {
                items: rows.map((report) => ({
                    id: report.id,
                    material_id: report.materialId,
                    material_title: report.material.title,
                    material_status: report.material.publicationStatus.toLowerCase(),
                    reporter_name: report.reporter.fullName || 'Пользователь',
                    reporter_email: report.reporter.email,
                    reason: report.reason.toLowerCase(),
                    comment: report.comment,
                    status: report.status.toLowerCase(),
                    resolution_comment: report.resolutionComment,
                    created_at: report.createdAt,
                    handled_at: report.handledAt,
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    pages: total ? Math.ceil(total / limit) : 0,
                },
            },
        };
    }

    async resolveReport(
        actor: SessionUser,
        reportId: number,
        input: ResolveMaterialReportDto,
        metadata: RequestMetadata,
    ) {
        this.requireModerator(actor);
        const comment = input.comment?.trim() || '';
        const report = await this.prisma.materialReport.findUnique({
            where: { id: reportId },
            include: { material: true },
        });
        if (!report) {
            throw new NotFoundException('Жалоба не найдена');
        }
        if (report.status !== MaterialReportStatus.PENDING) {
            throw new ConflictException('Жалоба уже обработана');
        }
        const now = new Date();
        const nextStatus = input.decision === 'resolved'
            ? MaterialReportStatus.RESOLVED
            : MaterialReportStatus.DISMISSED;

        await this.prisma.$transaction(async (transaction) => {
            await transaction.materialReport.update({
                where: { id: report.id },
                data: {
                    status: nextStatus,
                    resolutionComment: comment || null,
                    handledById: actor.id,
                    handledAt: now,
                },
            });
            if (input.hide_material) {
                await transaction.learningMaterial.update({
                    where: { id: report.materialId },
                    data: { publicationStatus: MaterialPublicationStatus.HIDDEN },
                });
                await transaction.materialAssignment.updateMany({
                    where: {
                        materialId: report.materialId,
                        revokedAt: null,
                    },
                    data: { revokedAt: now },
                });
                await transaction.materialAccessGrant.updateMany({
                    where: {
                        materialId: report.materialId,
                        revokedAt: null,
                    },
                    data: { revokedAt: now },
                });
            }
            await transaction.adminAuditLog.create({
                data: {
                    adminId: actor.id,
                    action: `material_report.${input.decision}`,
                    entityType: 'material_report',
                    entityId: report.id,
                    oldValue: { status: report.status },
                    newValue: {
                        status: nextStatus,
                        hide_material: Boolean(input.hide_material),
                        comment: comment || null,
                    },
                    ipAddress: metadata.ipAddress,
                    userAgent: metadata.userAgent,
                },
            });
            await this.notifications.create(transaction, {
                userId: report.material.creatorId,
                type: 'material_report_processed',
                title: input.hide_material
                    ? 'Материал скрыт администрацией'
                    : 'Жалоба на материал обработана',
                message: input.hide_material
                    ? `Материал «${report.material.title}» скрыт после рассмотрения жалобы`
                    : `Жалоба на материал «${report.material.title}» рассмотрена`,
                targetSection: 'materials',
                targetEntityType: 'material',
                targetEntityId: report.materialId,
                dedupeKey: `material-report-result:${report.id}`,
            });
        });

        return { success: true, message: 'Решение по жалобе сохранено' };
    }

    download(actor: SessionUser, itemId: number) {
        this.requireModerator(actor);
        return this.materials.download(actor, itemId);
    }

    private requireModerator(actor: SessionUser) {
        if (
            actor.role !== UserRole.ADMIN
            && actor.role !== UserRole.MODERATOR
        ) {
            throw new ForbiddenException('Недостаточно прав');
        }
    }
}
