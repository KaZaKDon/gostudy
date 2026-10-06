import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { TeacherFinanceModule } from '../teacher-finance/teacher-finance.module';
import { AdminTariffsController } from './admin-tariffs.controller';
import { MarketplaceSalesPolicyService } from './marketplace-sales-policy.service';
import { TariffsController } from './tariffs.controller';
import { TariffsService } from './tariffs.service';

@Module({
    imports: [AuthModule, TeacherFinanceModule],
    controllers: [TariffsController, AdminTariffsController],
    providers: [MarketplaceSalesPolicyService, TariffsService],
})
export class TariffsModule {}
