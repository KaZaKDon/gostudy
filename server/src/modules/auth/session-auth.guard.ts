import {
    CanActivate,
    ExecutionContext,
    Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

import { SessionAuthService } from './session-auth.service';
import type { SessionUser } from './session-user';
import { getSessionToken } from './session-token';

export type AuthenticatedRequest = Request & {
    authenticatedUser: SessionUser;
};

@Injectable()
export class SessionAuthGuard implements CanActivate {
    constructor(private readonly sessionAuth: SessionAuthService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

        request.authenticatedUser = await this.sessionAuth.authenticate(
            getSessionToken(request),
        );

        return true;
    }
}
