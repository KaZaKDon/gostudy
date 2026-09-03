import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { AdminAccountsController } from './admin-accounts.controller';
import { AdminAccountsService } from './admin-accounts.service';

@Module({
    imports: [AuthModule],
    controllers: [AdminAccountsController],
    providers: [AdminAccountsService],
})
export class AdminAccountsModule {}
