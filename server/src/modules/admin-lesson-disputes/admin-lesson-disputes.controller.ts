import {
    Body,
    Controller,
    Get,
    Header,
    Param,
    ParseIntPipe,
    Patch,
    Query,
    Req,
    Res,
    StreamableFile,
    UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { createReadStream } from 'node:fs';

import { getRequestMetadata } from '../../common/http/request-metadata';
import { AdminAccessGuard } from '../auth/admin-access.guard';
import {
    type AuthenticatedRequest,
    SessionAuthGuard,
} from '../auth/session-auth.guard';
import { AdminLessonDisputesService } from './admin-lesson-disputes.service';
import { ListAdminLessonDisputesQueryDto } from './dto/list-admin-lesson-disputes-query.dto';
import { ModerateLessonDisputeDto } from './dto/moderate-lesson-dispute.dto';

@Controller('admin/lesson-disputes')
@UseGuards(SessionAuthGuard, AdminAccessGuard)
export class AdminLessonDisputesController {
    constructor(private readonly disputes: AdminLessonDisputesService) {}

    @Get()
    list(
        @Req() request: AuthenticatedRequest,
        @Query() query: ListAdminLessonDisputesQueryDto,
    ) {
        return this.disputes.list(request.authenticatedUser, query);
    }

    @Get(':id')
    details(
        @Req() request: AuthenticatedRequest,
        @Param('id', ParseIntPipe) disputeId: number,
    ) {
        return this.disputes.details(
            request.authenticatedUser,
            disputeId,
            getRequestMetadata(request),
        );
    }

    @Patch(':id')
    moderate(
        @Req() request: AuthenticatedRequest,
        @Param('id', ParseIntPipe) disputeId: number,
        @Body() input: ModerateLessonDisputeDto,
    ) {
        return this.disputes.moderate(
            request.authenticatedUser,
            disputeId,
            input,
            getRequestMetadata(request),
        );
    }

    @Get(':id/attachments/:attachmentId')
    @Header('Cache-Control', 'private, no-store, max-age=0')
    async download(
        @Req() request: AuthenticatedRequest,
        @Param('id', ParseIntPipe) disputeId: number,
        @Param('attachmentId', ParseIntPipe) attachmentId: number,
        @Res({ passthrough: true }) response: Response,
    ) {
        const file = await this.disputes.download(
            request.authenticatedUser,
            disputeId,
            attachmentId,
        );
        const encodedName = encodeURIComponent(file.originalName)
            .replace(/\*/g, '%2A');
        response.setHeader(
            'Content-Disposition',
            `attachment; filename="download"; filename*=UTF-8''${encodedName}`,
        );
        response.setHeader('X-Content-Type-Options', 'nosniff');

        return new StreamableFile(createReadStream(file.absolutePath), {
            type: file.mimeType,
            length: file.size,
        });
    }
}
