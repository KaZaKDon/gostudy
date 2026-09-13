import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import type { SessionUser } from '../auth/session-user';
import { UpdateAccountDto } from './dto/update-account.dto';
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto';
import { UpdateTeacherProfileDto } from './dto/update-teacher-profile.dto';
import { UpdateTeacherVisibilityDto } from './dto/update-teacher-visibility.dto';
import { ProfileService } from './profile.service';

@Controller('profile')
@UseGuards(SessionAuthGuard)
export class ProfileController {
    constructor(private readonly profileService: ProfileService) {}

    @Get('me')
    async me(
        @CurrentUser() user: SessionUser,
    ): Promise<Record<string, unknown>> {
        return this.profileService.getMe(user);
    }

    @Post('account')
    @HttpCode(HttpStatus.OK)
    async updateAccount(
        @CurrentUser() user: SessionUser,
        @Body() input: UpdateAccountDto,
    ): Promise<Record<string, unknown>> {
        return this.profileService.updateAccount(user, input);
    }

    @Get('teacher-options')
    async teacherOptions(
        @CurrentUser() user: SessionUser,
    ): Promise<Record<string, unknown>> {
        return this.profileService.getTeacherOptions(user);
    }

    @Post('teacher')
    @HttpCode(HttpStatus.OK)
    async updateTeacher(
        @CurrentUser() user: SessionUser,
        @Body() input: UpdateTeacherProfileDto,
    ): Promise<Record<string, unknown>> {
        return this.profileService.updateTeacherProfile(user, input);
    }

    @Post('teacher/visibility')
    @HttpCode(HttpStatus.OK)
    async updateTeacherVisibility(
        @CurrentUser() user: SessionUser,
        @Body() input: UpdateTeacherVisibilityDto,
    ): Promise<Record<string, unknown>> {
        return this.profileService.updateTeacherVisibility(user, input);
    }

    @Get('student')
    async student(
        @CurrentUser() user: SessionUser,
    ): Promise<Record<string, unknown>> {
        return this.profileService.getStudentProfile(user);
    }

    @Post('student')
    @HttpCode(HttpStatus.OK)
    async updateStudent(
        @CurrentUser() user: SessionUser,
        @Body() input: UpdateStudentProfileDto,
    ): Promise<Record<string, unknown>> {
        return this.profileService.updateStudentProfile(user, input);
    }
}
