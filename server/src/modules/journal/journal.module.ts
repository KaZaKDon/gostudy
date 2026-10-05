import { Module } from '@nestjs/common';

import { ParentChildAccessModule } from '../../common/access/parent-child-access.module';
import { AuthModule } from '../auth/auth.module';
import { HomeworkModule } from '../homework/homework.module';
import { NotificationsModule } from '../notifications/notifications.module';
import {
    JournalController,
    ParentDiaryController,
    StudentDiaryController,
} from './journal.controller';
import { JournalService } from './journal.service';

@Module({
    imports: [
        AuthModule,
        HomeworkModule,
        NotificationsModule,
        ParentChildAccessModule,
    ],
    controllers: [
        JournalController,
        StudentDiaryController,
        ParentDiaryController,
    ],
    providers: [JournalService],
    exports: [JournalService],
})
export class JournalModule {}
