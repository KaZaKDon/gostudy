import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { LessonDisputesModule } from '../lesson-disputes/lesson-disputes.module';
import { AdminLessonDisputesController } from './admin-lesson-disputes.controller';
import { AdminLessonDisputesService } from './admin-lesson-disputes.service';

@Module({
    imports: [AuthModule, LessonDisputesModule],
    controllers: [AdminLessonDisputesController],
    providers: [AdminLessonDisputesService],
})
export class AdminLessonDisputesModule {}
