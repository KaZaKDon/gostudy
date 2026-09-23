import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { afterEach, describe, expect, it } from 'vitest';

import { AuthRateLimitService } from './auth-rate-limit.service';
import { InMemoryAuthRateLimitStore } from './auth-rate-limit.store';

function request(
    ip: string,
    body: Record<string, unknown>,
): Request {
    return {
        ip,
        body,
        query: {},
        socket: { remoteAddress: ip },
    } as unknown as Request;
}

describe('AuthRateLimitService', () => {
    let store: InMemoryAuthRateLimitStore | null = null;

    afterEach(() => {
        store?.onModuleDestroy();
        store = null;
    });

    it('normalizes email and blocks the ninth login for one IP/email pair', () => {
        store = new InMemoryAuthRateLimitStore(new ConfigService({}));
        const service = new AuthRateLimitService(
            store,
            new ConfigService({ AUTH_RATE_LIMIT_ENABLED: true }),
        );
        let decision = service.consume(
            'login',
            request('203.0.113.10', { email: ' User@Example.com ' }),
            1_000,
        );

        for (let attempt = 2; attempt <= 8; attempt += 1) {
            decision = service.consume(
                'login',
                request('203.0.113.10', { email: 'user@example.com' }),
                1_000,
            );
            expect(decision.allowed).toBe(true);
        }

        decision = service.consume(
            'login',
            request('203.0.113.10', { email: 'USER@example.com' }),
            1_000,
        );
        expect(decision.allowed).toBe(false);
        expect(decision.retryAfterSeconds).toBe(900);
    });

    it('does not let one address lock the same account for another address', () => {
        store = new InMemoryAuthRateLimitStore(new ConfigService({}));
        const service = new AuthRateLimitService(
            store,
            new ConfigService({ AUTH_RATE_LIMIT_ENABLED: true }),
        );

        for (let attempt = 1; attempt <= 9; attempt += 1) {
            service.consume(
                'login',
                request('203.0.113.10', { email: 'user@example.com' }),
                1_000,
            );
        }

        expect(service.consume(
            'login',
            request('203.0.113.11', { email: 'user@example.com' }),
            1_000,
        ).allowed).toBe(true);
    });

    it('resets the identity bucket after a successful login', () => {
        store = new InMemoryAuthRateLimitStore(new ConfigService({}));
        const service = new AuthRateLimitService(
            store,
            new ConfigService({ AUTH_RATE_LIMIT_ENABLED: true }),
        );
        let decision = service.consume(
            'login',
            request('203.0.113.10', { email: 'user@example.com' }),
            1_000,
        );

        for (let attempt = 2; attempt <= 8; attempt += 1) {
            decision = service.consume(
                'login',
                request('203.0.113.10', { email: 'user@example.com' }),
                1_000,
            );
        }

        service.registerSuccess('login', decision);
        expect(service.consume(
            'login',
            request('203.0.113.10', { email: 'user@example.com' }),
            1_000,
        ).allowed).toBe(true);
    });

    it('can be disabled for an isolated trusted environment', () => {
        store = new InMemoryAuthRateLimitStore(new ConfigService({}));
        const service = new AuthRateLimitService(
            store,
            new ConfigService({ AUTH_RATE_LIMIT_ENABLED: false }),
        );

        for (let attempt = 1; attempt <= 40; attempt += 1) {
            expect(service.consume(
                'login',
                request('203.0.113.10', { email: 'user@example.com' }),
                1_000,
            ).allowed).toBe(true);
        }
    });
});
