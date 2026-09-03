import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';

import { PrivateFilesModule } from '../../common/files/private-files.module';
import { AuthModule } from '../auth/auth.module';
import { HomeworkModule } from '../homework/homework.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ClassroomController } from './classroom.controller';
import { ClassroomFileStorageService } from './classroom-file-storage.service';
import { ClassroomService } from './classroom.service';

@Module({
    imports: [
        AuthModule,
        HomeworkModule,
        NotificationsModule,
        PrivateFilesModule,
        MulterModule.registerAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                const configuredBytes = Number(
                    config.get('UPLOAD_CLASSROOM_MAX_BYTES'),
                );
                const fileSize = Number.isSafeInteger(configuredBytes)
                    && configuredBytes > 0
                    ? configuredBytes
                    : 10 * 1024 * 1024;

                return {
                    limits: {
                        files: 5,
                        fileSize,
                        fields: 10,
                    },
                };
            },
        }),
    ],
    controllers: [ClassroomController],
    providers: [ClassroomService, ClassroomFileStorageService],
    exports: [ClassroomService],
})
export class ClassroomModule {}
