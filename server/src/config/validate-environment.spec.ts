import { describe, expect, it } from 'vitest';

import { validateEnvironment } from './validate-environment';

describe('validateEnvironment', () => {
    it('normalizes proxy and rate limit settings', () => {
        expect(validateEnvironment({
            DATABASE_URL: 'postgresql://localhost/gostudy',
            TRUST_PROXY_HOPS: '1',
            AUTH_RATE_LIMIT_ENABLED: 'false',
            AUTH_RATE_LIMIT_MAX_BUCKETS: '25000',
        })).toMatchObject({
            TRUST_PROXY_HOPS: 1,
            AUTH_RATE_LIMIT_ENABLED: false,
            AUTH_RATE_LIMIT_MAX_BUCKETS: 25_000,
        });
    });

    it('rejects an unsafe or accidental trust proxy value', () => {
        expect(() => validateEnvironment({
            DATABASE_URL: 'postgresql://localhost/gostudy',
            TRUST_PROXY_HOPS: 'all',
        })).toThrow('TRUST_PROXY_HOPS');
    });

    it('rejects an ambiguous rate limit switch', () => {
        expect(() => validateEnvironment({
            DATABASE_URL: 'postgresql://localhost/gostudy',
            AUTH_RATE_LIMIT_ENABLED: 'sometimes',
        })).toThrow('AUTH_RATE_LIMIT_ENABLED');
    });
});
