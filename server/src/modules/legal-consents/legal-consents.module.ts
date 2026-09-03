import { Module } from '@nestjs/common';

import { LegalConsentsService } from './legal-consents.service';

@Module({
    providers: [LegalConsentsService],
    exports: [LegalConsentsService],
})
export class LegalConsentsModule {}
