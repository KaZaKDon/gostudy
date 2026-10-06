import { describe, expect, it } from 'vitest';

import { validateEnvironment } from './validate-environment';

describe('validateEnvironment', () => {
    it('normalizes proxy and rate limit settings', () => {
        expect(validateEnvironment({
            DATABASE_URL: 'postgresql://localhost/gostudy',
            TRUST_PROXY_HOPS: '1',
            AUTH_RATE_LIMIT_ENABLED: 'false',
            AUTH_RATE_LIMIT_MAX_BUCKETS: '25000',
            LESSON_SETTLEMENTS_ENABLED: 'false',
            MATERIAL_MARKETPLACE_SALES_ENABLED: 'false',
        })).toMatchObject({
            TRUST_PROXY_HOPS: 1,
            AUTH_RATE_LIMIT_ENABLED: false,
            AUTH_RATE_LIMIT_MAX_BUCKETS: 25_000,
            LESSON_SETTLEMENTS_ENABLED: false,
            MATERIAL_MARKETPLACE_SALES_ENABLED: false,
            MAIL_FROM: 'noreply@gostudyonline.ru',
            SUPPORT_EMAIL: 'support@gostudyonline.ru',
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

    it('rejects an ambiguous lesson settlement switch', () => {
        expect(() => validateEnvironment({
            DATABASE_URL: 'postgresql://localhost/gostudy',
            LESSON_SETTLEMENTS_ENABLED: 'sometimes',
        })).toThrow('LESSON_SETTLEMENTS_ENABLED');
    });

    it('rejects an ambiguous material marketplace switch', () => {
        expect(() => validateEnvironment({
            DATABASE_URL: 'postgresql://localhost/gostudy',
            MATERIAL_MARKETPLACE_SALES_ENABLED: 'sometimes',
        })).toThrow('MATERIAL_MARKETPLACE_SALES_ENABLED');
    });

    it('rejects invalid platform email addresses', () => {
        expect(() => validateEnvironment({
            DATABASE_URL: 'postgresql://localhost/gostudy',
            MAIL_FROM: 'not-an-email',
        })).toThrow('MAIL_FROM');

        expect(() => validateEnvironment({
            DATABASE_URL: 'postgresql://localhost/gostudy',
            SUPPORT_EMAIL: 'support',
        })).toThrow('SUPPORT_EMAIL');
    });
});
