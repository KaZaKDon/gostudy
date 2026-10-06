import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { TeacherFinanceController } from './teacher-finance.controller';
import { TeacherFinancePolicyService } from './teacher-finance-policy.service';
import { TeacherFinanceService } from './teacher-finance.service';

@Module({
    imports: [AuthModule],
    controllers: [TeacherFinanceController],
    providers: [TeacherFinancePolicyService, TeacherFinanceService],
    exports: [TeacherFinancePolicyService, TeacherFinanceService],
})
export class TeacherFinanceModule {}
