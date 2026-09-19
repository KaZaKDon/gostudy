import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import type { RequestMetadata } from '../../common/http/request-metadata';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
    TariffPublicationStatus,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import type { SaveTariffDraftDto } from './dto/save-tariff-draft.dto';
import { TariffsService } from './tariffs.service';

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

const moderator: SessionUser = {
    ...admin,
    id: 2,
    role: UserRole.MODERATOR,
    email: 'moderator@example.com',
};

const metadata: RequestMetadata = {
    ipAddress: '127.0.0.1',
    userAgent: 'vitest',
};

const content = {
    page_title: 'Тарифы GoStudy',
    page_lead: 'Два понятных варианта работы для преподавателя.',
    individual: {
        title: 'Физическое лицо',
        badge: 'Подписка',
        summary: 'Подписочная модель работы преподавателя.',
        price_rubles: 990,
        period_days: 30,
        students_included: 2,
        extra_block_students: 2,
        extra_block_price_rubles: 400,
        recalculation_text: 'Перерасчёт выполняется в день изменения.',
        features: ['Количество уроков не ограничено'],
    },
    business: {
        title: 'Самозанятый / ИП',
        badge: 'Комиссионная модель',
        summary: 'Оплата занятий проводится через платформу.',
        commission_percent: 15,
        minimum_payout_rubles: 500,
        payout_frequency: 'Раз в неделю',
        settlement_text: 'Начисление выполняется после каждого урока.',
        features: ['История начислений и выплат'],
    },
    notice: 'Подробные условия закреплены в документах платформы.',
};

const input: SaveTariffDraftDto = {
    page_title: content.page_title,
    page_lead: content.page_lead,
    individual_title: content.individual.title,
    individual_badge: content.individual.badge,
    individual_summary: content.individual.summary,
    individual_price_rubles: content.individual.price_rubles,
    individual_period_days: content.individual.period_days,
    individual_students_included: content.individual.students_included,
    individual_extra_block_students: content.individual.extra_block_students,
    individual_extra_block_price_rubles:
        content.individual.extra_block_price_rubles,
    individual_recalculation_text:
        content.individual.recalculation_text,
    individual_features: content.individual.features,
    business_title: content.business.title,
    business_badge: content.business.badge,
    business_summary: content.business.summary,
    business_commission_percent: content.business.commission_percent,
    business_minimum_payout_rubles:
        content.business.minimum_payout_rubles,
    business_payout_frequency: content.business.payout_frequency,
    business_settlement_text: content.business.settlement_text,
    business_features: content.business.features,
    materials_title: 'Учебные материалы',
    materials_lead: 'Материалы для занятий входят в оба варианта работы.',
    materials_personal_library_text:
        'Личная библиотека и передача материалов своим ученикам включены.',
    materials_free_catalog_text:
        'Бесплатная публикация в общем каталоге доступна после модерации.',
    materials_individual_sales_text:
        'Продажа недоступна без подтверждённого статуса самозанятого или ИП.',
    materials_business_sales_text:
        'Самозанятые и ИП могут продавать собственные материалы через каталог.',
    materials_sale_commission_percent: 25,
    materials_payout_hold_days: 7,
    materials_licenses_text:
        'Автор устанавливает цены Личной и Профессиональной лицензий.',
    materials_moderation_text:
        'Материал проходит модерацию, а выплата производится после периода возврата.',
    notice: content.notice,
};

function publication(overrides: Record<string, unknown> = {}) {
    return {
        id: 10,
        version: 1,
        status: TariffPublicationStatus.PUBLISHED,
        content,
        effectiveFrom: new Date('2026-09-15T09:00:00.000Z'),
        publishedAt: new Date('2026-09-15T09:00:00.000Z'),
        createdById: null,
        publishedById: null,
        createdAt: new Date('2026-09-15T09:00:00.000Z'),
        updatedAt: new Date('2026-09-15T09:00:00.000Z'),
        ...overrides,
    };
}

