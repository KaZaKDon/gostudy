import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { AdminTariffsController } from './admin-tariffs.controller';
import { TariffsController } from './tariffs.controller';
import { TariffsService } from './tariffs.service';

@Module({
    imports: [AuthModule],
    controllers: [TariffsController, AdminTariffsController],
    providers: [TariffsService],
})
export class TariffsModule {}
