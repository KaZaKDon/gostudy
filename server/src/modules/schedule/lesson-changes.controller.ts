import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Post,
    UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import type { SessionUser } from '../auth/session-user';
import { RequestLessonChangeDto } from './dto/request-lesson-change.dto';
import { RespondLessonChangeDto } from './dto/respond-lesson-change.dto';
import { WithdrawLessonChangeDto } from './dto/withdraw-lesson-change.dto';
import { LessonChangesService } from './lesson-changes.service';

@Controller('lessons/change-requests')
@UseGuards(SessionAuthGuard)
export class LessonChangesController {
    constructor(private readonly lessonChanges: LessonChangesService) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async request(
        @CurrentUser() user: SessionUser,
        @Body() input: RequestLessonChangeDto,
    ): Promise<Record<string, unknown>> {
        return this.lessonChanges.requestChange(user, input);
    }

    @Post('respond')
    @HttpCode(HttpStatus.OK)
    async respond(
        @CurrentUser() user: SessionUser,
        @Body() input: RespondLessonChangeDto,
    ): Promise<Record<string, unknown>> {
        return this.lessonChanges.respondChange(user, input);
    }

    @Post('withdraw')
    @HttpCode(HttpStatus.OK)
    async withdraw(
        @CurrentUser() user: SessionUser,
        @Body() input: WithdrawLessonChangeDto,
    ): Promise<Record<string, unknown>> {
        return this.lessonChanges.withdrawChange(user, input);
    }
}
