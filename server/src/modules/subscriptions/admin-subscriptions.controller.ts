import { Controller, Get, Header, Query, Req, UseGuards } from '@nestjs/common';
import { type AuthenticatedRequest, SessionAuthGuard } from '../auth/session-auth.guard';
import { AdminSubscriptionsService } from './admin-subscriptions.service';
import { ListAdminSubscriptionsQueryDto } from './dto/list-admin-subscriptions-query.dto';

@Controller('admin/subscriptions')
@UseGuards(SessionAuthGuard)
export class AdminSubscriptionsController {
    constructor(private readonly subscriptions: AdminSubscriptionsService) {}

    @Get() @Header('Cache-Control', 'no-store')
    list(@Req() request: AuthenticatedRequest, @Query() query: ListAdminSubscriptionsQueryDto) {
        return this.subscriptions.list(request.authenticatedUser, query);
    }
}
