import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { AdminDictionariesController } from './admin-dictionaries.controller';
import { AdminDictionariesService } from './admin-dictionaries.service';

@Module({
    imports: [AuthModule],
    controllers: [AdminDictionariesController],
    providers: [AdminDictionariesService],
})
export class AdminDictionariesModule {}
