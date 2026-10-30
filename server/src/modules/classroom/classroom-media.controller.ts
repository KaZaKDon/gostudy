import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import type { SessionUser } from '../auth/session-user';
import { TurnCredentialsService } from '../turn/turn-credentials.service';
import { ClassroomService } from './classroom.service';
import { ClassroomLessonDto } from './dto/classroom-lesson.dto';

@Controller('classroom')
@UseGuards(SessionAuthGuard)
export class ClassroomMediaController {
    constructor(
        private readonly classroom: ClassroomService,
        private readonly turn: TurnCredentialsService,
    ) {}

    @Get('media-config')
    @Header('Cache-Control', 'private, no-store, max-age=0')
    async configuration(
        @CurrentUser() user: SessionUser,
        @Query() query: ClassroomLessonDto,
    ) {
        await this.classroom.authorizeMedia(user, query.lesson_id);

        return { success: true, ...this.turn.forUser(user.id) };
    }
}
