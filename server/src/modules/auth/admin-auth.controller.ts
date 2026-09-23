import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    Req,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';

import { getRequestMetadata } from '../../common/http/request-metadata';
import { AuthRateLimitInterceptor } from '../auth-rate-limit/auth-rate-limit.interceptor';
import { LimitAuthRequests } from '../auth-rate-limit/auth-rate-limit.policy';
import { AdminAccessGuard } from './admin-access.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import {
    type AuthenticatedRequest,
    SessionAuthGuard,
} from './session-auth.guard';
import { SessionAuthService } from './session-auth.service';
import { toPublicUser } from './session-user';
import { getSessionToken } from './session-token';

@Controller('admin/auth')
@UseInterceptors(AuthRateLimitInterceptor)
export class AdminAuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly sessionAuth: SessionAuthService,
    ) {}

    @Post('login')
    @LimitAuthRequests('login')
    @HttpCode(HttpStatus.OK)
    async login(
        @Body() input: LoginDto,
        @Req() request: Request,
    ): Promise<Record<string, unknown>> {
        return this.authService.adminLogin(
            input,
            getRequestMetadata(request),
        );
    }

    @Get('me')
    @UseGuards(SessionAuthGuard, AdminAccessGuard)
    async me(
        @Req() request: AuthenticatedRequest,
    ): Promise<Record<string, unknown>> {
        return {
            success: true,
            data: {
                user: toPublicUser(request.authenticatedUser),
            },
        };
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @UseGuards(SessionAuthGuard, AdminAccessGuard)
    async logout(
        @Req() request: AuthenticatedRequest,
    ): Promise<Record<string, unknown>> {
        await this.sessionAuth.revoke(getSessionToken(request));

        return {
            success: true,
            message: 'Выход выполнен',
        };
    }
}
