import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';

import { PrivateFilesModule } from '../../common/files/private-files.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import {
    MATERIAL_MAX_FILES,
    MaterialFileStorageService,
} from './material-file-storage.service';
import { MaterialsController } from './materials.controller';
import { MaterialsService } from './materials.service';

@Module({
    imports: [
        AuthModule,
        NotificationsModule,
        PrivateFilesModule,
        MulterModule.registerAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                const configuredBytes = Number(
                    config.get('UPLOAD_MATERIAL_MAX_BYTES'),
                );
                const fileSize = Number.isSafeInteger(configuredBytes)
                    && configuredBytes > 0
                    ? configuredBytes
                    : 20 * 1024 * 1024;

                return {
                    limits: {
                        files: MATERIAL_MAX_FILES,
                        fileSize,
                        fields: 20,
                    },
                };
            },
        }),
    ],
    controllers: [MaterialsController],
    providers: [MaterialsService, MaterialFileStorageService],
    exports: [MaterialsService],
})
export class MaterialsModule {}
