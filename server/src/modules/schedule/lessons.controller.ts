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
import { CreateLessonDto } from './dto/create-lesson.dto';
import { LessonsService } from './lessons.service';

@Controller('lessons')
@UseGuards(SessionAuthGuard)
export class LessonsController {
    constructor(private readonly lessonsService: LessonsService) {}

    @Get('options')
    async options(
        @CurrentUser() user: SessionUser,
    ): Promise<Record<string, unknown>> {
        return this.lessonsService.getCreationOptions(user);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
        @CurrentUser() user: SessionUser,
        @Body() input: CreateLessonDto,
    ): Promise<Record<string, unknown>> {
        return this.lessonsService.createLesson(user, input);
    }
}
