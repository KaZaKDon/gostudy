import { SetMetadata } from '@nestjs/common';

export const AUTH_RATE_LIMIT_SCOPE = 'auth-rate-limit:scope';

export type AuthRateLimitScope =
    | 'login'
    | 'register'
    | 'verify-email'
    | 'resend-verification'
    | 'forgot-password'
    | 'reset-password';

type IdentitySource = {
    location: 'body' | 'query';
    field: string;
    normalize: 'email' | 'token';
};

export type AuthRateLimitPolicy = {
    windowMs: number;
    ipLimit: number;
    identityLimit: number;
    identity: IdentitySource;
    resetIdentityOnSuccess?: boolean;
};

const MINUTE = 60_000;

export const AUTH_RATE_LIMIT_POLICIES: Record<
    AuthRateLimitScope,
    AuthRateLimitPolicy
> = {
    login: {
        windowMs: 15 * MINUTE,
        ipLimit: 30,
        identityLimit: 8,
        identity: { location: 'body', field: 'email', normalize: 'email' },
        resetIdentityOnSuccess: true,
    },
    register: {
        windowMs: 60 * MINUTE,
        ipLimit: 10,
        identityLimit: 3,
        identity: { location: 'body', field: 'email', normalize: 'email' },
    },
    'verify-email': {
        windowMs: 15 * MINUTE,
        ipLimit: 30,
        identityLimit: 10,
        identity: { location: 'query', field: 'token', normalize: 'token' },
        resetIdentityOnSuccess: true,
    },
    'resend-verification': {
        windowMs: 60 * MINUTE,
        ipLimit: 10,
        identityLimit: 3,
        identity: { location: 'body', field: 'email', normalize: 'email' },
    },
    'forgot-password': {
        windowMs: 60 * MINUTE,
        ipLimit: 10,
        identityLimit: 3,
        identity: { location: 'body', field: 'email', normalize: 'email' },
    },
    'reset-password': {
        windowMs: 15 * MINUTE,
        ipLimit: 20,
        identityLimit: 5,
        identity: { location: 'body', field: 'token', normalize: 'token' },
        resetIdentityOnSuccess: true,
    },
};

export const LimitAuthRequests = (scope: AuthRateLimitScope) => (
    SetMetadata(AUTH_RATE_LIMIT_SCOPE, scope)
);
