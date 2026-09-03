import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { HomeworkModule } from '../homework/homework.module';
import { NotificationsModule } from '../notifications/notifications.module';
import {
    StudentRelationsController,
    TeacherRelationsController,
} from './teacher-relations.controller';
import { TeacherRelationsService } from './teacher-relations.service';
import { TeachersController } from './teachers.controller';
import { TeachersService } from './teachers.service';

@Module({
    imports: [AuthModule, HomeworkModule, NotificationsModule],
    controllers: [
        TeachersController,
        TeacherRelationsController,
        StudentRelationsController,
    ],
    providers: [TeachersService, TeacherRelationsService],
})
export class TeachersModule {}
