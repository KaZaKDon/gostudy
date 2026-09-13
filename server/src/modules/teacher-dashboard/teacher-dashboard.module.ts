import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { TeacherDashboardController } from './teacher-dashboard.controller';
import { TeacherDashboardService } from './teacher-dashboard.service';

@Module({
    imports: [AuthModule],
    controllers: [TeacherDashboardController],
    providers: [TeacherDashboardService],
})
export class TeacherDashboardModule {}
