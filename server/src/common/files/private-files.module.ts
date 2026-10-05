import { Module } from '@nestjs/common';

import { PrivateFileStorageService } from './private-file-storage.service';
import { StorageQuotaModule } from '../../modules/storage-quota/storage-quota.module';

@Module({
    imports: [StorageQuotaModule],
    providers: [PrivateFileStorageService],
    exports: [PrivateFileStorageService],
})
export class PrivateFilesModule {}
