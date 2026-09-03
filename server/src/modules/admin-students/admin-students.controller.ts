import {
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';

import { AdminAccessGuard } from '../auth/admin-access.guard';
import {
    type AuthenticatedRequest,
    SessionAuthGuard,
} from '../auth/session-auth.guard';
import { AdminStudentsService } from './admin-students.service';
import { ListAdminStudentsQueryDto } from './dto/list-admin-students-query.dto';

@Controller('admin/students')
@UseGuards(SessionAuthGuard, AdminAccessGuard)
export class AdminStudentsController {
    constructor(private readonly students: AdminStudentsService) {}

    @Get()
    list(
        @Req() request: AuthenticatedRequest,
        @Query() query: ListAdminStudentsQueryDto,
    ): Promise<Record<string, unknown>> {
        return this.students.list(request.authenticatedUser, query);
    }

    @Get(':id')
    show(
        @Req() request: AuthenticatedRequest,
        @Param('id', ParseIntPipe) studentId: number,
    ): Promise<Record<string, unknown>> {
        return this.students.show(request.authenticatedUser, studentId);
    }
}
