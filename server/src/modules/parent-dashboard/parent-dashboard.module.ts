import { Module } from '@nestjs/common';

import { ParentChildAccessModule } from '../../common/access/parent-child-access.module';
import { AuthModule } from '../auth/auth.module';
import { ParentDashboardController } from './parent-dashboard.controller';
import { ParentDashboardService } from './parent-dashboard.service';

@Module({
    imports: [AuthModule, ParentChildAccessModule],
    controllers: [ParentDashboardController],
    providers: [ParentDashboardService],
})
export class ParentDashboardModule {}
