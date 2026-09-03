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
import { AdminTeachersService } from './admin-teachers.service';
import { ListAdminTeachersQueryDto } from './dto/list-admin-teachers-query.dto';
import { UpdateAdminTeacherVerificationDto } from './dto/update-admin-teacher-verification.dto';
import { UpdateAdminTeacherVisibilityDto } from './dto/update-admin-teacher-visibility.dto';

@Controller('admin/teachers')
@UseGuards(SessionAuthGuard, AdminAccessGuard)
export class AdminTeachersController {
    constructor(private readonly teachers: AdminTeachersService) {}

    @Get()
    list(
        @Req() request: AuthenticatedRequest,
        @Query() query: ListAdminTeachersQueryDto,
    ): Promise<Record<string, unknown>> {
        return this.teachers.list(request.authenticatedUser, query);
    }

    @Get(':id')
    show(
        @Req() request: AuthenticatedRequest,
        @Param('id', ParseIntPipe) teacherId: number,
    ): Promise<Record<string, unknown>> {
        return this.teachers.show(request.authenticatedUser, teacherId);
    }

    @Patch(':id/verification')
    updateVerification(
        @Req() request: AuthenticatedRequest,
        @Param('id', ParseIntPipe) teacherId: number,
        @Body() input: UpdateAdminTeacherVerificationDto,
    ): Promise<Record<string, unknown>> {
        return this.teachers.updateVerification(
            request.authenticatedUser,
            teacherId,
            input,
            getRequestMetadata(request),
        );
    }

    @Patch(':id/visibility')
    updateVisibility(
        @Req() request: AuthenticatedRequest,
        @Param('id', ParseIntPipe) teacherId: number,
        @Body() input: UpdateAdminTeacherVisibilityDto,
    ): Promise<Record<string, unknown>> {
        return this.teachers.updateVisibility(
            request.authenticatedUser,
            teacherId,
            input,
            getRequestMetadata(request),
        );
    }
}
