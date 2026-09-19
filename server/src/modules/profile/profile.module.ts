import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { TeacherDocumentsModule } from '../teacher-documents/teacher-documents.module';
import { TeacherProfileMediaModule } from '../teacher-profile-media/teacher-profile-media.module';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

@Module({
    imports: [
        AuthModule,
        TeacherDocumentsModule,
        TeacherProfileMediaModule,
    ],
    controllers: [ProfileController],
    providers: [ProfileService],
})
export class ProfileModule {}
