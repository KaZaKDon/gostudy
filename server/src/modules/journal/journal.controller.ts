import {
    Body,
    Controller,
    Get,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import type { SessionUser } from '../auth/session-user';
import { ListDiaryQueryDto } from './dto/list-diary-query.dto';
import { ListJournalQueryDto } from './dto/list-journal-query.dto';
import { SaveJournalResultDto } from './dto/save-journal-result.dto';
import { JournalService } from './journal.service';

@Controller('journal')
@UseGuards(SessionAuthGuard)
export class JournalController {
    constructor(private readonly journal: JournalService) {}

    @Get()
    list(
        @CurrentUser() user: SessionUser,
        @Query() query: ListJournalQueryDto,
    ) {
        return this.journal.listTeacherJournal(user, query);
    }

    @Post('result')
    saveResult(
        @CurrentUser() user: SessionUser,
        @Body() input: SaveJournalResultDto,
    ) {
        return this.journal.saveResult(user, input);
    }
}

@Controller('student/diary')
@UseGuards(SessionAuthGuard)
export class StudentDiaryController {
    constructor(private readonly journal: JournalService) {}

    @Get()
    list(
        @CurrentUser() user: SessionUser,
        @Query() query: ListDiaryQueryDto,
    ) {
        return this.journal.listStudentDiary(user, query);
    }
}
