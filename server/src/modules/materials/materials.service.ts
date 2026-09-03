import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { extname } from 'node:path';

import { normalizeUploadedFileName } from '../../common/files/upload-file-name';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import {
    MaterialAccessSource,
    MaterialAccessType,
    MaterialCategory,
    MaterialContentType,
    MaterialOwnerType,
    MaterialPublicationStatus,
    MaterialReportReason,
    MaterialReportStatus,
    TeacherStudentStatus,
    UserRole,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { NotificationsService } from '../notifications/notifications.service';
import type { AssignMaterialDto } from './dto/assign-material.dto';
import type { CreateMaterialDto } from './dto/create-material.dto';
import type { ListMaterialsQueryDto } from './dto/list-materials-query.dto';
import type { ReportMaterialDto } from './dto/report-material.dto';
import type { UpdateMaterialDto } from './dto/update-material.dto';
import {
    MaterialFileStorageService,
    type MaterialUploadFile,
} from './material-file-storage.service';

const CATEGORY = {
    textbook: MaterialCategory.TEXTBOOK,
    trainer: MaterialCategory.TRAINER,
    extra: MaterialCategory.EXTRA,
} as const;

const ACCESS_TYPE = {
    free: MaterialAccessType.FREE,
    paid: MaterialAccessType.PAID,
} as const;

const LINK_TYPE = {
    external_link: MaterialContentType.EXTERNAL_LINK,
    interactive_link: MaterialContentType.INTERACTIVE_LINK,
} as const;

const REPORT_REASON = {
    copyright: MaterialReportReason.COPYRIGHT,
    inappropriate: MaterialReportReason.INAPPROPRIATE,
    harmful: MaterialReportReason.HARMFUL,
    broken_link: MaterialReportReason.BROKEN_LINK,
    other: MaterialReportReason.OTHER,
} as const;

const materialInclude = {
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

type MaterialRecord = Prisma.LearningMaterialGetPayload<{
    include: typeof materialInclude;
}>;

@Injectable()
export class MaterialsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly notifications: NotificationsService,
        private readonly files: MaterialFileStorageService,
    ) {}

    async list(user: SessionUser, query: ListMaterialsQueryDto) {
        this.requireParticipant(user);
        const view = this.resolveView(user, query.view);
        const where = this.listWhere(user, view);
        const rows = await this.prisma.learningMaterial.findMany({
            where,
            include: materialInclude,
            orderBy: [
                { publishedAt: 'desc' },
                { updatedAt: 'desc' },
                { id: 'desc' },
            ],
        });

        return {
            success: true,
            view,
            materials: rows.map((material) => this.serialize(material, user)),
            upload_limits: this.serializeLimits(),
            purchase_enabled: false,
        };
    }

    async options(user: SessionUser) {
        this.requireTeacher(user);
        const [subjects, relations] = await Promise.all([
            this.prisma.subject.findMany({
                where: { isActive: true },
                orderBy: [{ group: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
                select: { id: true, name: true },
            }),
            this.prisma.teacherStudent.findMany({
                where: {
                    teacherId: user.id,
                    status: TeacherStudentStatus.ACTIVE,
                },
                orderBy: [
                    { student: { fullName: 'asc' } },
                    { subject: { name: 'asc' } },
                ],
                include: {
                    student: { select: { id: true, fullName: true } },
                    subject: { select: { id: true, name: true } },
                },
            }),
        ]);

        return {
            success: true,
            subjects,
            relations: relations.map((relation) => ({
                relation_id: relation.id,
                student_id: relation.studentId,
                student_name: relation.student.fullName || 'Ученик',
                subject_id: relation.subjectId,
                subject_name: relation.subject.name,
            })),
            upload_limits: this.serializeLimits(),
        };
    }

    async show(user: SessionUser, materialId: number) {
        this.requireParticipant(user);
        const material = await this.findMaterial(materialId);
        if (!this.canSee(material, user)) {
            throw new NotFoundException('Материал не найден');
        }

        await this.notifications.markEntityRead(
            this.prisma,
            user.id,
            'material',
            material.id,
        );

        return {
            success: true,
            material: this.serialize(material, user),
        };
    }

    async create(
        user: SessionUser,
        input: CreateMaterialDto,
        uploads: MaterialUploadFile[],
    ) {
        this.requireTeacher(user);
        const validated = this.files.validateUploads(uploads);
        const externalUrl = input.external_url
            ? this.safeExternalUrl(input.external_url)
            : null;
        if (!validated.length && !externalUrl) {
            throw new BadRequestException(
                'Добавьте хотя бы один файл или внешнюю ссылку',
            );
        }
        if (externalUrl && !input.link_type) {
            throw new BadRequestException('Укажите тип внешней ссылки');
        }
        if (!externalUrl && input.link_type) {
            throw new BadRequestException('Укажите адрес внешней ссылки');
        }

        const accessType = ACCESS_TYPE[input.access_type];
        const priceRub = this.resolvePrice(accessType, input.price_rub);
        await this.requireActiveSubject(input.subject_id);
        const publicationStatus = input.publication_mode === 'public'
            ? MaterialPublicationStatus.PENDING
            : MaterialPublicationStatus.PRIVATE;

        const material = await this.prisma.learningMaterial.create({
            data: {
                creatorId: user.id,
                ownerType: MaterialOwnerType.TEACHER,
                subjectId: input.subject_id,
                category: CATEGORY[input.category],
                title: input.title.trim(),
                description: this.nullable(input.description),
                authorName: user.fullName || user.email,
                accessType,
                priceRub,
                currency: 'RUB',
                publicationStatus,
            },
        });

        let stored: Awaited<ReturnType<MaterialFileStorageService['storeUploads']>> = [];
        try {
            stored = await this.files.storeUploads(material.id, validated);
            await this.prisma.materialItem.createMany({
                data: [
                    ...stored.map((file, index) => ({
                        materialId: material.id,
                        title: file.originalName,
                        contentType: MaterialContentType.FILE,
                        storedPath: file.storedPath,
                        originalName: file.originalName,
                        mimeType: file.mimeType,
                        fileSize: file.fileSize,
                        sortOrder: (index + 1) * 10,
                    })),
                    ...(externalUrl ? [{
                        materialId: material.id,
                        title: input.link_title?.trim()
                            || (input.link_type === 'interactive_link'
                                ? 'Интерактивный тренажёр'
                                : 'Внешний материал'),
                        contentType: LINK_TYPE[input.link_type!],
                        externalUrl,
                        sortOrder: (stored.length + 1) * 10,
                    }] : []),
                ],
            });
        } catch (error) {
            await this.files.removeStoredPaths(
                stored.map((file) => file.storedPath),
            );
            await this.prisma.learningMaterial.delete({
                where: { id: material.id },
            });
            throw error;
        }

        return {
            success: true,
            message: publicationStatus === MaterialPublicationStatus.PENDING
                ? 'Материал создан и отправлен на модерацию'
                : 'Материал сохранён в личной библиотеке',
            material: this.serialize(
                await this.findMaterial(material.id),
                user,
            ),
        };
    }

    async update(
        user: SessionUser,
        materialId: number,
        input: UpdateMaterialDto,
    ) {
        this.requireTeacher(user);
        const current = await this.requireOwner(user, materialId);
        if (input.subject_id) {
            await this.requireActiveSubject(input.subject_id);
        }

        const accessType = input.access_type
            ? ACCESS_TYPE[input.access_type]
            : current.accessType;
        const priceRub = this.resolvePrice(
            accessType,
            input.price_rub ?? (current.priceRub
                ? Number(current.priceRub)
                : undefined),
        );
        const requiresReview =
            current.publicationStatus === MaterialPublicationStatus.APPROVED
            || current.publicationStatus === MaterialPublicationStatus.PENDING;

        await this.prisma.learningMaterial.update({
            where: { id: current.id },
            data: {
                ...(input.subject_id ? { subjectId: input.subject_id } : {}),
                ...(input.category ? { category: CATEGORY[input.category] } : {}),
                ...(input.title ? { title: input.title.trim() } : {}),
                ...(input.description !== undefined
                    ? { description: this.nullable(input.description) }
                    : {}),
                accessType,
                priceRub,
                ...(requiresReview ? {
                    publicationStatus: MaterialPublicationStatus.PENDING,
                    moderationComment: null,
                    moderatedById: null,
                    moderatedAt: null,
                    publishedAt: null,
                } : {}),
            },
        });

        return {
            success: true,
            message: requiresReview
                ? 'Изменения отправлены на повторную модерацию'
                : 'Материал обновлён',
            material: this.serialize(await this.findMaterial(materialId), user),
        };
    }

    async submitModeration(user: SessionUser, materialId: number) {
        this.requireTeacher(user);
        const material = await this.requireOwner(user, materialId);
        if (material.publicationStatus === MaterialPublicationStatus.PENDING) {
            throw new ConflictException('Материал уже находится на модерации');
        }

        await this.prisma.learningMaterial.update({
            where: { id: material.id },
            data: {
                publicationStatus: MaterialPublicationStatus.PENDING,
                moderationComment: null,
                moderatedById: null,
                moderatedAt: null,
                publishedAt: null,
            },
        });

        return {
            success: true,
            message: 'Материал отправлен на модерацию',
        };
    }

    async hide(user: SessionUser, materialId: number) {
        this.requireTeacher(user);
        const material = await this.requireOwner(user, materialId);
        await this.prisma.learningMaterial.update({
            where: { id: material.id },
            data: { publicationStatus: MaterialPublicationStatus.HIDDEN },
        });

        return {
            success: true,
            message: 'Материал скрыт из общего каталога',
        };
    }

    async assign(
        user: SessionUser,
        materialId: number,
        input: AssignMaterialDto,
    ) {
        this.requireTeacher(user);
        const [material, relation] = await Promise.all([
            this.findMaterial(materialId),
            this.prisma.teacherStudent.findFirst({
                where: {
                    id: input.relation_id,
                    teacherId: user.id,
                    status: TeacherStudentStatus.ACTIVE,
                },
                include: {
                    student: { select: { fullName: true } },
                    subject: { select: { name: true } },
                },
            }),
        ]);
        if (!relation) {
            throw new NotFoundException('Активный ученик не найден');
        }
        if (material.subjectId !== relation.subjectId) {
            throw new BadRequestException(
                'Предмет материала не совпадает с предметом ученика',
            );
        }
        const isOwner = material.creatorId === user.id;
        if (
            !isOwner
            && !(
                material.publicationStatus === MaterialPublicationStatus.APPROVED
                && material.accessType === MaterialAccessType.FREE
            )
        ) {
            throw new ForbiddenException(
                'Назначить можно свой материал или бесплатный материал каталога',
            );
        }

        await this.prisma.$transaction(async (transaction) => {
            const assignment = await transaction.materialAssignment.upsert({
                where: {
                    materialId_teacherStudentId: {
                        materialId: material.id,
                        teacherStudentId: relation.id,
                    },
                },
                update: { revokedAt: null, assignedAt: new Date() },
                create: {
                    materialId: material.id,
                    teacherStudentId: relation.id,
                    teacherId: user.id,
                    studentId: relation.studentId,
                    subjectId: relation.subjectId,
                },
            });
            const sourceKey = `assignment:${assignment.id}`;
            await transaction.materialAccessGrant.upsert({
                where: {
                    materialId_userId_sourceKey: {
                        materialId: material.id,
                        userId: relation.studentId,
                        sourceKey,
                    },
                },
                update: {
                    revokedAt: null,
                    expiresAt: null,
                    grantedById: user.id,
                },
                create: {
                    materialId: material.id,
                    userId: relation.studentId,
                    source: MaterialAccessSource.ASSIGNMENT,
                    sourceKey,
                    grantedById: user.id,
                },
            });
            await this.notifications.create(transaction, {
                userId: relation.studentId,
                type: 'material_assigned',
                title: 'Новый учебный материал',
                message: `${user.fullName || 'Преподаватель'} назначил материал «${material.title}»`,
                targetSection: 'materials',
                targetEntityType: 'material',
                targetEntityId: material.id,
                dedupeKey: `material-assignment:${assignment.id}`,
            });
        });

        return {
            success: true,
            message: `Материал назначен ученику ${relation.student.fullName || 'Ученик'}`,
        };
    }

    async unassign(
        user: SessionUser,
        materialId: number,
        input: AssignMaterialDto,
    ) {
        this.requireTeacher(user);
        const assignment = await this.prisma.materialAssignment.findFirst({
            where: {
                materialId,
                teacherStudentId: input.relation_id,
                teacherId: user.id,
                revokedAt: null,
            },
        });
        if (!assignment) {
            throw new NotFoundException('Назначение не найдено');
        }
        const revokedAt = new Date();
        await this.prisma.$transaction([
            this.prisma.materialAssignment.update({
                where: { id: assignment.id },
                data: { revokedAt },
            }),
            this.prisma.materialAccessGrant.updateMany({
                where: {
                    materialId,
                    userId: assignment.studentId,
                    sourceKey: `assignment:${assignment.id}`,
                    revokedAt: null,
                },
                data: { revokedAt },
            }),
        ]);

        return { success: true, message: 'Назначение отменено' };
    }

    async report(
        user: SessionUser,
        materialId: number,
        input: ReportMaterialDto,
    ) {
        this.requireParticipant(user);
        const material = await this.findMaterial(materialId);
        if (!this.canSee(material, user)) {
            throw new NotFoundException('Материал не найден');
        }
        if (material.creatorId === user.id) {
            throw new BadRequestException('Нельзя пожаловаться на свой материал');
        }
        const duplicate = await this.prisma.materialReport.findFirst({
            where: {
                materialId,
                reporterId: user.id,
                status: MaterialReportStatus.PENDING,
            },
            select: { id: true },
        });
        if (duplicate) {
            throw new ConflictException('Жалоба уже передана администрации');
        }

        await this.prisma.materialReport.create({
            data: {
                materialId,
                reporterId: user.id,
                reason: REPORT_REASON[input.reason],
                comment: this.nullable(input.comment),
            },
        });

        return {
            success: true,
            message: 'Жалоба передана администрации',
        };
    }

    async download(user: SessionUser, itemId: number) {
        const item = await this.prisma.materialItem.findUnique({
            where: { id: itemId },
            include: { material: { include: materialInclude } },
        });
        if (!item || item.contentType !== MaterialContentType.FILE) {
            throw new NotFoundException('Файл материала не найден');
        }
        if (!this.canAccess(item.material, user)) {
            throw new ForbiddenException(
                item.material.accessType === MaterialAccessType.PAID
                    ? 'Покупка материалов пока недоступна'
                    : 'Нет доступа к материалу',
            );
        }
        if (!item.storedPath || !item.originalName || !item.mimeType) {
            throw new NotFoundException('Файл материала не найден');
        }
        const stored = await this.files.readStoredFile(item.storedPath);

        return {
            ...stored,
            originalName: normalizeUploadedFileName(item.originalName),
            mimeType: item.mimeType,
        };
    }

    async findForAdministration(materialId: number) {
        return this.findMaterial(materialId);
    }

    serializeForAdministration(material: MaterialRecord) {
        return this.serialize(material, null);
    }

    private async findMaterial(materialId: number): Promise<MaterialRecord> {
        const material = await this.prisma.learningMaterial.findUnique({
            where: { id: materialId },
            include: materialInclude,
        });
        if (!material) {
            throw new NotFoundException('Материал не найден');
        }

        return material;
    }

    private requireOwner(user: SessionUser, materialId: number) {
        return this.prisma.learningMaterial.findFirst({
            where: { id: materialId, creatorId: user.id },
        }).then((material) => {
            if (!material) {
                throw new NotFoundException('Материал не найден');
            }
            return material;
        });
    }

    private listWhere(
        user: SessionUser,
        view: 'mine' | 'catalog' | 'assigned',
    ): Prisma.LearningMaterialWhereInput {
        if (view === 'mine') {
            return { creatorId: user.id };
        }
        if (view === 'assigned') {
            return {
                accessGrants: {
                    some: {
                        userId: user.id,
                        revokedAt: null,
                        OR: [
                            { expiresAt: null },
                            { expiresAt: { gt: new Date() } },
                        ],
                    },
                },
            };
        }

        return { publicationStatus: MaterialPublicationStatus.APPROVED };
    }

    private resolveView(
        user: SessionUser,
        requested?: 'mine' | 'catalog' | 'assigned',
    ): 'mine' | 'catalog' | 'assigned' {
        const fallback = user.role === UserRole.TEACHER ? 'mine' : 'assigned';
        const view = requested || fallback;
        if (view === 'mine' && user.role !== UserRole.TEACHER) {
            throw new ForbiddenException('Личная библиотека доступна преподавателю');
        }
        if (view === 'assigned' && user.role !== UserRole.STUDENT) {
            throw new ForbiddenException('Этот список доступен ученику');
        }

        return view;
    }

    private serialize(material: MaterialRecord, viewer: SessionUser | null) {
        const canAccess = viewer ? this.canAccess(material, viewer) : true;
        const isOwner = Boolean(viewer && material.creatorId === viewer.id);
        const activeAssignment = viewer
            ? material.assignments.some((item) => item.studentId === viewer.id)
            : false;

        return {
            id: material.id,
            owner_type: material.ownerType.toLowerCase(),
            creator_id: material.creatorId,
            title: material.title,
            description: material.description,
            author: material.authorName,
            subject_id: material.subjectId,
            subject: material.subject.name,
            category: material.category.toLowerCase(),
            access_type: material.accessType.toLowerCase(),
            access: material.accessType === MaterialAccessType.PAID
                ? 'Платно'
                : 'Бесплатно',
            price_rub: material.priceRub ? Number(material.priceRub) : null,
            currency: material.currency,
            publication_status: material.publicationStatus.toLowerCase(),
            moderation_comment: isOwner ? material.moderationComment : null,
            published_at: material.publishedAt,
            updated_at: material.updatedAt,
            is_owner: isOwner,
            is_assigned: activeAssignment,
            can_access: canAccess,
            can_report: Boolean(viewer && !isOwner),
            purchase_available: false,
            items: material.items.map((item) => ({
                id: item.id,
                title: item.title,
                content_type: item.contentType.toLowerCase(),
                original_name: item.originalName
                    ? normalizeUploadedFileName(item.originalName)
                    : null,
                mime_type: item.mimeType,
                file_size: item.fileSize,
                external_url: canAccess ? item.externalUrl : null,
                format: this.itemFormat(item),
                can_open: canAccess,
            })),
            assignments: viewer?.role === UserRole.TEACHER
                ? material.assignments
                    .filter((assignment) => assignment.teacherId === viewer.id)
                    .map((assignment) => ({
                        assignment_id: assignment.id,
                        relation_id: assignment.teacherStudent.id,
                        student_id: assignment.student.id,
                        student_name: assignment.student.fullName || 'Ученик',
                        assigned_at: assignment.assignedAt,
                    }))
                : [],
        };
    }

    private itemFormat(item: MaterialRecord['items'][number]): string {
        if (item.contentType === MaterialContentType.INTERACTIVE_LINK) {
            return 'Интерактивный тренажёр';
        }
        if (item.contentType === MaterialContentType.EXTERNAL_LINK) {
            return 'Внешняя ссылка';
        }

        return extname(item.originalName || '').slice(1).toUpperCase()
            || 'Файл';
    }

    private canSee(material: MaterialRecord, user: SessionUser): boolean {
        return material.creatorId === user.id
            || user.role === UserRole.ADMIN
            || user.role === UserRole.MODERATOR
            || material.publicationStatus === MaterialPublicationStatus.APPROVED
            || this.hasActiveGrant(material, user.id);
    }

    private canAccess(material: MaterialRecord, user: SessionUser): boolean {
        return material.creatorId === user.id
            || user.role === UserRole.ADMIN
            || user.role === UserRole.MODERATOR
            || (
                material.publicationStatus === MaterialPublicationStatus.APPROVED
                && material.accessType === MaterialAccessType.FREE
            )
            || this.hasActiveGrant(material, user.id);
    }

    private hasActiveGrant(material: MaterialRecord, userId: number): boolean {
        const now = Date.now();
        return material.accessGrants.some((grant) => (
            grant.userId === userId
            && !grant.revokedAt
            && (!grant.expiresAt || grant.expiresAt.getTime() > now)
        ));
    }

    private resolvePrice(
        accessType: MaterialAccessType,
        input?: number,
    ): number | null {
        if (accessType === MaterialAccessType.FREE) {
            return null;
        }
        const price = Number(input);
        if (!Number.isFinite(price) || price < 1 || price > 1000000) {
            throw new BadRequestException(
                'Для платного материала укажите цену от 1 до 1 000 000 ₽',
            );
        }

        return Math.round(price * 100) / 100;
    }

    private safeExternalUrl(value: string): string {
        let url: URL;
        try {
            url = new URL(value.trim());
        } catch {
            throw new BadRequestException('Некорректная внешняя ссылка');
        }
        if (!['http:', 'https:'].includes(url.protocol)) {
            throw new BadRequestException('Разрешены только HTTP и HTTPS ссылки');
        }
        if (url.username || url.password) {
            throw new BadRequestException('Ссылка не должна содержать логин и пароль');
        }

        return url.toString();
    }

    private requireActiveSubject(subjectId: number) {
        return this.prisma.subject.findFirst({
            where: { id: subjectId, isActive: true },
            select: { id: true },
        }).then((subject) => {
            if (!subject) {
                throw new NotFoundException('Предмет не найден');
            }
            return subject;
        });
    }

    private requireParticipant(user: SessionUser) {
        if (
            user.role !== UserRole.STUDENT
            && user.role !== UserRole.TEACHER
        ) {
            throw new ForbiddenException('Раздел доступен ученикам и преподавателям');
        }
    }

    private requireTeacher(user: SessionUser) {
        if (user.role !== UserRole.TEACHER) {
            throw new ForbiddenException('Действие доступно только преподавателю');
        }
    }

    private nullable(value?: string): string | null {
        return value?.trim() || null;
    }

    private serializeLimits() {
        const limits = this.files.limits();
        return {
            max_files: limits.maxFiles,
            max_file_bytes: limits.maxFileBytes,
            max_total_bytes: limits.maxTotalBytes,
        };
    }
}
