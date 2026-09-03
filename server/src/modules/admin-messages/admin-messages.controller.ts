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
import { type AuthenticatedRequest, SessionAuthGuard } from '../auth/session-auth.guard';
import { AdminMessagesService } from './admin-messages.service';
import { ListMessageReportsQueryDto } from './dto/list-message-reports-query.dto';
import { ResolveMessageReportDto } from './dto/resolve-message-report.dto';

@Controller('admin/messages')
@UseGuards(SessionAuthGuard, AdminAccessGuard)
export class AdminMessagesController {
    constructor(private readonly messages: AdminMessagesService) {}

    @Get('reports')
    list(
        @Req() request: AuthenticatedRequest,
        @Query() query: ListMessageReportsQueryDto,
    ) {
        return this.messages.list(request.authenticatedUser, query);
    }

    @Get('reports/:id')
    details(
        @Req() request: AuthenticatedRequest,
        @Param('id', ParseIntPipe) reportId: number,
    ) {
        return this.messages.details(
            request.authenticatedUser,
            reportId,
            getRequestMetadata(request),
        );
    }

    @Patch('reports/:id')
    resolve(
        @Req() request: AuthenticatedRequest,
        @Param('id', ParseIntPipe) reportId: number,
        @Body() input: ResolveMessageReportDto,
    ) {
        return this.messages.resolve(
            request.authenticatedUser,
            reportId,
            input,
            getRequestMetadata(request),
        );
    }

    @Get('reports/:id/download')
    @Header('Cache-Control', 'private, no-store, max-age=0')
    async download(
        @Req() request: AuthenticatedRequest,
        @Param('id', ParseIntPipe) reportId: number,
        @Query('attachment_id', ParseIntPipe) attachmentId: number,
        @Res({ passthrough: true }) response: Response,
    ) {
        const file = await this.messages.download(
            request.authenticatedUser,
            reportId,
            attachmentId,
        );
        const encodedName = encodeURIComponent(file.originalName).replace(/\*/g, '%2A');
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
