import {
    Controller,
    Get,
    UseGuards,
} from '@nestjs/common';

import { AdminAccessGuard } from '../auth/admin-access.guard';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { AdminDashboardService } from './admin-dashboard.service';

@Controller('admin/dashboard')
@UseGuards(SessionAuthGuard, AdminAccessGuard)
export class AdminDashboardController {
    constructor(
        private readonly dashboard: AdminDashboardService,
    ) {}

    @Get('stats')
    stats(): Promise<Record<string, unknown>> {
        return this.dashboard.stats();
    }
}
