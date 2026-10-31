import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TariffsModule } from '../tariffs/tariffs.module';
import { RobokassaController } from './robokassa.controller';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({
    imports: [AuthModule, TariffsModule],
    controllers: [SubscriptionsController, RobokassaController],
    providers: [SubscriptionsService],
})
export class SubscriptionsModule {}
