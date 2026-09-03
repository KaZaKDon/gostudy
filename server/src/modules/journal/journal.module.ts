import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { HomeworkModule } from '../homework/homework.module';
import { NotificationsModule } from '../notifications/notifications.module';
import {
    JournalController,
    StudentDiaryController,
} from './journal.controller';
import { JournalService } from './journal.service';

@Module({
    imports: [AuthModule, HomeworkModule, NotificationsModule],
    controllers: [JournalController, StudentDiaryController],
    providers: [JournalService],
    exports: [JournalService],
})
export class JournalModule {}
