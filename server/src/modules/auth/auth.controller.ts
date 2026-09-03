import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    Query,
    Req,
} from '@nestjs/common';
import type { Request } from 'express';

import { getRequestMetadata } from '../../common/http/request-metadata';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('register')
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
    async verifyEmail(
        @Query('token') token: string,
    ): Promise<Record<string, unknown>> {
        return this.authService.verifyEmail(token);
    }

    @Post('resend-verification')
    @HttpCode(HttpStatus.OK)
    async resendVerification(
        @Body() input: ResendVerificationDto,
    ): Promise<Record<string, unknown>> {
        return this.authService.resendVerification(input);
    }
}
