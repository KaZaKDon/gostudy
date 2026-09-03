import {
    Controller,
    Get,
    Query,
    UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import type { SessionUser } from '../auth/session-user';
import { ScheduleQueryDto } from './dto/schedule-query.dto';
import { ScheduleService } from './schedule.service';

@Controller('lessons')
@UseGuards(SessionAuthGuard)
export class ScheduleController {
    constructor(private readonly scheduleService: ScheduleService) {}

    @Get('schedule')
    async schedule(
        @CurrentUser() user: SessionUser,
        @Query() query: ScheduleQueryDto,
    ): Promise<Record<string, unknown>> {
        return this.scheduleService.getSchedule(user, query);
    }
}
