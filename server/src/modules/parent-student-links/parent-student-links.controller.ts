import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Post,
    UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import type { SessionUser } from '../auth/session-user';
import { CreateChildStudentAccountDto } from './dto/create-child-student-account.dto';
import { LinkExistingStudentDto } from './dto/link-existing-student.dto';
import { RespondParentLinkDto } from './dto/respond-parent-link.dto';
import { ParentStudentLinksService } from './parent-student-links.service';

@Controller('parent/children')
@UseGuards(SessionAuthGuard)
export class ParentStudentLinkRequestsController {
    constructor(private readonly links: ParentStudentLinksService) {}

    @Post(':id/link-existing')
    requestLink(
        @CurrentUser() user: SessionUser,
        @Param('id', ParseIntPipe) childProfileId: number,
        @Body() input: LinkExistingStudentDto,
    ) {
        return this.links.requestExisting(user, childProfileId, input);
    }

    @Post(':id/create-student-account')
    createStudentAccount(
        @CurrentUser() user: SessionUser,
        @Param('id', ParseIntPipe) childProfileId: number,
        @Body() input: CreateChildStudentAccountDto,
    ) {
        return this.links.createStudentAccount(user, childProfileId, input);
    }
}

@Controller('student/parent-link-requests')
@UseGuards(SessionAuthGuard)
export class StudentParentLinkRequestsController {
    constructor(private readonly links: ParentStudentLinksService) {}

    @Get()
    list(@CurrentUser() user: SessionUser) {
        return this.links.listForStudent(user);
    }

    @Post(':id/respond')
    respond(
        @CurrentUser() user: SessionUser,
        @Param('id', ParseIntPipe) requestId: number,
        @Body() input: RespondParentLinkDto,
    ) {
        return this.links.respond(user, requestId, input);
    }
}
