import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { Equals, IsInt, Max, Min } from 'class-validator';
import { type AuthenticatedRequest, SessionAuthGuard } from '../auth/session-auth.guard';
import { SubscriptionsService } from './subscriptions.service';

export class TestCheckoutDto {
    @IsInt() @Min(0) @Max(100) extra_blocks!: number;
    @IsInt() @Min(1) tariff_version!: number;
    @Equals(true) test_acknowledged!: boolean;
}

@Controller('subscriptions')
@UseGuards(SessionAuthGuard)
export class SubscriptionsController {
    constructor(private readonly subscriptions: SubscriptionsService) {}

    @Get('me')
    overview(@Req() request: AuthenticatedRequest) {
        return this.subscriptions.overview(request.authenticatedUser);
    }

    @Post('test-checkout') @HttpCode(200)
    checkout(@Req() request: AuthenticatedRequest, @Body() body: TestCheckoutDto) {
        return this.subscriptions.checkout(request.authenticatedUser, body.extra_blocks, body.tariff_version);
    }
}
