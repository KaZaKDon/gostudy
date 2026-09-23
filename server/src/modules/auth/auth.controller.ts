import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    Query,
    Req,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';

import { getRequestMetadata } from '../../common/http/request-metadata';
import { AuthRateLimitInterceptor } from '../auth-rate-limit/auth-rate-limit.interceptor';
import { LimitAuthRequests } from '../auth-rate-limit/auth-rate-limit.policy';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SecurityActionDto } from './dto/security-action.dto';
import { PasswordRecoveryService } from './password-recovery.service';
import { getSessionToken } from './session-token';
import { SessionAuthGuard } from './session-auth.guard';
import type { SessionUser } from './session-user';
import { SecurityService } from './security.service';

@Controller('auth')
@UseInterceptors(AuthRateLimitInterceptor)
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly security: SecurityService,
        private readonly passwordRecovery: PasswordRecoveryService,
    ) {}

    @Post('register')
    @LimitAuthRequests('register')
    async register(
        @Body() input: RegisterDto,
        @Req() request: Request,
    ): Promise<Record<string, unknown>> {
        return this.authService.register(
            input,
            getRequestMetadata(request),
        );
    }

    @Post('login')
    @LimitAuthRequests('login')
    @HttpCode(HttpStatus.OK)
    async login(
        @Body() input: LoginDto,
        @Req() request: Request,
    ): Promise<Record<string, unknown>> {
        return this.authService.login(
            input,
            getRequestMetadata(request),
        );
    }

    @Get('verify-email')
    @LimitAuthRequests('verify-email')
    async verifyEmail(
        @Query('token') token: string,
    ): Promise<Record<string, unknown>> {
        return this.authService.verifyEmail(token);
    }

    @Post('resend-verification')
    @LimitAuthRequests('resend-verification')
    @HttpCode(HttpStatus.OK)
    async resendVerification(
        @Body() input: ResendVerificationDto,
    ): Promise<Record<string, unknown>> {
        return this.authService.resendVerification(input);
    }

    @Post('forgot-password')
    @LimitAuthRequests('forgot-password')
    @HttpCode(HttpStatus.OK)
    async forgotPassword(
        @Body() input: ForgotPasswordDto,
    ): Promise<Record<string, unknown>> {
        return this.passwordRecovery.requestReset(input);
    }

    @Post('reset-password')
    @LimitAuthRequests('reset-password')
    @HttpCode(HttpStatus.OK)
    async resetPassword(
        @Body() input: ResetPasswordDto,
    ): Promise<Record<string, unknown>> {
        return this.passwordRecovery.resetPassword(input);
    }

    @Get('security')
    @UseGuards(SessionAuthGuard)
    async securitySettings(
        @CurrentUser() user: SessionUser,
    ): Promise<Record<string, unknown>> {
        return this.security.getActiveSessions(user);
    }

    @Post('security')
    @HttpCode(HttpStatus.OK)
    @UseGuards(SessionAuthGuard)
    async updateSecurity(
        @CurrentUser() user: SessionUser,
        @Body() input: SecurityActionDto,
        @Req() request: Request,
    ): Promise<Record<string, unknown>> {
        return this.security.execute(
            user,
            input,
            getSessionToken(request),
        );
    }
}
