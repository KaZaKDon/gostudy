import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const AUTH_RATE_LIMIT_STORE = Symbol('AUTH_RATE_LIMIT_STORE');

export type RateLimitStoreDecision = {
    allowed: boolean;
    retryAfterMs: number;
};

export interface AuthRateLimitStore {
    consume(
        key: string,
        limit: number,
        windowMs: number,
        now: number,
    ): RateLimitStoreDecision;
    delete(key: string): void;
}

type RateLimitBucket = {
    count: number;
    resetAt: number;
};

@Injectable()
export class InMemoryAuthRateLimitStore
implements AuthRateLimitStore, OnModuleDestroy {
    private readonly buckets = new Map<string, RateLimitBucket>();
    private readonly maxBuckets: number;
    private readonly cleanupTimer: ReturnType<typeof setInterval>;

    constructor(config: ConfigService) {
        const configured = Number(config.get('AUTH_RATE_LIMIT_MAX_BUCKETS'));
        this.maxBuckets = Number.isSafeInteger(configured) && configured >= 1000
            ? configured
            : 50_000;
        this.cleanupTimer = setInterval(
            () => this.cleanupExpired(Date.now()),
            60_000,
        );
        this.cleanupTimer.unref();
    }

    consume(
        key: string,
        limit: number,
        windowMs: number,
        now: number,
    ): RateLimitStoreDecision {
        let bucket = this.buckets.get(key);

        if (!bucket || bucket.resetAt <= now) {
            if (!bucket) this.ensureCapacity(now);
            bucket = { count: 0, resetAt: now + windowMs };
        }

        if (bucket.count >= limit) {
            this.touch(key, bucket);
            return {
                allowed: false,
                retryAfterMs: Math.max(bucket.resetAt - now, 1),
            };
        }

        bucket.count += 1;
        this.touch(key, bucket);
        return {
            allowed: true,
            retryAfterMs: 0,
        };
    }

    delete(key: string): void {
        this.buckets.delete(key);
    }

    onModuleDestroy(): void {
        clearInterval(this.cleanupTimer);
        this.buckets.clear();
    }

    private touch(key: string, bucket: RateLimitBucket): void {
        this.buckets.delete(key);
        this.buckets.set(key, bucket);
    }

    private ensureCapacity(now: number): void {
        if (this.buckets.size < this.maxBuckets) return;
        this.cleanupExpired(now);
        if (this.buckets.size < this.maxBuckets) return;

        const oldestKey = this.buckets.keys().next().value as string | undefined;
        if (oldestKey) this.buckets.delete(oldestKey);
    }

    private cleanupExpired(now: number): void {
        for (const [key, bucket] of this.buckets) {
            if (bucket.resetAt <= now) this.buckets.delete(key);
        }
    }
}
