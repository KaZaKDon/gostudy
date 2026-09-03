import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';

import {
    UserRole,
} from '../../generated/prisma/enums';
import type { AuthenticatedRequest } from './session-auth.guard';

@Injectable()
export class AdminAccessGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp()
            .getRequest<AuthenticatedRequest>();
        const role = request.authenticatedUser?.role;

        if (role !== UserRole.ADMIN && role !== UserRole.MODERATOR) {
            throw new ForbiddenException(
                'Доступ разрешён только администратору или модератору',
            );
        }

        return true;
    }
}
