import {
    Controller,
    Get,
    Query,
    UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import type { SessionUser } from '../auth/session-user';
import { ListTeacherFinanceQueryDto } from './dto/list-teacher-finance-query.dto';
import { TeacherFinanceService } from './teacher-finance.service';

@Controller('teacher/finance')
@UseGuards(SessionAuthGuard)
export class TeacherFinanceController {
    constructor(private readonly finance: TeacherFinanceService) {}

    @Get()
    overview(
        @CurrentUser() user: SessionUser,
        @Query() query: ListTeacherFinanceQueryDto,
    ) {
        return this.finance.overview(user, query);
    }
}
