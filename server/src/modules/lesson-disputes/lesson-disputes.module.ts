import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';

import { ParentChildAccessModule } from '../../common/access/parent-child-access.module';
import { PrivateFilesModule } from '../../common/files/private-files.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import {
    LESSON_DISPUTE_MAX_FILES,
    LessonDisputeFileStorageService,
} from './lesson-dispute-file-storage.service';
import { LessonDisputesController } from './lesson-disputes.controller';
import { LessonDisputesService } from './lesson-disputes.service';

@Module({
    imports: [
        AuthModule,
        NotificationsModule,
        ParentChildAccessModule,
        PrivateFilesModule,
        MulterModule.registerAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                const configured = Number(config.get('UPLOAD_DISPUTE_MAX_BYTES'));
                const fileSize = Number.isSafeInteger(configured) && configured > 0
                    ? configured
                    : 10 * 1024 * 1024;
                return {
                    limits: {
                        files: LESSON_DISPUTE_MAX_FILES,
                        fileSize,
                        fields: 10,
                    },
                };
            },
        }),
    ],
    controllers: [LessonDisputesController],
    providers: [LessonDisputesService, LessonDisputeFileStorageService],
    exports: [LessonDisputesService],
})
export class LessonDisputesModule {}
