import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { AccessibilityProgramController } from './accessibility-program.controller';
import { AccessibilityProgramService } from './accessibility-program.service';

@Module({
    imports: [AuthModule],
    controllers: [AccessibilityProgramController],
    providers: [AccessibilityProgramService],
    exports: [AccessibilityProgramService],
})
export class AccessibilityProgramModule {}
