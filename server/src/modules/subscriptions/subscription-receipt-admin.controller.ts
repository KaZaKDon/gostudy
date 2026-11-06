import { BadRequestException, Body, Controller, ForbiddenException, Get, Header, HttpCode, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { IsBoolean, IsString, MaxLength, MinLength } from 'class-validator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { getRequestMetadata } from '../../common/http/request-metadata';
import { SessionAuthGuard, type AuthenticatedRequest } from '../auth/session-auth.guard';

class ReceiptHoldDto {
    @IsBoolean() hold!: boolean;
    @IsString() @MinLength(5) @MaxLength(500) reason!: string;
}
@Controller('admin/subscription-receipts')
@UseGuards(SessionAuthGuard)
export class SubscriptionReceiptAdminController {
    constructor(private readonly prisma: PrismaService) {}
    private admin(request: AuthenticatedRequest) {
        if (request.authenticatedUser.role !== 'ADMIN') throw new ForbiddenException('Только администратор');
    }
    @Get() @Header('Cache-Control', 'no-store')
    async list(@Req() request: AuthenticatedRequest) {
        this.admin(request);
        return { success: true, data: await this.prisma.subscriptionReceiptJob.findMany({
            where: { state: { not: 'registered' } }, orderBy: { dueAt: 'asc' }, take: 100,
            select: { id: true, orderId: true, state: true, dueAt: true, lastCode: true, submittedAt: true, holdReason: true },
        }) };
    }
    // Hold BEFORE refund/dispute handling. Releasing ambiguous jobs never resends a receipt.
    @Post(':id/hold') @HttpCode(200)
    async hold(@Param('id', ParseIntPipe) id: number, @Body() input: ReceiptHoldDto, @Req() request: AuthenticatedRequest) {
        this.admin(request);
        await this.prisma.$transaction(async (tx) => {
            await tx.$queryRaw`SELECT pg_advisory_xact_lock(83106, 0)::text`;
            const job = await tx.subscriptionReceiptJob.findUnique({ where: { id } });
            if (!job || job.state === 'registered' || (job.leaseUntil && job.leaseUntil > new Date())) {
                throw new BadRequestException('Чек уже обработан, отсутствует или сейчас обрабатывается');
            }
            if (!input.hold && job.state !== 'held') throw new BadRequestException('Чек не приостановлен');
            const state = input.hold ? 'held' : job.submittedAt ? 'submitted' : 'scheduled';
            await tx.subscriptionReceiptJob.update({ where: { id }, data: { state, holdReason: input.reason, nextAttemptAt: new Date() } });
            await tx.adminAuditLog.create({ data: { adminId: request.authenticatedUser.id,
                action: input.hold ? 'subscription_receipt_held' : 'subscription_receipt_released', entityType: 'subscription_receipt', entityId: id,
                oldValue: { state: job.state }, newValue: { state, reason: input.reason }, ...getRequestMetadata(request) } });
        });
        return { success: true };
    }
}
