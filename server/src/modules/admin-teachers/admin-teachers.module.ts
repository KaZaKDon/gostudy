import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminTeachersController } from './admin-teachers.controller';
import { AdminTeachersService } from './admin-teachers.service';

@Module({
    imports: [AuthModule, NotificationsModule],
    controllers: [AdminTeachersController],
    providers: [AdminTeachersService],
})
export class AdminTeachersModule {}
