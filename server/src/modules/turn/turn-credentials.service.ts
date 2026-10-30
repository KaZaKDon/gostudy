import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';

const DEFAULT_TTL_SECONDS = 7200;
const STUN_SERVER = { urls: 'stun:stun.l.google.com:19302' };
const TURN_URL = /^turns?:(?:\[[0-9a-f:.]+\]|[a-z0-9.-]+)(?::([1-9][0-9]{0,4}))?(?:\?transport=(?:udp|tcp))?$/i;

function validTurnUrl(url: string): boolean {
    const match = TURN_URL.exec(url);
    return Boolean(match && (!match[1] || Number(match[1]) <= 65535));
}

@Injectable()
export class TurnCredentialsService {
    constructor(private readonly config: ConfigService) {}

    forUser(userId: number) {
        const urls = [...new Set(String(this.config.get('WEBRTC_TURN_URLS') || '')
            .split(/[\s,]+/).filter(Boolean))];
        const secret = String(this.config.get('WEBRTC_TURN_AUTH_SECRET') || '');
        const ttl = Number(this.config.get('WEBRTC_TURN_TTL_SECONDS')
            ?? DEFAULT_TTL_SECONDS);

        if (!urls.length && !secret && this.config.get('NODE_ENV') !== 'production') {
            return { ice_servers: [STUN_SERVER], expires_at: null };
        }

        if (
            !Number.isSafeInteger(userId) || userId < 1
            || !urls.length || urls.length > 8
            || urls.some((url) => !validTurnUrl(url))
            || secret.length < 32
            || !Number.isSafeInteger(ttl) || ttl < 300 || ttl > 86400
        ) {
            throw new ServiceUnavailableException('Видеосвязь временно недоступна');
        }

        const expires = Math.floor(Date.now() / 1000) + ttl;
        const username = String(expires) + ':' + String(userId);
        const credential = createHmac('sha1', secret)
            .update(username).digest('base64');

        return {
            ice_servers: [STUN_SERVER, { urls, username, credential }],
            expires_at: new Date(expires * 1000).toISOString(),
        };
    }
}
