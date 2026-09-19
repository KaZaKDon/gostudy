import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';

import { PrivateFilesModule } from '../../common/files/private-files.module';
import { TeacherDocumentFileStorageService } from './teacher-document-file-storage.service';
import { TeacherDocumentsService } from './teacher-documents.service';

@Module({
    imports: [
        PrivateFilesModule,
        MulterModule.registerAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                const configuredBytes = Number(
                    config.get('UPLOAD_TEACHER_DOCUMENT_MAX_BYTES'),
                );
                const fileSize = Number.isSafeInteger(configuredBytes)
                    && configuredBytes > 0
                    ? configuredBytes
                    : 10 * 1024 * 1024;

                return {
                    limits: {
                        files: 1,
                        fileSize,
                        fields: 10,
                    },
                };
            },
        }),
    ],
    providers: [
        TeacherDocumentFileStorageService,
        TeacherDocumentsService,
    ],
    exports: [
        MulterModule,
        TeacherDocumentFileStorageService,
        TeacherDocumentsService,
    ],
})
export class TeacherDocumentsModule {}
