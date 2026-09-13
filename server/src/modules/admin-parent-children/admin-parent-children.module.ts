import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminParentChildrenController } from './admin-parent-children.controller';
import { AdminParentChildrenService } from './admin-parent-children.service';

@Module({
    imports: [AuthModule, NotificationsModule],
    controllers: [AdminParentChildrenController],
    providers: [AdminParentChildrenService],
})
export class AdminParentChildrenModule {}
