import {
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import type { RequestMetadata } from '../../common/http/request-metadata';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import {
    TariffPublicationStatus,
    UserRole,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import type { SaveTariffDraftDto } from './dto/save-tariff-draft.dto';

type TariffContent = {
    page_title: string;
    page_lead: string;
    individual: {
        title: string;
        badge: string;
        summary: string;
        price_rubles: number;
        period_days: number;
        students_included: number;
        extra_block_students: number;
        extra_block_price_rubles: number;
        recalculation_text: string;
        features: string[];
    };
    business: {
        title: string;
        badge: string;
        summary: string;
        commission_percent: number;
        minimum_payout_rubles: number;
        payout_frequency: string;
        settlement_text: string;
        features: string[];
    };
    materials: MaterialsContent;
    notice: string;
};

type MaterialsContent = {
    title: string;
    lead: string;
    personal_library_text: string;
    free_catalog_text: string;
    individual_sales_text: string;
    business_sales_text: string;
    sale_commission_percent: number;
    payout_hold_days: number;
    licenses_text: string;
    moderation_text: string;
};

const DEFAULT_MATERIALS_CONTENT: MaterialsContent = {
    title: 'Учебные материалы',
    lead: 'Личная библиотека и материалы для занятий входят в оба варианта. Публикация в общем каталоге проходит модерацию.',
    personal_library_text: 'Личная библиотека, материалы для уроков, домашних заданий и передача своим ученикам включены в тариф.',
    free_catalog_text: 'Бесплатные материалы можно публиковать в общем каталоге GoStudy после модерации.',
    individual_sales_text: 'Продажа платных материалов через GoStudy недоступна для физического лица без подтверждённого статуса самозанятого или ИП.',
    business_sales_text: 'Подтверждённые самозанятые и ИП могут продавать собственные материалы через каталог GoStudy.',
    sale_commission_percent: 25,
    payout_hold_days: 7,
    licenses_text: 'Автор самостоятельно устанавливает цены Личной и Профессиональной лицензий в рублях в пределах правил платформы.',
    moderation_text: 'Каждый материал для общего каталога проходит модерацию. Автор подтверждает права на публикацию, а выплата за платный материал производится после периода возврата при отсутствии спора.',
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

type TariffRecord = {
    id: number;
    version: number;
    status: TariffPublicationStatus;
    content: unknown;
    effectiveFrom: Date | null;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
};

@Injectable()
export class TariffsService {
    constructor(private readonly prisma: PrismaService) {}

    async publicTariffs(): Promise<Record<string, unknown>> {
        const publication = await this.prisma.tariffPublication.findFirst({
            where: {
                status: TariffPublicationStatus.PUBLISHED,
            },
            orderBy: [
                { effectiveFrom: 'desc' },
                { version: 'desc' },
            ],
        });

        if (!publication) {
            throw new NotFoundException('Опубликованные тарифы пока недоступны');
        }

        return {
            success: true,
            data: this.serializePublication(publication),
        };
    }

    async adminTariffs(actor: SessionUser): Promise<Record<string, unknown>> {
        this.requireModerator(actor);

        const [active, draft, history] = await Promise.all([
            this.prisma.tariffPublication.findFirst({
                where: { status: TariffPublicationStatus.PUBLISHED },
                orderBy: [{ version: 'desc' }],
            }),
            this.prisma.tariffPublication.findFirst({
                where: { status: TariffPublicationStatus.DRAFT },
                orderBy: [{ version: 'desc' }],
            }),
            this.prisma.tariffPublication.findMany({
                orderBy: [{ version: 'desc' }],
                take: 30,
            }),
        ]);

        return {
            success: true,
            data: {
                active: active ? this.serializePublication(active) : null,
                draft: draft ? this.serializePublication(draft) : null,
                history: history.map((item) =>
                    this.serializePublication(item)),
                can_edit: actor.role === UserRole.ADMIN,
            },
        };
    }

    async saveDraft(
        actor: SessionUser,
        input: SaveTariffDraftDto,
        metadata: RequestMetadata,
    ): Promise<Record<string, unknown>> {
        this.requireAdmin(actor);
        const content = this.buildContent(input);

        const saved = await this.prisma.$transaction(async (transaction) => {
            const currentDraft = await transaction.tariffPublication.findFirst({
                where: { status: TariffPublicationStatus.DRAFT },
                orderBy: [{ version: 'desc' }],
            });

            if (currentDraft) {
                const updated = await transaction.tariffPublication.update({
                    where: { id: currentDraft.id },
                    data: { content: content as unknown as Prisma.InputJsonValue },
                });

                await this.audit(
                    transaction,
                    actor,
                    metadata,
                    'tariff_draft_updated',
                    updated.id,
                    this.snapshot(currentDraft),
                    this.snapshot(updated),
                );

                return updated;
            }

            const latest = await transaction.tariffPublication.aggregate({
                _max: { version: true },
            });
            const created = await transaction.tariffPublication.create({
                data: {
                    version: (latest._max.version ?? 0) + 1,
                    status: TariffPublicationStatus.DRAFT,
                    content: content as unknown as Prisma.InputJsonValue,
                    createdById: actor.id,
                },
            });

            await this.audit(
                transaction,
                actor,
                metadata,
                'tariff_draft_created',
                created.id,
                null,
                this.snapshot(created),
            );

            return created;
        });

        return {
            success: true,
            message: `Черновик тарифа v${saved.version} сохранён`,
            data: this.serializePublication(saved),
        };
    }

    async publishDraft(
        actor: SessionUser,
        metadata: RequestMetadata,
    ): Promise<Record<string, unknown>> {
        this.requireAdmin(actor);
        const now = new Date();

        const published = await this.prisma.$transaction(async (transaction) => {
            const draft = await transaction.tariffPublication.findFirst({
                where: { status: TariffPublicationStatus.DRAFT },
                orderBy: [{ version: 'desc' }],
            });

            if (!draft) {
                throw new NotFoundException('Сохранённый черновик тарифа не найден');
            }

            await transaction.tariffPublication.updateMany({
                where: { status: TariffPublicationStatus.PUBLISHED },
                data: { status: TariffPublicationStatus.ARCHIVED },
            });

            const updated = await transaction.tariffPublication.update({
                where: { id: draft.id },
                data: {
                    status: TariffPublicationStatus.PUBLISHED,
                    effectiveFrom: now,
                    publishedAt: now,
                    publishedById: actor.id,
                },
            });

            await this.audit(
                transaction,
                actor,
                metadata,
                'tariff_published',
                updated.id,
                this.snapshot(draft),
                this.snapshot(updated),
            );

            return updated;
        });

        return {
            success: true,
            message: `Тариф v${published.version} опубликован`,
            data: this.serializePublication(published),
        };
    }

    private buildContent(input: SaveTariffDraftDto): TariffContent {
        return {
            page_title: input.page_title.trim(),
            page_lead: input.page_lead.trim(),
            individual: {
                title: input.individual_title.trim(),
                badge: input.individual_badge.trim(),
                summary: input.individual_summary.trim(),
                price_rubles: input.individual_price_rubles,
                period_days: input.individual_period_days,
                students_included: input.individual_students_included,
                extra_block_students: input.individual_extra_block_students,
                extra_block_price_rubles:
                    input.individual_extra_block_price_rubles,
                recalculation_text:
                    input.individual_recalculation_text.trim(),
                features: input.individual_features.map((item) => item.trim()),
            },
            business: {
                title: input.business_title.trim(),
                badge: input.business_badge.trim(),
                summary: input.business_summary.trim(),
                commission_percent: input.business_commission_percent,
                minimum_payout_rubles:
                    input.business_minimum_payout_rubles,
                payout_frequency: input.business_payout_frequency.trim(),
                settlement_text: input.business_settlement_text.trim(),
                features: input.business_features.map((item) => item.trim()),
            },
            materials: {
                title: input.materials_title.trim(),
                lead: input.materials_lead.trim(),
                personal_library_text:
                    input.materials_personal_library_text.trim(),
                free_catalog_text: input.materials_free_catalog_text.trim(),
                individual_sales_text:
                    input.materials_individual_sales_text.trim(),
                business_sales_text:
                    input.materials_business_sales_text.trim(),
                sale_commission_percent:
                    input.materials_sale_commission_percent,
                payout_hold_days: input.materials_payout_hold_days,
                licenses_text: input.materials_licenses_text.trim(),
                moderation_text: input.materials_moderation_text.trim(),
            },
            notice: input.notice.trim(),
        };
    }

    private normalizeContent(content: unknown): unknown {
        if (!isRecord(content)) {
            return content;
        }

        const materials = isRecord(content.materials)
            ? {
                ...DEFAULT_MATERIALS_CONTENT,
                ...content.materials,
            }
            : DEFAULT_MATERIALS_CONTENT;

        return {
            ...content,
            materials,
        };
    }

    private serializePublication(item: TariffRecord) {
        return {
            id: item.id,
            version: item.version,
            status: item.status.toLowerCase(),
            content: this.normalizeContent(item.content),
            effective_from: item.effectiveFrom?.toISOString() ?? null,
            published_at: item.publishedAt?.toISOString() ?? null,
            created_at: item.createdAt.toISOString(),
            updated_at: item.updatedAt.toISOString(),
        };
    }

    private snapshot(item: TariffRecord): Record<string, unknown> {
        return this.serializePublication(item);
    }

    private async audit(
        transaction: Prisma.TransactionClient,
        actor: SessionUser,
        metadata: RequestMetadata,
        action: string,
        entityId: number,
        oldValue: Record<string, unknown> | null,
        newValue: Record<string, unknown> | null,
    ): Promise<void> {
        await transaction.adminAuditLog.create({
            data: {
                adminId: actor.id,
                action,
                entityType: 'tariff_publication',
                entityId,
                oldValue: oldValue
                    ? oldValue as Prisma.InputJsonValue
                    : undefined,
                newValue: newValue
                    ? newValue as Prisma.InputJsonValue
                    : undefined,
                ipAddress: metadata.ipAddress,
                userAgent: metadata.userAgent,
            },
        });
    }

    private requireModerator(actor: SessionUser): void {
        if (actor.role !== UserRole.ADMIN && actor.role !== UserRole.MODERATOR) {
            throw new ForbiddenException(
                'Просматривать тарифы может только администратор или модератор',
            );
        }
    }

    private requireAdmin(actor: SessionUser): void {
        if (actor.role !== UserRole.ADMIN) {
            throw new ForbiddenException(
                'Изменять и публиковать тарифы может только администратор',
            );
        }
    }
}
