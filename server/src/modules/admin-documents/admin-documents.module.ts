import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TeacherDocumentsModule } from '../teacher-documents/teacher-documents.module';
import { AdminDocumentsController } from './admin-documents.controller';
import { AdminDocumentsService } from './admin-documents.service';

@Module({
    imports: [
        AuthModule,
        NotificationsModule,
        TeacherDocumentsModule,
    ],
    controllers: [AdminDocumentsController],
    providers: [AdminDocumentsService],
})
export class AdminDocumentsModule {}
