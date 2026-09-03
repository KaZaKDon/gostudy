import type { Request } from 'express';

export type RequestMetadata = {
    ipAddress: string | null;
    userAgent: string | null;
};

export function getRequestMetadata(request: Request): RequestMetadata {
    const forwardedFor = request.headers['x-forwarded-for'];
    const forwardedIp = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor?.split(',')[0];

    return {
        ipAddress: (forwardedIp || request.ip || '').trim() || null,
        userAgent: request.get('user-agent')?.trim() || null,
    };
}
