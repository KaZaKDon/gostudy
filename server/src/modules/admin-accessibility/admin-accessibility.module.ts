import { Module } from '@nestjs/common';

import { AccessibilityProgramModule } from '../accessibility-program/accessibility-program.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminAccessibilityController } from './admin-accessibility.controller';
import { AdminAccessibilityService } from './admin-accessibility.service';

@Module({
    imports: [
        AuthModule,
        NotificationsModule,
        AccessibilityProgramModule,
    ],
    controllers: [AdminAccessibilityController],
    providers: [AdminAccessibilityService],
})
export class AdminAccessibilityModule {}
