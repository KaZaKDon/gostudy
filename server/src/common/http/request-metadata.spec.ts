import type { Request } from 'express';
import { describe, expect, it, vi } from 'vitest';

import {
    getRequestIpAddress,
    getRequestMetadata,
} from './request-metadata';

describe('request metadata', () => {
    it('uses the IP already resolved by Express instead of a raw forwarded header', () => {
        const request = {
            ip: '127.0.0.1',
            headers: { 'x-forwarded-for': '198.51.100.50' },
            socket: { remoteAddress: '127.0.0.1' },
            get: vi.fn().mockReturnValue('Vitest'),
        } as unknown as Request;

        expect(getRequestMetadata(request)).toEqual({
            ipAddress: '127.0.0.1',
            userAgent: 'Vitest',
        });
    });

    it('falls back to the socket address when Express has no IP value', () => {
        const request = {
            ip: '',
            socket: { remoteAddress: '203.0.113.20' },
        } as unknown as Request;

        expect(getRequestIpAddress(request)).toBe('203.0.113.20');
    });
});
