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
import { FindTeachersQueryDto } from './dto/find-teachers-query.dto';
import { SendTeacherRequestDto } from './dto/send-teacher-request.dto';
import { TeacherDetailsQueryDto } from './dto/teacher-details-query.dto';
import { TeachersService } from './teachers.service';

@Controller('teachers')
@UseGuards(SessionAuthGuard)
export class TeachersController {
    constructor(private readonly teachersService: TeachersService) {}

    @Get()
    async find(
        @CurrentUser() user: SessionUser,
        @Query() query: FindTeachersQueryDto,
    ): Promise<Record<string, unknown>> {
        return this.teachersService.findTeachers(user, query);
    }

    @Get('details')
    async details(
        @CurrentUser() user: SessionUser,
        @Query() query: TeacherDetailsQueryDto,
    ): Promise<Record<string, unknown>> {
        return this.teachersService.getTeacher(
            user,
            query.teacher_id,
            query.student_id,
        );
    }

    @Post('requests')
    @HttpCode(HttpStatus.OK)
    async request(
        @CurrentUser() user: SessionUser,
        @Body() input: SendTeacherRequestDto,
    ): Promise<Record<string, unknown>> {
        return this.teachersService.sendRequest(user, input);
    }
}
