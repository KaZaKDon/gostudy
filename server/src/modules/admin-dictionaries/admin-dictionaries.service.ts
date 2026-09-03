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
import { UserRole } from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import type { ListDictionaryItemsQueryDto } from './dto/list-dictionary-items-query.dto';
import type {
    SaveDictionaryItemDto,
    SaveGroupedDictionaryItemDto,
} from './dto/save-dictionary-item.dto';
import type { UpdateSubjectPreparationsDto } from './dto/update-subject-preparations.dto';

type DictionarySnapshot = {
    id: number;
    name: string;
    slug: string;
    sortOrder: number;
    isActive: boolean;
    groupId?: number;
};

@Injectable()
export class AdminDictionariesService {
    constructor(private readonly prisma: PrismaService) {}

    async listSubjectGroups(actor: SessionUser): Promise<Record<string, unknown>> {
        this.requireModerator(actor);
        const groups = await this.prisma.subjectGroup.findMany({
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }, { id: 'asc' }],
            include: { subjects: { select: { isActive: true } } },
        });

        return {
            success: true,
            data: {
                items: groups.map((group) => ({
                    ...this.serializeSimple(group),
                    subjects_total: group.subjects.length,
                    active_subjects_total: group.subjects.filter((subject) => subject.isActive).length,
                })),
            },
        };
    }

    async createSubjectGroup(actor: SessionUser, input: SaveDictionaryItemDto, metadata: RequestMetadata) {
        this.requireAdmin(actor);
        const data = this.simpleData(input);
        await this.assertSimpleUnique('subjectGroup', data.name, data.slug);

        const created = await this.prisma.$transaction(async (transaction) => {
            const group = await transaction.subjectGroup.create({ data });
            await this.audit(transaction, actor, metadata, 'subject_group_created', 'subject_group', group.id, null, this.snapshot(group));
            return group;
        });

        return { success: true, message: 'Группа предметов создана', data: { id: created.id } };
    }

    async updateSubjectGroup(actor: SessionUser, id: number, input: SaveDictionaryItemDto, metadata: RequestMetadata) {
        this.requireAdmin(actor);
        const current = await this.prisma.subjectGroup.findUnique({ where: { id } });
        if (!current) throw new NotFoundException('Группа предметов не найдена');
        const data = this.simpleData(input);
        await this.assertSimpleUnique('subjectGroup', data.name, data.slug, id);

        await this.prisma.$transaction(async (transaction) => {
            const updated = await transaction.subjectGroup.update({ where: { id }, data });
            await this.audit(transaction, actor, metadata, 'subject_group_updated', 'subject_group', id, this.snapshot(current), this.snapshot(updated));
        });

        return { success: true, message: 'Группа предметов обновлена', data: { id } };
    }

    async deleteSubjectGroup(actor: SessionUser, id: number, metadata: RequestMetadata) {
        this.requireAdmin(actor);
        const current = await this.prisma.subjectGroup.findUnique({
            where: { id },
            include: { _count: { select: { subjects: true } } },
        });
        if (!current) throw new NotFoundException('Группа предметов не найдена');
        if (current._count.subjects > 0) throw new ConflictException('Нельзя удалить группу, пока в ней есть предметы');

        await this.prisma.$transaction(async (transaction) => {
            await transaction.subjectGroup.delete({ where: { id } });
            await this.audit(transaction, actor, metadata, 'subject_group_deleted', 'subject_group', id, this.snapshot(current), null);
        });

        return { success: true, message: 'Группа предметов удалена' };
    }

    async listSubjects(actor: SessionUser, query: ListDictionaryItemsQueryDto) {
        this.requireModerator(actor);
        const search = query.search?.trim();
        const where: Prisma.SubjectWhereInput = {
            ...(query.group_id ? { groupId: query.group_id } : {}),
            ...(query.is_active !== undefined ? { isActive: query.is_active === '1' } : {}),
            ...(search ? {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { slug: { contains: search, mode: 'insensitive' } },
                ],
            } : {}),
        };
        const subjects = await this.prisma.subject.findMany({
            where,
            orderBy: [{ group: { sortOrder: 'asc' } }, { group: { name: 'asc' } }, { sortOrder: 'asc' }, { name: 'asc' }, { id: 'asc' }],
            include: {
                group: true,
                _count: { select: { preparations: true, teacherSubjects: true, teacherPreparations: true } },
            },
        });

        return {
            success: true,
            data: {
                items: subjects.map((subject) => ({
                    ...this.serializeGrouped(subject),
                    group_name: subject.group.name,
                    group_slug: subject.group.slug,
                    group_is_active: subject.group.isActive,
                    preparations_total: subject._count.preparations,
                    teachers_total: subject._count.teacherSubjects,
                    teacher_preparations_total: subject._count.teacherPreparations,
                })),
                filters: {
                    group_id: query.group_id ?? null,
                    is_active: query.is_active === undefined ? null : query.is_active === '1',
                    search: search ?? '',
                },
            },
        };
    }

    async createSubject(actor: SessionUser, input: SaveGroupedDictionaryItemDto, metadata: RequestMetadata) {
        this.requireAdmin(actor);
        const data = this.groupedData(input);
        await this.assertGroupExists('subjectGroup', data.groupId, 'Группа предметов не найдена');
        await this.assertGroupedUnique('subject', data.groupId, data.name, data.slug);

        const created = await this.prisma.$transaction(async (transaction) => {
            const subject = await transaction.subject.create({ data });
            await this.audit(transaction, actor, metadata, 'subject_created', 'subject', subject.id, null, this.snapshot(subject));
            return subject;
        });

        return { success: true, message: 'Предмет создан', data: { id: created.id } };
    }

    async updateSubject(actor: SessionUser, id: number, input: SaveGroupedDictionaryItemDto, metadata: RequestMetadata) {
        this.requireAdmin(actor);
        const current = await this.prisma.subject.findUnique({ where: { id } });
        if (!current) throw new NotFoundException('Предмет не найден');
        const data = this.groupedData(input);
        await this.assertGroupExists('subjectGroup', data.groupId, 'Группа предметов не найдена');
        await this.assertGroupedUnique('subject', data.groupId, data.name, data.slug, id);

        await this.prisma.$transaction(async (transaction) => {
            const updated = await transaction.subject.update({ where: { id }, data });
            await this.audit(transaction, actor, metadata, 'subject_updated', 'subject', id, this.snapshot(current), this.snapshot(updated));
        });

        return { success: true, message: 'Предмет обновлён', data: { id } };
    }

    async deleteSubject(actor: SessionUser, id: number, metadata: RequestMetadata) {
        this.requireAdmin(actor);
        const current = await this.prisma.subject.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        preparations: true,
                        teacherSubjects: true,
                        teacherPreparations: true,
                        lessons: true,
                        teacherStudents: true,
                        teacherRequests: true,
                    },
                },
            },
        });
        if (!current) throw new NotFoundException('Предмет не найден');
        if (current._count.teacherSubjects > 0 || current._count.teacherPreparations > 0) {
            throw new ConflictException('Нельзя удалить предмет, который выбран преподавателями');
        }
        if (current._count.preparations > 0) {
            throw new ConflictException('Нельзя удалить предмет, пока у него есть связи с направлениями подготовки');
        }
        if (current._count.lessons > 0 || current._count.teacherStudents > 0 || current._count.teacherRequests > 0) {
            throw new ConflictException('Нельзя удалить предмет, который используется в учебных данных');
        }

        await this.prisma.$transaction(async (transaction) => {
            await transaction.subject.delete({ where: { id } });
            await this.audit(transaction, actor, metadata, 'subject_deleted', 'subject', id, this.snapshot(current), null);
        });

        return { success: true, message: 'Предмет удалён' };
    }

    async listPreparationGroups(actor: SessionUser): Promise<Record<string, unknown>> {
        this.requireModerator(actor);
        const groups = await this.prisma.preparationGroup.findMany({
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }, { id: 'asc' }],
            include: { preparations: { select: { isActive: true } } },
        });

        return {
            success: true,
            data: {
                items: groups.map((group) => ({
                    ...this.serializeSimple(group),
                    preparations_total: group.preparations.length,
                    active_preparations_total: group.preparations.filter((preparation) => preparation.isActive).length,
                })),
            },
        };
    }

    async createPreparationGroup(actor: SessionUser, input: SaveDictionaryItemDto, metadata: RequestMetadata) {
        this.requireAdmin(actor);
        const data = this.simpleData(input);
        await this.assertSimpleUnique('preparationGroup', data.name, data.slug);

        const created = await this.prisma.$transaction(async (transaction) => {
            const group = await transaction.preparationGroup.create({ data });
            await this.audit(transaction, actor, metadata, 'preparation_group_created', 'preparation_group', group.id, null, this.snapshot(group));
            return group;
        });

        return { success: true, message: 'Группа направлений подготовки создана', data: { id: created.id } };
    }

    async updatePreparationGroup(actor: SessionUser, id: number, input: SaveDictionaryItemDto, metadata: RequestMetadata) {
        this.requireAdmin(actor);
        const current = await this.prisma.preparationGroup.findUnique({ where: { id } });
        if (!current) throw new NotFoundException('Группа направлений подготовки не найдена');
        const data = this.simpleData(input);
        await this.assertSimpleUnique('preparationGroup', data.name, data.slug, id);

        await this.prisma.$transaction(async (transaction) => {
            const updated = await transaction.preparationGroup.update({ where: { id }, data });
            await this.audit(transaction, actor, metadata, 'preparation_group_updated', 'preparation_group', id, this.snapshot(current), this.snapshot(updated));
        });

        return { success: true, message: 'Группа направлений подготовки обновлена', data: { id } };
    }

    async deletePreparationGroup(actor: SessionUser, id: number, metadata: RequestMetadata) {
        this.requireAdmin(actor);
        const current = await this.prisma.preparationGroup.findUnique({
            where: { id },
            include: { _count: { select: { preparations: true } } },
        });
        if (!current) throw new NotFoundException('Группа направлений подготовки не найдена');
        if (current._count.preparations > 0) throw new ConflictException('Нельзя удалить группу, пока в ней есть направления подготовки');

        await this.prisma.$transaction(async (transaction) => {
            await transaction.preparationGroup.delete({ where: { id } });
            await this.audit(transaction, actor, metadata, 'preparation_group_deleted', 'preparation_group', id, this.snapshot(current), null);
        });

        return { success: true, message: 'Группа направлений подготовки удалена' };
    }

    async listPreparations(actor: SessionUser, query: ListDictionaryItemsQueryDto) {
        this.requireModerator(actor);
        const search = query.search?.trim();
        const where: Prisma.PreparationWhereInput = {
            ...(query.group_id ? { groupId: query.group_id } : {}),
            ...(query.is_active !== undefined ? { isActive: query.is_active === '1' } : {}),
            ...(search ? {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { slug: { contains: search, mode: 'insensitive' } },
                ],
            } : {}),
        };
        const preparations = await this.prisma.preparation.findMany({
            where,
            orderBy: [{ group: { sortOrder: 'asc' } }, { group: { name: 'asc' } }, { sortOrder: 'asc' }, { name: 'asc' }, { id: 'asc' }],
            include: {
                group: true,
                _count: { select: { subjects: true, teacherPreparations: true } },
            },
        });

        return {
            success: true,
            data: {
                items: preparations.map((preparation) => ({
                    ...this.serializeGrouped(preparation),
                    group_name: preparation.group.name,
                    group_slug: preparation.group.slug,
                    group_is_active: preparation.group.isActive,
                    subjects_total: preparation._count.subjects,
                    teachers_total: preparation._count.teacherPreparations,
                })),
                filters: {
                    group_id: query.group_id ?? null,
                    is_active: query.is_active === undefined ? null : query.is_active === '1',
                    search: search ?? '',
                },
            },
        };
    }

    async createPreparation(actor: SessionUser, input: SaveGroupedDictionaryItemDto, metadata: RequestMetadata) {
        this.requireAdmin(actor);
        const data = this.groupedData(input);
        await this.assertGroupExists('preparationGroup', data.groupId, 'Группа направлений подготовки не найдена');
        await this.assertGroupedUnique('preparation', data.groupId, data.name, data.slug);

        const created = await this.prisma.$transaction(async (transaction) => {
            const preparation = await transaction.preparation.create({ data });
            await this.audit(transaction, actor, metadata, 'preparation_created', 'preparation', preparation.id, null, this.snapshot(preparation));
            return preparation;
        });

        return { success: true, message: 'Направление подготовки создано', data: { id: created.id } };
    }

    async updatePreparation(actor: SessionUser, id: number, input: SaveGroupedDictionaryItemDto, metadata: RequestMetadata) {
        this.requireAdmin(actor);
        const current = await this.prisma.preparation.findUnique({ where: { id } });
        if (!current) throw new NotFoundException('Направление подготовки не найдено');
        const data = this.groupedData(input);
        await this.assertGroupExists('preparationGroup', data.groupId, 'Группа направлений подготовки не найдена');
        await this.assertGroupedUnique('preparation', data.groupId, data.name, data.slug, id);

        await this.prisma.$transaction(async (transaction) => {
            const updated = await transaction.preparation.update({ where: { id }, data });
            await this.audit(transaction, actor, metadata, 'preparation_updated', 'preparation', id, this.snapshot(current), this.snapshot(updated));
        });

        return { success: true, message: 'Направление подготовки обновлено', data: { id } };
    }

    async deletePreparation(actor: SessionUser, id: number, metadata: RequestMetadata) {
        this.requireAdmin(actor);
        const current = await this.prisma.preparation.findUnique({
            where: { id },
            include: { _count: { select: { subjects: true, teacherPreparations: true } } },
        });
        if (!current) throw new NotFoundException('Направление подготовки не найдено');
        if (current._count.subjects > 0) throw new ConflictException('Нельзя удалить направление, пока оно связано с предметами');
        if (current._count.teacherPreparations > 0) throw new ConflictException('Нельзя удалить направление, которое выбрано преподавателями');

        await this.prisma.$transaction(async (transaction) => {
            await transaction.preparation.delete({ where: { id } });
            await this.audit(transaction, actor, metadata, 'preparation_deleted', 'preparation', id, this.snapshot(current), null);
        });

        return { success: true, message: 'Направление подготовки удалено' };
    }

    async listAgeGroups(actor: SessionUser): Promise<Record<string, unknown>> {
        this.requireModerator(actor);
        const groups = await this.prisma.studentAgeGroup.findMany({
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }, { id: 'asc' }],
            include: { _count: { select: { teacherLinks: true } } },
        });

        return {
            success: true,
            data: {
                items: groups.map((group) => ({
                    ...this.serializeSimple(group),
                    teachers_total: group._count.teacherLinks,
                })),
            },
        };
    }

    async createAgeGroup(actor: SessionUser, input: SaveDictionaryItemDto, metadata: RequestMetadata) {
        this.requireAdmin(actor);
        const data = this.simpleData(input);
        await this.assertSimpleUnique('studentAgeGroup', data.name, data.slug);

        const created = await this.prisma.$transaction(async (transaction) => {
            const group = await transaction.studentAgeGroup.create({ data });
            await this.audit(transaction, actor, metadata, 'age_group_created', 'student_age_group', group.id, null, this.snapshot(group));
            return group;
        });

        return { success: true, message: 'Возрастная группа создана', data: { id: created.id } };
    }

    async updateAgeGroup(actor: SessionUser, id: number, input: SaveDictionaryItemDto, metadata: RequestMetadata) {
        this.requireAdmin(actor);
        const current = await this.prisma.studentAgeGroup.findUnique({ where: { id } });
        if (!current) throw new NotFoundException('Возрастная группа не найдена');
        const data = this.simpleData(input);
        await this.assertSimpleUnique('studentAgeGroup', data.name, data.slug, id);

        await this.prisma.$transaction(async (transaction) => {
            const updated = await transaction.studentAgeGroup.update({ where: { id }, data });
            await this.audit(transaction, actor, metadata, 'age_group_updated', 'student_age_group', id, this.snapshot(current), this.snapshot(updated));
        });

        return { success: true, message: 'Возрастная группа обновлена', data: { id } };
    }

    async deleteAgeGroup(actor: SessionUser, id: number, metadata: RequestMetadata) {
        this.requireAdmin(actor);
        const current = await this.prisma.studentAgeGroup.findUnique({
            where: { id },
            include: { _count: { select: { teacherLinks: true } } },
        });
        if (!current) throw new NotFoundException('Возрастная группа не найдена');
        if (current._count.teacherLinks > 0) throw new ConflictException('Нельзя удалить возрастную группу, которая выбрана преподавателями');

        await this.prisma.$transaction(async (transaction) => {
            await transaction.studentAgeGroup.delete({ where: { id } });
            await this.audit(transaction, actor, metadata, 'age_group_deleted', 'student_age_group', id, this.snapshot(current), null);
        });

        return { success: true, message: 'Возрастная группа удалена' };
    }

    async listSubjectPreparations(actor: SessionUser) {
        this.requireModerator(actor);
        const [subjects, preparationGroups, preparations] = await Promise.all([
            this.prisma.subject.findMany({
                orderBy: [{ group: { sortOrder: 'asc' } }, { group: { name: 'asc' } }, { sortOrder: 'asc' }, { name: 'asc' }, { id: 'asc' }],
                include: { group: true, _count: { select: { preparations: true } } },
            }),
            this.prisma.preparationGroup.findMany({
                orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }, { id: 'asc' }],
            }),
            this.prisma.preparation.findMany({
                orderBy: [{ group: { sortOrder: 'asc' } }, { group: { name: 'asc' } }, { sortOrder: 'asc' }, { name: 'asc' }, { id: 'asc' }],
                include: { group: true },
            }),
        ]);

        return {
            success: true,
            data: {
                subjects: subjects.map((subject) => ({
                    ...this.serializeGrouped(subject),
                    group_name: subject.group.name,
                    group_sort_order: subject.group.sortOrder,
                    preparations_total: subject._count.preparations,
                })),
                preparation_groups: preparationGroups.map((group) => this.serializeSimple(group)),
                preparations: preparations.map((preparation) => ({
                    ...this.serializeGrouped(preparation),
                    group_name: preparation.group.name,
                    group_sort_order: preparation.group.sortOrder,
                })),
            },
        };
    }

    async getSubjectPreparations(actor: SessionUser, subjectId: number) {
        this.requireModerator(actor);
        const subject = await this.prisma.subject.findUnique({
            where: { id: subjectId },
            include: {
                group: true,
                preparations: { orderBy: [{ sortOrder: 'asc' }, { preparationId: 'asc' }] },
            },
        });
        if (!subject) throw new NotFoundException('Предмет не найден');

        return {
            success: true,
            data: {
                subject: {
                    ...this.serializeGrouped(subject),
                    group_name: subject.group.name,
                },
                links: subject.preparations.map((link) => ({
                    subject_id: link.subjectId,
                    preparation_id: link.preparationId,
                    sort_order: link.sortOrder,
                })),
            },
        };
    }

    async updateSubjectPreparations(
        actor: SessionUser,
        subjectId: number,
        input: UpdateSubjectPreparationsDto,
        metadata: RequestMetadata,
    ) {
        this.requireAdmin(actor);
        const subject = await this.prisma.subject.findUnique({
            where: { id: subjectId },
            select: { id: true, name: true },
        });
        if (!subject) throw new NotFoundException('Предмет не найден');

        const preparationIds = input.preparations.map((item) => item.id);
        if (new Set(preparationIds).size !== preparationIds.length) {
            throw new BadRequestException('Одно направление подготовки нельзя указать несколько раз');
        }

        const [existingPreparations, currentLinks] = await Promise.all([
            this.prisma.preparation.findMany({
                where: { id: { in: preparationIds } },
                select: { id: true },
            }),
            this.prisma.subjectPreparation.findMany({
                where: { subjectId },
                orderBy: [{ sortOrder: 'asc' }, { preparationId: 'asc' }],
            }),
        ]);
        if (existingPreparations.length !== preparationIds.length) {
            throw new BadRequestException('Одно или несколько направлений подготовки не найдены');
        }

        const removedIds = currentLinks
            .map((link) => link.preparationId)
            .filter((id) => !preparationIds.includes(id));
        if (removedIds.length > 0) {
            const usedLinks = await this.prisma.teacherSubjectPreparation.count({
                where: { subjectId, preparationId: { in: removedIds } },
            });
            if (usedLinks > 0) {
                throw new ConflictException('Нельзя удалить связь: направление уже выбрано в анкетах преподавателей');
            }
        }

        await this.prisma.$transaction(async (transaction) => {
            await transaction.subjectPreparation.deleteMany({ where: { subjectId } });
            if (input.preparations.length > 0) {
                await transaction.subjectPreparation.createMany({
                    data: input.preparations.map((item) => ({
                        subjectId,
                        preparationId: item.id,
                        sortOrder: item.sort_order,
                    })),
                });
            }
            await this.audit(
                transaction,
                actor,
                metadata,
                'subject_preparations_updated',
                'subject',
                subjectId,
                { preparations: currentLinks.map((link) => ({ id: link.preparationId, sort_order: link.sortOrder })) },
                { preparations: input.preparations },
            );
        });

        return {
            success: true,
            message: 'Направления подготовки для предмета сохранены',
            data: { subject_id: subjectId, preparations_total: input.preparations.length },
        };
    }

    private simpleData(input: SaveDictionaryItemDto) {
        return {
            name: input.name.trim(),
            slug: input.slug.trim(),
            sortOrder: input.sort_order,
            isActive: input.is_active,
        };
    }

    private groupedData(input: SaveGroupedDictionaryItemDto) {
        return { ...this.simpleData(input), groupId: input.group_id };
    }

    private serializeSimple(item: DictionarySnapshot) {
        return {
            id: item.id,
            name: item.name,
            slug: item.slug,
            sort_order: item.sortOrder,
            is_active: item.isActive,
        };
    }

    private serializeGrouped(item: DictionarySnapshot & { groupId: number }) {
        return { ...this.serializeSimple(item), group_id: item.groupId };
    }

    private snapshot(item: DictionarySnapshot) {
        return {
            id: item.id,
            name: item.name,
            slug: item.slug,
            sort_order: item.sortOrder,
            is_active: item.isActive,
            ...('groupId' in item ? { group_id: item.groupId } : {}),
        };
    }

    private async assertSimpleUnique(
        model: 'subjectGroup' | 'preparationGroup' | 'studentAgeGroup',
        name: string,
        slug: string,
        excludeId?: number,
    ) {
        const duplicate = await (this.prisma[model] as any).findFirst({
            where: {
                ...(excludeId ? { id: { not: excludeId } } : {}),
                OR: [
                    { name: { equals: name, mode: 'insensitive' } },
                    { slug },
                ],
            },
            select: { name: true, slug: true },
        });
        if (!duplicate) return;
        if (duplicate.name.toLocaleLowerCase('ru-RU') === name.toLocaleLowerCase('ru-RU')) {
            throw new ConflictException('Запись с таким названием уже существует');
        }
        throw new ConflictException('Запись с таким slug уже существует');
    }

    private async assertGroupedUnique(
        model: 'subject' | 'preparation',
        groupId: number,
        name: string,
        slug: string,
        excludeId?: number,
    ) {
        const delegate = this.prisma[model] as any;
        const duplicateSlug = await delegate.findFirst({
            where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
            select: { id: true },
        });
        if (duplicateSlug) throw new ConflictException('Запись с таким slug уже существует');
        const duplicateName = await delegate.findFirst({
            where: {
                groupId,
                name: { equals: name, mode: 'insensitive' },
                ...(excludeId ? { id: { not: excludeId } } : {}),
            },
            select: { id: true },
        });
        if (duplicateName) throw new ConflictException('В выбранной группе уже есть запись с таким названием');
    }

    private async assertGroupExists(
        model: 'subjectGroup' | 'preparationGroup',
        id: number,
        message: string,
    ) {
        const group = await (this.prisma[model] as any).findUnique({ where: { id }, select: { id: true } });
        if (!group) throw new NotFoundException(message);
    }

    private async audit(
        transaction: any,
        actor: SessionUser,
        metadata: RequestMetadata,
        action: string,
        entityType: string,
        entityId: number,
        oldValue: Record<string, unknown> | null,
        newValue: Record<string, unknown> | null,
    ) {
        await transaction.adminAuditLog.create({
            data: {
                adminId: actor.id,
                action,
                entityType,
                entityId,
                oldValue: oldValue ?? undefined,
                newValue: newValue ?? undefined,
                ipAddress: metadata.ipAddress,
                userAgent: metadata.userAgent,
            },
        });
    }

    private requireModerator(actor: SessionUser): void {
        if (actor.role !== UserRole.ADMIN && actor.role !== UserRole.MODERATOR) {
            throw new ForbiddenException('Доступ разрешён только администратору или модератору');
        }
    }

    private requireAdmin(actor: SessionUser): void {
        if (actor.role !== UserRole.ADMIN) {
            throw new ForbiddenException('Изменять справочники может только администратор');
        }
    }
}
