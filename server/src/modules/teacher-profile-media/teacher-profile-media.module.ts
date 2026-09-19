import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';

import { PrivateFilesModule } from '../../common/files/private-files.module';
import {
    DEFAULT_TEACHER_VIDEO_MAX_BYTES,
    TeacherProfileMediaFileStorageService,
} from './teacher-profile-media-file-storage.service';
import {
    PublicTeacherProfileMediaController,
    TeacherProfileMediaController,
} from './teacher-profile-media.controller';
import { TeacherProfileMediaService } from './teacher-profile-media.service';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        AuthModule,
        PrivateFilesModule,
        MulterModule.registerAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                const configuredBytes = Number(
                    config.get('UPLOAD_TEACHER_VIDEO_MAX_BYTES'),
                );
                const fileSize = Number.isSafeInteger(configuredBytes)
                    && configuredBytes > 0
                    ? configuredBytes
                    : DEFAULT_TEACHER_VIDEO_MAX_BYTES;

                return {
                    limits: { files: 1, fileSize, fields: 5 },
                };
            },
        }),
    ],
    controllers: [
        TeacherProfileMediaController,
        PublicTeacherProfileMediaController,
    ],
    providers: [
        TeacherProfileMediaFileStorageService,
        TeacherProfileMediaService,
    ],
    exports: [
        TeacherProfileMediaFileStorageService,
        TeacherProfileMediaService,
    ],
})
export class TeacherProfileMediaModule {}
