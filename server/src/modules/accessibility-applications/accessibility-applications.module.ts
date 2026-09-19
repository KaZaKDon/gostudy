import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AccessibilityApplicationsController } from './accessibility-applications.controller';
import { AccessibilityApplicationsService } from './accessibility-applications.service';

@Module({
    imports: [AuthModule, NotificationsModule],
    controllers: [AccessibilityApplicationsController],
    providers: [AccessibilityApplicationsService],
})
export class AccessibilityApplicationsModule {}
