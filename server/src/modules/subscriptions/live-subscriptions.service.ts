import { BadRequestException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RequestMetadata } from '../../common/http/request-metadata';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import type { SessionUser } from '../auth/session-user';
import { TariffsService } from '../tariffs/tariffs.service';
import { liveCheckoutEnabled, liveCredentials } from './robokassa-live-settings';
import { kopecks, signature, verifyResult } from './robokassa-signature';
import { calculateOrder, nextExpiry, type TariffSnapshot } from './subscription-policy';
import { prepaymentReceipt, type LiveDetails } from './subscription-receipt';
import { SubscriptionTermsService } from './subscription-terms.service';

@Injectable()
export class LiveSubscriptionsService {
    constructor(private readonly prisma: PrismaService, private readonly config: ConfigService,
        private readonly tariffs: TariffsService, private readonly terms: SubscriptionTermsService) {}

    private teacher(user: SessionUser) {
        if (user.role !== 'TEACHER' || !user.emailVerifiedAt) throw new ForbiddenException('Нужен подтверждённый аккаунт преподавателя');
    }
    private async tariff(): Promise<TariffSnapshot> {
        const result = await this.tariffs.publicTariffs();
        const p = result.data as { id: number; version: number; content: { individual: TariffSnapshot } };
        return { ...p.content.individual, publication_id: p.id, version: p.version };
    }
    async overview(user: SessionUser) {
        this.teacher(user);
        let available = liveCheckoutEnabled(this.config, user.id);
        try { liveCredentials(this.config); } catch { available = false; }
        const [tariff, terms, periods, orders] = await Promise.all([
            available ? this.tariff() : null, available ? this.terms.snapshot() : null,
            this.prisma.subscriptionPeriod.findMany({ where: { userId: user.id, endsAt: { gt: new Date() } }, orderBy: { startsAt: 'asc' } }),
            this.prisma.subscriptionOrder.findMany({ where: { userId: user.id, isTest: false },
                include: { receiptJob: true }, orderBy: { id: 'desc' }, take: 20 }),
        ]);
        return { success: true, data: { available, tariff, terms_version: terms?.version,
            periods: periods.map((p) => ({ starts_at: p.startsAt, ends_at: p.endsAt, students: p.students })),
            payments: orders.map((o) => ({ id: o.id, amount_rubles: o.amountKopecks / 100, status: o.status,
                receipt_status: o.receiptJob?.state ?? null, paid_at: o.paidAt })),
        } };
    }
    async checkout(user: SessionUser, blocks: number, version: number, termsVersion: string, metadata: RequestMetadata) {
        this.teacher(user);
        if (!liveCheckoutEnabled(this.config, user.id)) throw new ServiceUnavailableException('Реальная оплата пока недоступна');
        const settings = liveCredentials(this.config);
        const [tariff, terms] = await Promise.all([this.tariff(), this.terms.snapshot()]);
        if (tariff.version !== version || terms.version !== termsVersion) {
            throw new BadRequestException('Цена или условия изменились. Обновите страницу и подтвердите их заново');
        }
        let calculation;
        try { calculation = calculateOrder(tariff, blocks); }
        catch { throw new BadRequestException('Некорректные параметры тарифа'); }
        const receipt = prepaymentReceipt(tariff, blocks);
        const receiptEncoded = encodeURIComponent(JSON.stringify(receipt));
        const details: LiveDetails = { schema: 1, merchant: settings.merchant, email: user.email,
            siteUrl: 'https://gostudyonline.ru/', receipt, receiptEncoded,
            consent: { ...terms, acceptedAt: new Date().toISOString(), ipAddress: metadata.ipAddress,
                userAgent: metadata.userAgent?.slice(0, 1024) ?? null } };
        const order = await this.prisma.$transaction(async (tx) => {
            await tx.$queryRaw`SELECT pg_advisory_xact_lock(83104, ${user.id}::integer)::text`;
            const previous = await tx.subscriptionOrder.findFirst({ where: { userId: user.id, isTest: false,
                status: 'pending', extraBlocks: blocks, createdAt: { gte: new Date(Date.now() - 15 * 60000) } }, orderBy: { id: 'desc' } });
            const old = previous?.liveDetails as unknown as LiveDetails | undefined;
            if (previous && previous.amountKopecks === calculation.amount
                && (previous.tariff as unknown as TariffSnapshot).version === tariff.version
                && old?.consent.version === terms.version && old.email === user.email
                && old.receiptEncoded === receiptEncoded && old.merchant === settings.merchant) return previous;
            return tx.subscriptionOrder.create({ data: { userId: user.id, isTest: false, extraBlocks: blocks,
                amountKopecks: calculation.amount, tariff: tariff as unknown as Prisma.InputJsonValue,
                liveDetails: details as unknown as Prisma.InputJsonValue } });
        });
        const saved = order.liveDetails as unknown as LiveDetails;
        const outSum = (order.amountKopecks / 100).toFixed(2);
        return { success: true, data: { action: 'https://auth.robokassa.ru/Merchant/Index.aspx', fields: {
            MerchantLogin: saved.merchant, OutSum: outSum, InvId: String(order.id), IsTest: '0',
            Description: saved.receipt.items[0].name, Email: saved.email, Culture: 'ru', Encoding: 'utf-8',
            Receipt: saved.receiptEncoded,
            SignatureValue: signature([saved.merchant, outSum, String(order.id), saved.receiptEncoded], settings.password1),
        } } };
    }
    async result(input: Record<string, unknown>): Promise<string> {
        // Acceptance of an already issued invoice must survive disabling new checkouts.
        const settings = liveCredentials(this.config);
        if (!verifyResult(input, settings.password2)) throw new BadRequestException('Некорректная подпись платежа');
        const id = Number(input.InvId);
        if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) throw new BadRequestException('Некорректный номер счёта');
        let amount: number;
        try { amount = kopecks(input.OutSum as string); } catch { throw new BadRequestException('Некорректная сумма'); }
        await this.prisma.$transaction(async (tx) => {
            await tx.$queryRaw`SELECT pg_advisory_xact_lock(83105, ${id}::integer)::text`;
            const order = await tx.subscriptionOrder.findUnique({ where: { id } });
            if (!order) throw new NotFoundException('Счёт не найден');
            const details = order.liveDetails as unknown as LiveDetails | null;
            if (order.isTest || order.amountKopecks !== amount || details?.schema !== 1 || details.merchant !== settings.merchant) {
                throw new BadRequestException('Параметры платежа не совпадают');
            }
            if (order.status === 'paid') return;
            const tariff = order.tariff as unknown as TariffSnapshot;
            const calculation = calculateOrder(tariff, order.extraBlocks);
            if (calculation.amount !== amount || JSON.stringify(prepaymentReceipt(tariff, order.extraBlocks)) !== JSON.stringify(details.receipt)) {
                throw new BadRequestException('Снимок тарифа или чека не совпадает');
            }
            await tx.$queryRaw`SELECT pg_advisory_xact_lock(83104, ${order.userId}::integer)::text`;
            const previous = await tx.subscriptionPeriod.findFirst({ where: { userId: order.userId }, orderBy: { endsAt: 'desc' } });
            const now = new Date();
            const startsAt = previous && previous.endsAt > now ? previous.endsAt : now;
            const endsAt = nextExpiry(startsAt, now);
            await tx.subscriptionPeriod.create({ data: { orderId: id, userId: order.userId, startsAt, endsAt, students: calculation.students } });
            await tx.subscriptionReceiptJob.create({ data: { orderId: id, dueAt: endsAt, nextAttemptAt: endsAt } });
            await tx.subscriptionOrder.update({ where: { id }, data: { status: 'paid', paidAt: now } });
        });
        return `OK${id}`;
    }
}
