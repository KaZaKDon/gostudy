import { Module } from '@nestjs/common';

import { AuthRateLimitInterceptor } from './auth-rate-limit.interceptor';
import { AuthRateLimitService } from './auth-rate-limit.service';
import {
    AUTH_RATE_LIMIT_STORE,
    InMemoryAuthRateLimitStore,
} from './auth-rate-limit.store';

@Module({
    providers: [
        InMemoryAuthRateLimitStore,
        {
            provide: AUTH_RATE_LIMIT_STORE,
            useExisting: InMemoryAuthRateLimitStore,
        },
        AuthRateLimitService,
        AuthRateLimitInterceptor,
    ],
    exports: [AuthRateLimitInterceptor, AuthRateLimitService],
})
export class AuthRateLimitModule {}
