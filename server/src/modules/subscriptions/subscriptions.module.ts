import { LiveSubscriptionsService } from './live-subscriptions.service';
import { AdminSubscriptionsService } from './admin-subscriptions.service';
import { AdminSubscriptionsController } from './admin-subscriptions.controller';
import { LiveSubscriptionsController } from './live-subscriptions.controller';
import { RobokassaCallbackService } from './robokassa-callback.service';
import { SubscriptionTermsService } from './subscription-terms.service';
import { RobokassaFiscalClient } from './robokassa-fiscal.client';
import { SubscriptionReceiptWorker } from './subscription-receipt.worker';
import { SubscriptionReceiptAdminController } from './subscription-receipt-admin.controller';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TariffsModule } from '../tariffs/tariffs.module';
import { RobokassaController } from './robokassa.controller';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({
    imports: [AuthModule, TariffsModule],
    controllers: [SubscriptionsController, RobokassaController, LiveSubscriptionsController, SubscriptionReceiptAdminController, AdminSubscriptionsController],
    providers: [SubscriptionsService, LiveSubscriptionsService, RobokassaCallbackService, SubscriptionTermsService, RobokassaFiscalClient, SubscriptionReceiptWorker, AdminSubscriptionsService],
})
export class SubscriptionsModule {}
