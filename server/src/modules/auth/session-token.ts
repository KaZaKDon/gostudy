import type { Request } from 'express';

export function getSessionToken(request: Request): string | undefined {
    const headerToken = request.header('X-Auth-Token');
    const authorization = request.header('Authorization');
    const bearerToken = authorization?.startsWith('Bearer ')
        ? authorization.slice(7)
        : undefined;

    return headerToken || bearerToken;
}
