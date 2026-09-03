import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { AdminStudentsController } from './admin-students.controller';
import { AdminStudentsService } from './admin-students.service';

@Module({
    imports: [AuthModule],
    controllers: [AdminStudentsController],
    providers: [AdminStudentsService],
})
export class AdminStudentsModule {}