describe('TariffsService', () => {
    it('returns only the current published tariff to a public visitor', async () => {
        const prisma = {
            tariffPublication: {
                findFirst: vi.fn().mockResolvedValue(publication()),
            },
        } as unknown as PrismaService;
        const service = new TariffsService(prisma);

        const result = await service.publicTariffs();

        expect(result).toMatchObject({
            success: true,
            data: {
                version: 1,
                status: 'published',
                content: {
                    individual: { price_rubles: 990 },
                    business: { commission_percent: 15 },
                    materials: {
                        sale_commission_percent: 25,
                        payout_hold_days: 7,
                    },
                },
            },
        });
        expect(prisma.tariffPublication.findFirst).toHaveBeenCalledWith({
            where: { status: TariffPublicationStatus.PUBLISHED },
            orderBy: [
                { effectiveFrom: 'desc' },
                { version: 'desc' },
            ],
        });
    });

    it('returns not found when no published tariff exists', async () => {
        const prisma = {
            tariffPublication: {
                findFirst: vi.fn().mockResolvedValue(null),
            },
        } as unknown as PrismaService;
        const service = new TariffsService(prisma);

        await expect(service.publicTariffs())
            .rejects
            .toBeInstanceOf(NotFoundException);
    });

    it('creates a new draft version and records the action', async () => {
        const created = publication({
            id: 11,
            version: 2,
            status: TariffPublicationStatus.DRAFT,
            effectiveFrom: null,
            publishedAt: null,
            createdById: admin.id,
        });
        const transaction = {
            tariffPublication: {
                findFirst: vi.fn().mockResolvedValue(null),
                aggregate: vi.fn().mockResolvedValue({
                    _max: { version: 1 },
                }),
                create: vi.fn().mockResolvedValue(created),
            },
            adminAuditLog: {
                create: vi.fn().mockResolvedValue(undefined),
            },
        };
        const prisma = {
            $transaction: vi.fn(
                async (callback: (client: typeof transaction) => unknown) =>
                    callback(transaction),
            ),
        } as unknown as PrismaService;
        const service = new TariffsService(prisma);

        const result = await service.saveDraft(admin, input, metadata);

        expect(transaction.tariffPublication.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                version: 2,
                status: TariffPublicationStatus.DRAFT,
                createdById: admin.id,
                content: expect.objectContaining({
                    materials: expect.objectContaining({
                        sale_commission_percent: 25,
                        payout_hold_days: 7,
                    }),
                }),
            }),
        });
        expect(transaction.adminAuditLog.create).toHaveBeenCalledOnce();
        expect(result).toMatchObject({
            success: true,
            message: 'Черновик тарифа v2 сохранён',
        });
    });

    it('publishes the draft and archives the previous public version', async () => {
        const draft = publication({
            id: 11,
            version: 2,
            status: TariffPublicationStatus.DRAFT,
            effectiveFrom: null,
            publishedAt: null,
        });
        const published = publication({
            ...draft,
            status: TariffPublicationStatus.PUBLISHED,
            effectiveFrom: new Date(),
            publishedAt: new Date(),
            publishedById: admin.id,
        });
        const transaction = {
            tariffPublication: {
                findFirst: vi.fn().mockResolvedValue(draft),
                updateMany: vi.fn().mockResolvedValue({ count: 1 }),
                update: vi.fn().mockResolvedValue(published),
            },
            adminAuditLog: {
                create: vi.fn().mockResolvedValue(undefined),
            },
        };
        const prisma = {
            $transaction: vi.fn(
                async (callback: (client: typeof transaction) => unknown) =>
                    callback(transaction),
            ),
        } as unknown as PrismaService;
        const service = new TariffsService(prisma);

        const result = await service.publishDraft(admin, metadata);

        expect(transaction.tariffPublication.updateMany).toHaveBeenCalledWith({
            where: { status: TariffPublicationStatus.PUBLISHED },
            data: { status: TariffPublicationStatus.ARCHIVED },
        });
        expect(transaction.tariffPublication.update).toHaveBeenCalledWith({
            where: { id: draft.id },
            data: expect.objectContaining({
                status: TariffPublicationStatus.PUBLISHED,
                publishedById: admin.id,
            }),
        });
        expect(result).toMatchObject({
            success: true,
            message: 'Тариф v2 опубликован',
        });
    });

    it('does not allow a moderator to change tariff values', async () => {
        const service = new TariffsService({} as PrismaService);

        await expect(
            service.saveDraft(moderator, input, metadata),
        ).rejects.toBeInstanceOf(ForbiddenException);
    });
});
