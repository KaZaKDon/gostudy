import { ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

export function liveCredentials(config: ConfigService) {
    const merchant = String(config.get('ROBOKASSA_MERCHANT_LOGIN', '')).trim();
    const password1 = String(config.get('ROBOKASSA_LIVE_PASSWORD1', ''));
    const password2 = String(config.get('ROBOKASSA_LIVE_PASSWORD2', ''));
    const tests = [config.get('ROBOKASSA_TEST_PASSWORD1', ''), config.get('ROBOKASSA_TEST_PASSWORD2', '')];
    if (!merchant || !password1 || !password2 || password1 === password2 || tests.includes(password1) || tests.includes(password2)) {
        throw new ServiceUnavailableException('Настройте отдельные боевые пароли Robokassa');
    }
    return { merchant, password1, password2 };
}

export function liveCheckoutEnabled(config: ConfigService, userId: number): boolean {
    const ids = String(config.get('ROBOKASSA_LIVE_TEACHER_IDS', '')).split(',').map((s) => s.trim());
    return config.get('ROBOKASSA_LIVE_ENABLED', 'false') === 'true'
        && config.get('ROBOKASSA_FISCAL_WORKER_ENABLED', 'false') === 'true'
        && config.get('ROBOKASSA_LIVE_REVIEWED', 'false') === 'true'
        && ids.includes(String(userId));
}
