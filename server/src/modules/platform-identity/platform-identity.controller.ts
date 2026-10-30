import { Body, Controller, Get, Header, Put, Req, UseGuards } from '@nestjs/common';
import { getRequestMetadata } from '../../common/http/request-metadata';
import { AdminAccessGuard } from '../auth/admin-access.guard';
import { SessionAuthGuard, type AuthenticatedRequest } from '../auth/session-auth.guard';
import { PlatformIdentityDto } from './platform-identity.dto';
import { PlatformIdentityService } from './platform-identity.service';

@Controller('platform-identity')
export class PlatformIdentityController {
    constructor(private readonly identity: PlatformIdentityService) {}
    @Get() @Header('Cache-Control', 'no-store')
    read() { return this.identity.read(); }
}

@Controller('admin/platform-identity')
@UseGuards(SessionAuthGuard, AdminAccessGuard)
export class AdminPlatformIdentityController {
    constructor(private readonly identity: PlatformIdentityService) {}
    @Get() @Header('Cache-Control', 'no-store')
    read() { return this.identity.read(); }
    @Put()
    save(@Req() request: AuthenticatedRequest, @Body() body: PlatformIdentityDto) {
        return this.identity.save(request.authenticatedUser, body, getRequestMetadata(request));
    }
}
