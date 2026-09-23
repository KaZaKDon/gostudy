import { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it } from 'vitest';

import { InMemoryAuthRateLimitStore } from './auth-rate-limit.store';

describe('InMemoryAuthRateLimitStore', () => {
    let store: InMemoryAuthRateLimitStore | null = null;

    afterEach(() => {
        store?.onModuleDestroy();
        store = null;
    });

    it('blocks after the configured number of requests until reset time', () => {
        store = new InMemoryAuthRateLimitStore(new ConfigService({}));

        expect(store.consume('login:key', 2, 60_000, 1_000).allowed)
            .toBe(true);
        expect(store.consume('login:key', 2, 60_000, 2_000).allowed)
            .toBe(true);
        expect(store.consume('login:key', 2, 60_000, 3_000)).toEqual({
            allowed: false,
            retryAfterMs: 58_000,
        });
        expect(store.consume('login:key', 2, 60_000, 61_000).allowed)
            .toBe(true);
    });

    it('removes a bucket explicitly', () => {
        store = new InMemoryAuthRateLimitStore(new ConfigService({}));

        expect(store.consume('login:key', 1, 60_000, 1_000).allowed)
            .toBe(true);
        expect(store.consume('login:key', 1, 60_000, 2_000).allowed)
            .toBe(false);
        store.delete('login:key');
        expect(store.consume('login:key', 1, 60_000, 3_000).allowed)
            .toBe(true);
    });
});
