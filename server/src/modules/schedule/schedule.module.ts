import { Module } from '@nestjs/common';

import { ParentChildAccessModule } from '../../common/access/parent-child-access.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TeacherFinanceModule } from '../teacher-finance/teacher-finance.module';
import { LessonChangesController } from './lesson-changes.controller';
import { LessonChangesService } from './lesson-changes.service';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';

@Module({
    imports: [
        AuthModule,
        NotificationsModule,
        ParentChildAccessModule,
        TeacherFinanceModule,
    ],
    controllers: [
        ScheduleController,
        LessonsController,
        LessonChangesController,
    ],
    providers: [ScheduleService, LessonsService, LessonChangesService],
})
export class ScheduleModule {}
