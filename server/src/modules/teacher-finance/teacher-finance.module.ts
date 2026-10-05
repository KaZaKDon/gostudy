import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { TeacherFinanceController } from './teacher-finance.controller';
import { TeacherFinanceService } from './teacher-finance.service';

@Module({
    imports: [AuthModule],
    controllers: [TeacherFinanceController],
    providers: [TeacherFinanceService],
    exports: [TeacherFinanceService],
})
export class TeacherFinanceModule {}
