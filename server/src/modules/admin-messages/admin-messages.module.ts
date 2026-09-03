import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { MessagesModule } from '../messages/messages.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminMessagesController } from './admin-messages.controller';
import { AdminMessagesService } from './admin-messages.service';

@Module({
    imports: [AuthModule, MessagesModule, NotificationsModule],
    controllers: [AdminMessagesController],
    providers: [AdminMessagesService],
})
export class AdminMessagesModule {}
