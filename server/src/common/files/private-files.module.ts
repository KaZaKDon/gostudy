import { Module } from '@nestjs/common';

import { PrivateFileStorageService } from './private-file-storage.service';

@Module({
    providers: [PrivateFileStorageService],
    exports: [PrivateFileStorageService],
})
export class PrivateFilesModule {}
