import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';

import { PrivateFilesModule } from '../../common/files/private-files.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { HomeworkController } from './homework.controller';
import {
    HOMEWORK_MAX_FILES,
    HomeworkFileStorageService,
} from './homework-file-storage.service';
import { HomeworkService } from './homework.service';

@Module({
    imports: [
        AuthModule,
        NotificationsModule,
        PrivateFilesModule,
        MulterModule.registerAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                const configuredBytes = Number(
                    config.get('UPLOAD_HOMEWORK_MAX_BYTES'),
                );
                const fileSize = Number.isSafeInteger(configuredBytes)
                    && configuredBytes > 0
                    ? configuredBytes
                    : 10 * 1024 * 1024;

                return {
                    limits: {
                        files: HOMEWORK_MAX_FILES,
                        fileSize,
                        fields: 10,
                    },
                };
            },
        }),
    ],
    controllers: [HomeworkController],
    providers: [HomeworkService, HomeworkFileStorageService],
    exports: [HomeworkService],
})
export class HomeworkModule {}
