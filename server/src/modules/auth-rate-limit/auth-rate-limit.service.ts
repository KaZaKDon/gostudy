import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { createHash } from 'node:crypto';

import { getRequestIpAddress } from '../../common/http/request-metadata';
import {
    AUTH_RATE_LIMIT_POLICIES,
    type AuthRateLimitScope,
} from './auth-rate-limit.policy';
import {
    AUTH_RATE_LIMIT_STORE,
    type AuthRateLimitStore,
} from './auth-rate-limit.store';

export type AuthRateLimitDecision = {
    allowed: boolean;
    retryAfterSeconds: number;
    identityKey: string | null;
};

@Injectable()
export class AuthRateLimitService {
    private readonly enabled: boolean;

    constructor(
        @Inject(AUTH_RATE_LIMIT_STORE)
        private readonly store: AuthRateLimitStore,
        config: ConfigService,
    ) {
        const configured = config.get('AUTH_RATE_LIMIT_ENABLED', true);
        this.enabled = !['false', '0', 'off', 'no'].includes(
            String(configured).trim().toLowerCase(),
        );
    }

    consume(
        scope: AuthRateLimitScope,
        request: Request,
        now = Date.now(),
    ): AuthRateLimitDecision {
        if (!this.enabled) {
            return {
                allowed: true,
                retryAfterSeconds: 0,
                identityKey: null,
            };
        }

        const policy = AUTH_RATE_LIMIT_POLICIES[scope];
        const ipAddress = getRequestIpAddress(request) || 'unknown';
        const ipDigest = this.digest(ipAddress);
        const ipKey = `auth:${scope}:ip:${ipDigest}`;
        const decisions = [this.store.consume(
            ipKey,
            policy.ipLimit,
            policy.windowMs,
            now,
        )];
        const identity = this.readIdentity(request, scope);
        const identityKey = identity
            ? `auth:${scope}:identity:${this.digest(`${ipAddress}\0${identity}`)}`
            : null;

        if (identityKey) {
            decisions.push(this.store.consume(
                identityKey,
                policy.identityLimit,
                policy.windowMs,
                now,
            ));
        }

        const blocked = decisions.filter((decision) => !decision.allowed);
        return {
            allowed: blocked.length === 0,
            retryAfterSeconds: blocked.length
                ? Math.max(...blocked.map((decision) => (
                    Math.ceil(decision.retryAfterMs / 1000)
                )))
                : 0,
            identityKey,
        };
    }

    registerSuccess(
        scope: AuthRateLimitScope,
        decision: AuthRateLimitDecision,
    ): void {
        if (
            decision.identityKey
            && AUTH_RATE_LIMIT_POLICIES[scope].resetIdentityOnSuccess
        ) {
            this.store.delete(decision.identityKey);
        }
    }

    private readIdentity(
        request: Request,
        scope: AuthRateLimitScope,
    ): string | null {
        const source = AUTH_RATE_LIMIT_POLICIES[scope].identity;
        const container = source.location === 'body'
            ? request.body as Record<string, unknown> | undefined
            : request.query as Record<string, unknown> | undefined;
        const value = container?.[source.field];

        if (typeof value !== 'string') return null;
        const normalized = value.trim();
        if (!normalized) return null;

        return source.normalize === 'email'
            ? normalized.toLowerCase()
            : normalized;
    }

    private digest(value: string): string {
        return createHash('sha256').update(value).digest('hex');
    }
}
