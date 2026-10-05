import {
    Controller,
    Get,
    UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import type { SessionUser } from '../auth/session-user';
import { StorageInventoryService } from './storage-inventory.service';
import { StorageQuotaService } from './storage-quota.service';

@Controller('storage')
@UseGuards(SessionAuthGuard)
export class StorageQuotaController {
    constructor(
        private readonly storageQuota: StorageQuotaService,
        private readonly storageInventory: StorageInventoryService,
    ) {}

    @Get('usage')
    usage(@CurrentUser() user: SessionUser) {
        return this.storageQuota.getUsage(user.id);
    }

    @Get('overview')
    async overview(@CurrentUser() user: SessionUser) {
        const [usage, inventory] = await Promise.all([
            this.storageQuota.getUsage(user.id),
            this.storageInventory.getInventory(user),
        ]);

        return {
            ...usage,
            ...inventory,
        };
    }
}
