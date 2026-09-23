import type { Request } from 'express';

export type RequestMetadata = {
    ipAddress: string | null;
    userAgent: string | null;
};

export function getRequestIpAddress(request: Request): string | null {
    return (request.ip || request.socket.remoteAddress || '').trim() || null;
}

export function getRequestMetadata(request: Request): RequestMetadata {
    return {
        ipAddress: getRequestIpAddress(request),
        userAgent: request.get('user-agent')?.trim() || null,
    };
}
