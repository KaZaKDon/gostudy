import { Module } from '@nestjs/common';

import { ParentChildAccessModule } from '../../common/access/parent-child-access.module';
import { AuthModule } from '../auth/auth.module';
import { HomeworkModule } from '../homework/homework.module';
import { NotificationsModule } from '../notifications/notifications.module';
import {
    StudentRelationsController,
    TeacherRelationsController,
} from './teacher-relations.controller';
import { TeacherApplicantAccessService } from './teacher-applicant-access.service';
import { TeacherDirectoryService } from './teacher-directory.service';
import { TeacherRelationsService } from './teacher-relations.service';
import { TeachersController } from './teachers.controller';
import { TeachersService } from './teachers.service';

@Module({
    imports: [
        AuthModule,
        HomeworkModule,
        NotificationsModule,
        ParentChildAccessModule,
    ],
    controllers: [
        TeachersController,
        TeacherRelationsController,
        StudentRelationsController,
    ],
    providers: [
        TeacherApplicantAccessService,
        TeacherDirectoryService,
        TeachersService,
        TeacherRelationsService,
    ],
})
export class TeachersModule {}
