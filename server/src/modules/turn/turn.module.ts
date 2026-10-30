import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { TurnCredentialsService } from './turn-credentials.service';

@Module({
    imports: [ConfigModule],
    providers: [TurnCredentialsService],
    exports: [TurnCredentialsService],
})
export class TurnModule {}
