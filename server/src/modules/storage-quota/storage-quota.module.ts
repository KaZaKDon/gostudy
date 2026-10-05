import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { StorageInventoryService } from './storage-inventory.service';
import { StorageQuotaController } from './storage-quota.controller';
import { StorageQuotaService } from './storage-quota.service';

@Module({
    imports: [AuthModule],
    controllers: [StorageQuotaController],
    providers: [StorageQuotaService, StorageInventoryService],
    exports: [StorageQuotaService],
})
export class StorageQuotaModule {}
