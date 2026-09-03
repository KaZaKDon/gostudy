import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';

import { getRequestMetadata } from '../../common/http/request-metadata';
import { AdminAccessGuard } from '../auth/admin-access.guard';
import {
    type AuthenticatedRequest,
    SessionAuthGuard,
} from '../auth/session-auth.guard';
import { AdminAccountsService } from './admin-accounts.service';
import { ListAdminAccountsQueryDto } from './dto/list-admin-accounts-query.dto';
import { UpdateAdminAccountRoleDto } from './dto/update-admin-account-role.dto';
import { UpdateAdminAccountStatusDto } from './dto/update-admin-account-status.dto';

@Controller('admin/accounts')
@UseGuards(SessionAuthGuard, AdminAccessGuard)
export class AdminAccountsController {
    constructor(
        private readonly accounts: AdminAccountsService,
    ) {}

    @Get()
    async list(
        @Req() request: AuthenticatedRequest,
        @Query() query: ListAdminAccountsQueryDto,
    ): Promise<Record<string, unknown>> {
        return this.accounts.list(request.authenticatedUser, query);
    }

    @Get(':id')
    async show(
        @Req() request: AuthenticatedRequest,
        @Param('id', ParseIntPipe) userId: number,
    ): Promise<Record<string, unknown>> {
        return this.accounts.show(request.authenticatedUser, userId);
    }

    @Patch(':id/status')
    async updateStatus(
        @Req() request: AuthenticatedRequest,
        @Param('id', ParseIntPipe) userId: number,
        @Body() input: UpdateAdminAccountStatusDto,
    ): Promise<Record<string, unknown>> {
        return this.accounts.updateStatus(
            request.authenticatedUser,
            userId,
            input,
            getRequestMetadata(request),
        );
    }

    @Patch(':id/role')
    async updateRole(
        @Req() request: AuthenticatedRequest,
        @Param('id', ParseIntPipe) userId: number,
        @Body() input: UpdateAdminAccountRoleDto,
    ): Promise<Record<string, unknown>> {
        return this.accounts.updateRole(
            request.authenticatedUser,
            userId,
            input,
            getRequestMetadata(request),
        );
    }
}
