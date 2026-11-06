import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import { liveCredentials } from './robokassa-live-settings';
import { RobokassaFiscalClient } from './robokassa-fiscal.client';
import { finalReceipt, finalReceiptId, type LiveDetails } from './subscription-receipt';

export function fiscalOutcome(response: Record<string, unknown>): 'registered' | 'review' | 'pending' {
    if (String(response.Code) !== '0') return 'pending';
    const statuses = Array.isArray(response.Statuses) ? response.Statuses as Record<string, unknown>[] : [];
    if (statuses.some((s) => s?.Code === 'Fail' || s?.Code === 'NotProvided')) return 'review';
    if (statuses.length && statuses.every((s) => s?.Code === 'Done')) return 'registered';
    return 'pending';
}

@Injectable()
export class SubscriptionReceiptWorker implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(SubscriptionReceiptWorker.name);
    private timer?: ReturnType<typeof setTimeout>;
    private stopping = false;
    private running?: Promise<void>;
    constructor(private readonly prisma: PrismaService, private readonly config: ConfigService,
        private readonly gateway: RobokassaFiscalClient) {}
    onModuleInit() {
        if (this.config.get('ROBOKASSA_FISCAL_WORKER_ENABLED', 'false') === 'true') this.schedule(1000);
    }
    private schedule(ms: number) {
        if (this.stopping) return;
        this.timer = setTimeout(() => {
            this.running = this.tick().catch(() => { this.logger.error('Fiscal worker failed; inspect pending receipts'); })
                .finally(() => this.schedule(60000));
        }, ms);
        this.timer.unref();
    }
    async onModuleDestroy() {
        this.stopping = true;
        if (this.timer) clearTimeout(this.timer);
        await this.running;
    }
    async tick() {
        if (this.config.get('ROBOKASSA_FISCAL_WORKER_ENABLED', 'false') !== 'true') return;
        const credentials = liveCredentials(this.config);
        // Up to 20 jobs per tick, bounded external request time; no overlapping local ticks.
        for (let n = 0; n < 20 && !this.stopping; n++) {
            const now = new Date();
            const token = randomUUID();
            const job = await this.prisma.$transaction(async (tx) => {
                await tx.$queryRaw`SELECT pg_advisory_xact_lock(83106, 0)::text`;
                const candidate = await tx.subscriptionReceiptJob.findFirst({ where: {
                    state: { in: ['scheduled', 'submitted'] }, dueAt: { lte: now }, nextAttemptAt: { lte: now },
                    OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }],
                }, include: { order: true }, orderBy: { nextAttemptAt: 'asc' } });
                if (!candidate) return null;
                await tx.subscriptionReceiptJob.update({ where: { id: candidate.id }, data: {
                    leaseToken: token, leaseUntil: new Date(now.getTime() + 120000), attempts: { increment: 1 },
                } });
                return candidate;
            });
            if (!job) return;
            const finish = async (data: Prisma.SubscriptionReceiptJobUpdateManyMutationInput) => {
                await this.prisma.subscriptionReceiptJob.updateMany({ where: { id: job.id, leaseToken: token }, data: {
                    ...data, leaseUntil: null, leaseToken: null,
                    nextAttemptAt: new Date(Date.now() + 5 * 60000),
                } });
            };
            const details = job.order.liveDetails as unknown as LiveDetails | null;
            if (job.order.isTest || job.order.status !== 'paid' || !details || details.merchant !== credentials.merchant) {
                await finish({ state: 'review', lastCode: 'snapshot_mismatch' });
                this.logger.error(`Receipt job ${job.id} requires review`);
                continue;
            }
            if (job.state === 'scheduled') {
                let payload;
                try { payload = finalReceipt(job.id, job.orderId, job.order.amountKopecks, details); }
                catch { await finish({ state: 'review', lastCode: 'invalid_receipt' }); continue; }
                // A crash from here onward may mean Attach succeeded. Never blindly Attach again.
                const claimed = await this.prisma.subscriptionReceiptJob.updateMany({
                    where: { id: job.id, state: 'scheduled', leaseToken: token },
                    data: { state: 'submitted', submittedAt: new Date(), lastCode: 'dispatch_started' },
                });
                if (!claimed.count) continue;
                try {
                    const answer = await this.gateway.send('Attach', payload, credentials.password1);
                    const code = String(answer.ResultCode ?? 'unknown');
                    if (['0', '1', '2'].includes(code)) await finish({ lastCode: `attach_${code}` });
                    else {
                        await finish({ state: 'review', lastCode: /^\d{1,8}$/.test(code) ? `attach_${code}` : 'attach_invalid' });
                        this.logger.error(`Receipt job ${job.id} requires review`);
                    }
                } catch {
                    await finish({ lastCode: 'attach_unknown' });
                    this.logger.warn(`Receipt job ${job.id}: Attach outcome unknown, status check scheduled`);
                }
            } else {
                const expired = !!job.submittedAt && Date.now() - job.submittedAt.getTime() > 24 * 3600000;
                try {
                    const answer = await this.gateway.send('Status', { merchantId: details.merchant, id: finalReceiptId(job.id) }, credentials.password1);
                    const outcome = fiscalOutcome(answer);
                    if (outcome === 'registered') {
                        // Store only fiscal identifiers; the response may contain personal data in other fields.
                        const records = (answer.Statuses as Record<string, unknown>[]).map((s) => ({
                            code: String(s.Code), fn: String(s.FnNumber ?? ''), document: String(s.FiscalDocumentNumber ?? ''),
                            attribute: String(s.FiscalDocumentAttribute ?? ''), date: String(s.FiscalDate ?? ''),
                        }));
                        await finish({ state: 'registered', registeredAt: new Date(), lastCode: 'Done', fiscalData: records });
                    } else if (outcome === 'review' || expired) {
                        await finish({ state: 'review', lastCode: outcome === 'review' ? 'fiscal_failure' : 'status_unresolved_24h' });
                        this.logger.error(`Receipt job ${job.id} requires review`);
                    } else await finish({ lastCode: 'status_pending' });
                } catch {
                    await finish({ ...(expired ? { state: 'review' } : {}), lastCode: 'status_unavailable' });
                    this.logger.error(`Receipt job ${job.id}: status unavailable${expired ? ', review required' : ''}`);
                }
            }
        }
    }
}
