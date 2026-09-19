import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import type { SessionUser } from '../auth/session-user';
import { AccessibilityApplicationsService } from './accessibility-applications.service';
import { CreateAccessibilityApplicationDto } from './dto/create-accessibility-application.dto';
import { RespondAccessibilityApplicationDto } from './dto/respond-accessibility-application.dto';

@Controller('accessibility-program/applications')
@UseGuards(SessionAuthGuard)
export class AccessibilityApplicationsController {
    constructor(private readonly applications: AccessibilityApplicationsService) {}

    @Get('mine')
    mine(@CurrentUser() user: SessionUser) {
        return this.applications.mine(user);
    }

    @Get('teacher')
    teacher(@CurrentUser() user: SessionUser) {
        return this.applications.forTeacher(user);
    }

    @Post()
    create(
        @CurrentUser() user: SessionUser,
        @Body() input: CreateAccessibilityApplicationDto,
    ) {
        return this.applications.create(user, input);
    }

    @Patch(':id/respond')
    respond(
        @CurrentUser() user: SessionUser,
        @Param('id', ParseIntPipe) applicationId: number,
        @Body() input: RespondAccessibilityApplicationDto,
    ) {
        return this.applications.respond(user, applicationId, input);
    }

    @Patch(':id/confirm')
    confirm(
        @CurrentUser() user: SessionUser,
        @Param('id', ParseIntPipe) applicationId: number,
    ) {
        return this.applications.confirm(user, applicationId);
    }
}
