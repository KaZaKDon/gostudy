import {
    HttpException,
    type CallHandler,
    type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { AuthRateLimitInterceptor } from './auth-rate-limit.interceptor';
import { AuthRateLimitService } from './auth-rate-limit.service';

function context(response: Pick<Response, 'setHeader'>): ExecutionContext {
    return {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: vi.fn().mockReturnValue({
            getRequest: () => ({}) as Request,
            getResponse: () => response,
        }),
    } as unknown as ExecutionContext;
}

describe('AuthRateLimitInterceptor', () => {
    it('returns 429 and Retry-After when a policy rejects the request', () => {
        const response = { setHeader: vi.fn() };
        const reflector = {
            getAllAndOverride: vi.fn().mockReturnValue('login'),
        } as unknown as Reflector;
        const rateLimit = {
            consume: vi.fn().mockReturnValue({
                allowed: false,
                retryAfterSeconds: 42,
                identityKey: 'identity',
            }),
        } as unknown as AuthRateLimitService;
        const interceptor = new AuthRateLimitInterceptor(
            reflector,
            rateLimit,
        );

        let thrown: unknown;
        try {
            interceptor.intercept(
                context(response),
                { handle: () => of({}) } as CallHandler,
            );
        } catch (error) {
            thrown = error;
        }

        expect(thrown).toBeInstanceOf(HttpException);
        expect((thrown as HttpException).getStatus()).toBe(429);
        expect((thrown as HttpException).getResponse()).toMatchObject({
            status: 'rate_limited',
            retry_after_seconds: 42,
        });
        expect(response.setHeader).toHaveBeenCalledWith('Retry-After', 42);
    });

    it('registers success only after the protected handler succeeds', async () => {
        const response = { setHeader: vi.fn() };
        const decision = {
            allowed: true,
            retryAfterSeconds: 0,
            identityKey: 'identity',
        };
        const reflector = {
            getAllAndOverride: vi.fn().mockReturnValue('login'),
        } as unknown as Reflector;
        const rateLimit = {
            consume: vi.fn().mockReturnValue(decision),
            registerSuccess: vi.fn(),
        } as unknown as AuthRateLimitService;
        const interceptor = new AuthRateLimitInterceptor(
            reflector,
            rateLimit,
        );

        await expect(firstValueFrom(interceptor.intercept(
            context(response),
            { handle: () => of({ success: true }) } as CallHandler,
        ))).resolves.toEqual({ success: true });
        expect(rateLimit.registerSuccess).toHaveBeenCalledWith(
            'login',
            decision,
        );
    });
});
