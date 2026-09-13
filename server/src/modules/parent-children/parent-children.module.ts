import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { LegalConsentsModule } from '../legal-consents/legal-consents.module';
import { ParentChildrenController } from './parent-children.controller';
import { ParentChildrenService } from './parent-children.service';

@Module({
    imports: [AuthModule, LegalConsentsModule],
    controllers: [ParentChildrenController],
    providers: [ParentChildrenService],
})
export class ParentChildrenModule {}
