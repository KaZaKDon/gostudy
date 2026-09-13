import {
    Controller,
    Get,
    UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import type { SessionUser } from '../auth/session-user';
import { ParentDashboardService } from './parent-dashboard.service';

@Controller('parent/dashboard')
@UseGuards(SessionAuthGuard)
export class ParentDashboardController {
    constructor(private readonly dashboard: ParentDashboardService) {}

    @Get()
    show(@CurrentUser() user: SessionUser) {
        return this.dashboard.show(user);
    }
}
