import { Controller, Get, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import type { SessionUser } from '../auth/session-user';
import { TeacherDashboardService } from './teacher-dashboard.service';

@Controller('teacher/dashboard')
@UseGuards(SessionAuthGuard)
export class TeacherDashboardController {
    constructor(private readonly dashboard: TeacherDashboardService) {}

    @Get('stats')
    stats(@CurrentUser() user: SessionUser) {
        return this.dashboard.stats(user);
    }
}
