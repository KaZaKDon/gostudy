import { Body, Controller, Get, HttpCode, Post, Req, UseGuards, Header } from '@nestjs/common';
import { Equals, IsInt, Matches, Max, Min } from 'class-validator';
import { getRequestMetadata } from '../../common/http/request-metadata';
import { type AuthenticatedRequest, SessionAuthGuard } from '../auth/session-auth.guard';
import { LiveSubscriptionsService } from './live-subscriptions.service';

export class LiveCheckoutDto {
    @IsInt() @Min(0) @Max(100) extra_blocks!: number;
    @IsInt() @Min(1) tariff_version!: number;
    @Matches(/^[a-f0-9]{64}$/) terms_version!: string;
    @Equals(true) terms_accepted!: boolean;
}
@Controller('subscriptions')
@UseGuards(SessionAuthGuard)
export class LiveSubscriptionsController {
    constructor(private readonly live: LiveSubscriptionsService) {}
    @Get('live') @Header('Cache-Control', 'no-store')
    overview(@Req() request: AuthenticatedRequest) { return this.live.overview(request.authenticatedUser); }
    @Post('checkout') @HttpCode(200) @Header('Cache-Control', 'no-store')
    checkout(@Req() request: AuthenticatedRequest, @Body() body: LiveCheckoutDto) {
        return this.live.checkout(request.authenticatedUser, body.extra_blocks, body.tariff_version,
            body.terms_version, getRequestMetadata(request));
    }
}
