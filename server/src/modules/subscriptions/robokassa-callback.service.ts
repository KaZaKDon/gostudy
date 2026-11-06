import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionsService } from './subscriptions.service';
import { LiveSubscriptionsService } from './live-subscriptions.service';
import { verifyResult } from './robokassa-signature';

@Injectable()
export class RobokassaCallbackService {
    constructor(private readonly config: ConfigService, private readonly test: SubscriptionsService,
        private readonly live: LiveSubscriptionsService) {}
    result(input: Record<string, unknown>) {
        const testPassword = this.config.get<string>('ROBOKASSA_TEST_PASSWORD2', '');
        const livePassword = this.config.get<string>('ROBOKASSA_LIVE_PASSWORD2', '');
        const testMatch = !!testPassword && verifyResult(input, testPassword);
        const liveMatch = !!livePassword && verifyResult(input, livePassword);
        if (testMatch === liveMatch) throw new BadRequestException('Некорректная или неоднозначная подпись платежа');
        return testMatch ? this.test.result(input) : this.live.result(input);
    }
}
