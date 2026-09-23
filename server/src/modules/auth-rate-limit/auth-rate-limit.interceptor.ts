import {
    CallHandler,
    ExecutionContext,
    HttpException,
    HttpStatus,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import {
    AUTH_RATE_LIMIT_SCOPE,
    type AuthRateLimitScope,
} from './auth-rate-limit.policy';
import { AuthRateLimitService } from './auth-rate-limit.service';

@Injectable()
export class AuthRateLimitInterceptor implements NestInterceptor {
    constructor(
        private readonly reflector: Reflector,
        private readonly rateLimit: AuthRateLimitService,
    ) {}

    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<unknown> {
        const scope = this.reflector.getAllAndOverride<AuthRateLimitScope>(
            AUTH_RATE_LIMIT_SCOPE,
            [context.getHandler(), context.getClass()],
        );

        if (!scope) return next.handle();

        const http = context.switchToHttp();
        const request = http.getRequest<Request>();
        const response = http.getResponse<Response>();
        const decision = this.rateLimit.consume(scope, request);

        if (!decision.allowed) {
            response.setHeader('Retry-After', decision.retryAfterSeconds);
            throw new HttpException({
                message: 'Слишком много запросов. Повторите попытку позже.',
                status: 'rate_limited',
                retry_after_seconds: decision.retryAfterSeconds,
            }, HttpStatus.TOO_MANY_REQUESTS);
        }

        return next.handle().pipe(tap({
            next: () => this.rateLimit.registerSuccess(scope, decision),
        }));
    }
}
