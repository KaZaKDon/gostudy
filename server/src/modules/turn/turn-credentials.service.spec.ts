import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TurnCredentialsService } from './turn-credentials.service';

const configuration = {
    NODE_ENV: 'production',
    WEBRTC_TURN_URLS: 'turn:turn.example.com:3478?transport=udp,turn:turn.example.com:3478?transport=tcp',
    WEBRTC_TURN_AUTH_SECRET: 'example-shared-turn-secret-0123456789',
    WEBRTC_TURN_TTL_SECONDS: '7200',
};

function service(overrides: Record<string, unknown> = {}) {
    return new TurnCredentialsService(new ConfigService({ ...configuration, ...overrides }));
}

afterEach(() => vi.useRealTimers());

describe('TurnCredentialsService', () => {
    it('signs a timestamp and authenticated user with the Coturn REST reference vector', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-10-24T12:00:00Z'));

        const result = service().forUser(7);

        expect(result).toEqual({
            ice_servers: [
                { urls: 'stun:stun.l.google.com:19302' },
                {
                    urls: [
                        'turn:turn.example.com:3478?transport=udp',
                        'turn:turn.example.com:3478?transport=tcp',
                    ],
                    username: '1792850400:7',
                    credential: 'zC1v5nhjjtvdD4xZLs1wAYnAi80=',
                },
            ],
            expires_at: '2026-10-24T14:00:00.000Z',
        });
        expect(JSON.stringify(result)).not.toContain(configuration.WEBRTC_TURN_AUTH_SECRET);
        expect(service().forUser(9).ice_servers).not.toEqual(result.ice_servers);
    });

    it('allows local STUN development without a shared secret', () => {
        expect(service({
            NODE_ENV: 'development', WEBRTC_TURN_URLS: '', WEBRTC_TURN_AUTH_SECRET: '',
        }).forUser(7)).toEqual({
            ice_servers: [{ urls: 'stun:stun.l.google.com:19302' }], expires_at: null,
        });
    });

    it.each([
        { WEBRTC_TURN_AUTH_SECRET: '' },
        { WEBRTC_TURN_URLS: '' },
        { WEBRTC_TURN_URLS: 'https://user:password@example.com/' },
        { WEBRTC_TURN_URLS: 'turn:example.com:65536' },
        { WEBRTC_TURN_TTL_SECONDS: '0' },
        { WEBRTC_TURN_TTL_SECONDS: '86401' },
        { WEBRTC_TURN_TTL_SECONDS: '600.5' },
    ])('rejects incomplete or invalid configuration without leaking it: %j', (overrides) => {
        expect(() => service(overrides).forUser(7)).toThrow(ServiceUnavailableException);
    });
});
