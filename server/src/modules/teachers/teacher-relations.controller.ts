import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import type { SessionUser } from '../auth/session-user';
import { RespondStudentRequestDto } from './dto/respond-student-request.dto';
import { StudentDetailsQueryDto } from './dto/student-details-query.dto';
import { UpdateStudentStatusDto } from './dto/update-student-status.dto';
import { TeacherRelationsService } from './teacher-relations.service';

@Controller('teacher')
@UseGuards(SessionAuthGuard)
export class TeacherRelationsController {
    constructor(private readonly relations: TeacherRelationsService) {}

    @Get('students')
    async students(
        @CurrentUser() user: SessionUser,
    ): Promise<Record<string, unknown>> {
        return this.relations.getTeacherStudents(user);
    }

    @Post('student-requests/respond')
    @HttpCode(HttpStatus.OK)
    async respond(
        @CurrentUser() user: SessionUser,
        @Body() input: RespondStudentRequestDto,
    ): Promise<Record<string, unknown>> {
        return this.relations.respondToRequest(user, input);
    }

    @Post('students/status')
    @HttpCode(HttpStatus.OK)
    async status(
        @CurrentUser() user: SessionUser,
        @Body() input: UpdateStudentStatusDto,
    ): Promise<Record<string, unknown>> {
        return this.relations.updateRelationStatus(user, input);
    }

    @Get('student-details')
    async details(
        @CurrentUser() user: SessionUser,
        @Query() query: StudentDetailsQueryDto,
    ): Promise<Record<string, unknown>> {
        return this.relations.getStudentDetails(
            user,
            query.relation_id,
            query.tab,
        );
    }
}

@Controller('student')
@UseGuards(SessionAuthGuard)
export class StudentRelationsController {
    constructor(private readonly relations: TeacherRelationsService) {}

    @Get('teachers')
    async teachers(
        @CurrentUser() user: SessionUser,
    ): Promise<Record<string, unknown>> {
        return this.relations.getStudentTeachers(user);
    }
}
