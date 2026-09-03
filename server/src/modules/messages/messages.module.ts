import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';

import { PrivateFilesModule } from '../../common/files/private-files.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import {
    MESSAGE_MAX_FILES,
    MessageFileStorageService,
} from './message-file-storage.service';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
    imports: [
        AuthModule,
        NotificationsModule,
        PrivateFilesModule,
        MulterModule.registerAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                const configured = Number(config.get('UPLOAD_MESSAGE_MAX_BYTES'));
                const fileSize = Number.isSafeInteger(configured) && configured > 0
                    ? configured
                    : 10 * 1024 * 1024;
                return {
                    limits: {
                        files: MESSAGE_MAX_FILES,
                        fileSize,
                        fields: 10,
                    },
                };
            },
        }),
    ],
    controllers: [MessagesController],
    providers: [MessagesService, MessageFileStorageService],
    exports: [MessagesService],
})
export class MessagesModule {}
