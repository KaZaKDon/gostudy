import {
    BadRequestException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../common/prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import type { SessionUser } from '../auth/session-user';
import { TariffsService } from '../tariffs/tariffs.service';
import { kopecks, signature, verifyResult } from './robokassa-signature';
import { calculateOrder, nextExpiry, type TariffSnapshot } from './subscription-policy';

@Injectable()
export class SubscriptionsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
        private readonly tariffs: TariffsService,
    ) {}

    private settings() {
        const enabled = String(this.config.get('ROBOKASSA_TEST_ENABLED', 'false')) === 'true';
        const merchant = this.config.get<string>('ROBOKASSA_MERCHANT_LOGIN', '').trim();
        const password1 = this.config.get<string>('ROBOKASSA_TEST_PASSWORD1', '');
        const password2 = this.config.get<string>('ROBOKASSA_TEST_PASSWORD2', '');
        if (!enabled || !merchant || !password1 || !password2) {
            throw new ServiceUnavailableException('Тестовая оплата пока не настроена');
        }
        if (password1 === password2) throw new ServiceUnavailableException('Нужны разные тестовые пароли Robokassa');
        return { merchant, password1, password2 };
    }

    private testUser(user: SessionUser) {
        const ids = String(this.config.get('ROBOKASSA_TEST_TEACHER_IDS', '')).split(',').map((id) => id.trim());
        return ids.includes(String(user.id));
    }

    private teacher(user: SessionUser) {
        if (user.role !== 'TEACHER' || !user.emailVerifiedAt) {
            throw new ForbiddenException('Оплата доступна преподавателю с подтверждённой почтой');
        }
    }

    private async tariff(): Promise<TariffSnapshot> {
        const result = await this.tariffs.publicTariffs();
        const publication = result.data as {
            id: number; version: number; content: { individual: Omit<TariffSnapshot, 'publication_id' | 'version'> };
        };
        return { ...publication.content.individual, publication_id: publication.id, version: publication.version };
    }

    async overview(user: SessionUser) {
        this.teacher(user);
        let available = false;
        try { this.settings(); available = this.testUser(user); } catch { /* Disabled until configured. */ }
        const [tariff, trial, orders] = await Promise.all([
            this.tariff(),
            this.prisma.subscriptionTrial.findUnique({ where: { userId: user.id } }),
            this.prisma.subscriptionOrder.findMany({ where: { userId: user.id }, orderBy: { id: 'desc' }, take: 20 }),
        ]);
        return { success: true, data: {
            test_available: available, mode: 'test', tariff,
            trial: trial ? { expires_at: trial.expiresAt, students: trial.students } : null,
            payments: orders.map((order) => ({ id: order.id, amount_rubles: order.amountKopecks / 100,
                status: order.status, is_test: order.isTest, created_at: order.createdAt, paid_at: order.paidAt })),
        } };
    }

    async checkout(user: SessionUser, blocks: number, version: number) {
        this.teacher(user);
        const settings = this.settings();
        if (!this.testUser(user)) throw new ForbiddenException('Аккаунт не включён в тестирование оплаты');
        const tariff = await this.tariff();
        if (version !== tariff.version) throw new BadRequestException('Тариф изменился. Обновите страницу и подтвердите новую цену');
        let calculation;
        try { calculation = calculateOrder(tariff, blocks); }
        catch { throw new BadRequestException('Некорректные параметры тарифа'); }
        const order = await this.prisma.$transaction(async (tx) => {
            await tx.$queryRaw`SELECT pg_advisory_xact_lock(83104, ${user.id}::integer)::text`;
            // Reuse a recent unpaid attempt instead of issuing another invoice on double click.
            const previous = await tx.subscriptionOrder.findFirst({ where: {
                userId: user.id, isTest: true, status: 'pending', extraBlocks: blocks,
                createdAt: { gte: new Date(Date.now() - 15 * 60000) },
            }, orderBy: { id: 'desc' } });
            const snapshot = previous?.tariff as TariffSnapshot | undefined;
            if (previous && snapshot?.version === tariff.version) return previous;
            return tx.subscriptionOrder.create({ data: {
                userId: user.id, amountKopecks: calculation.amount, tariff: tariff as unknown as Prisma.InputJsonValue,
                extraBlocks: blocks, isTest: true,
            } });
        });
        const outSum = (order.amountKopecks / 100).toFixed(2);
        return { success: true, data: { action: 'https://auth.robokassa.ru/Merchant/Index.aspx', fields: {
            MerchantLogin: settings.merchant, OutSum: outSum, InvId: String(order.id), IsTest: '1',
            Description: `ТЕСТ GoStudy: ${tariff.title}, 30 дней`, Culture: 'ru', Encoding: 'utf-8', Email: user.email,
            SignatureValue: signature([settings.merchant, outSum, String(order.id)], settings.password1),
        } } };
    }

    async result(input: Record<string, unknown>): Promise<string> {
        const settings = this.settings();
        if (!verifyResult(input, settings.password2)) throw new BadRequestException('Некорректная подпись платежа');
        const id = Number(input.InvId);
        if (!Number.isSafeInteger(id) || id > 2147483647) throw new BadRequestException('Некорректный номер счёта');
        let amount: number;
        try { amount = kopecks(input.OutSum as string); }
        catch { throw new BadRequestException('Некорректная сумма'); }
        await this.prisma.$transaction(async (tx) => {
            // Serialize callbacks per order, then per user for two different concurrent invoices.
            await tx.$queryRaw`SELECT pg_advisory_xact_lock(83105, ${id}::integer)::text`;
            const order = await tx.subscriptionOrder.findUnique({ where: { id } });
            if (!order) throw new NotFoundException('Счёт не найден');
            if (!order.isTest || order.amountKopecks !== amount) throw new BadRequestException('Параметры платежа не совпадают');
            if (order.status === 'paid') return;
            await tx.$queryRaw`SELECT pg_advisory_xact_lock(83104, ${order.userId}::integer)::text`;
            const trial = await tx.subscriptionTrial.findUnique({ where: { userId: order.userId } });
            const tariff = order.tariff as unknown as TariffSnapshot;
            const calculation = calculateOrder(tariff, order.extraBlocks);
            if (calculation.amount !== amount) throw new BadRequestException('Снимок тарифа не совпадает');
            const now = new Date();
            const data = { expiresAt: nextExpiry(trial?.expiresAt ?? null, now), students: calculation.students };
            await tx.subscriptionTrial.upsert({ where: { userId: order.userId },
                create: { userId: order.userId, ...data }, update: data });
            await tx.subscriptionOrder.update({ where: { id }, data: { status: 'paid', paidAt: now } });
        });
        return `OK${id}`;
    }
}
