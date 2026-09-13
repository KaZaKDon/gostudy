import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import {
    ParentStudentLinkRequestsController,
    StudentParentLinkRequestsController,
} from './parent-student-links.controller';
import { ParentStudentLinksService } from './parent-student-links.service';

@Module({
    imports: [AuthModule, MailModule, NotificationsModule],
    controllers: [
        ParentStudentLinkRequestsController,
        StudentParentLinkRequestsController,
    ],
    providers: [ParentStudentLinksService],
})
export class ParentStudentLinksModule {}
