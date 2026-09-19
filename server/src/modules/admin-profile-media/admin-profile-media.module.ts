import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TeacherProfileMediaModule } from '../teacher-profile-media/teacher-profile-media.module';
import { AdminProfileMediaController } from './admin-profile-media.controller';
import { AdminProfileMediaService } from './admin-profile-media.service';

@Module({
    imports: [
        AuthModule,
        NotificationsModule,
        TeacherProfileMediaModule,
    ],
    controllers: [AdminProfileMediaController],
    providers: [AdminProfileMediaService],
})
export class AdminProfileMediaModule {}
