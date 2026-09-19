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
import { AdminDocumentsService } from './admin-documents.service';
import { ListAdminDocumentsQueryDto } from './dto/list-admin-documents-query.dto';
import { ModerateTeacherDocumentDto } from './dto/moderate-teacher-document.dto';

@Controller('admin/documents')
@UseGuards(SessionAuthGuard, AdminAccessGuard)
export class AdminDocumentsController {
    constructor(private readonly documents: AdminDocumentsService) {}

    @Get()
    list(
        @Req() request: AuthenticatedRequest,
        @Query() query: ListAdminDocumentsQueryDto,
    ) {
        return this.documents.list(request.authenticatedUser, query);
    }

    @Patch(':id/moderation')
    moderate(
        @Req() request: AuthenticatedRequest,
        @Param('id', ParseIntPipe) documentId: number,
        @Body() input: ModerateTeacherDocumentDto,
    ) {
        return this.documents.moderate(
            request.authenticatedUser,
            documentId,
            input,
            getRequestMetadata(request),
        );
    }

    @Get(':id/file')
    @Header('Cache-Control', 'private, no-store, max-age=0')
    async download(
        @Req() request: AuthenticatedRequest,
        @Param('id', ParseIntPipe) documentId: number,
        @Res({ passthrough: true }) response: Response,
    ) {
        const file = await this.documents.download(
            request.authenticatedUser,
            documentId,
        );
        const encodedName = encodeURIComponent(file.originalName)
            .replace(/\*/g, '%2A');
        response.setHeader(
            'Content-Disposition',
            `inline; filename="document"; filename*=UTF-8''${encodedName}`,
        );
        response.setHeader('X-Content-Type-Options', 'nosniff');

        return new StreamableFile(createReadStream(file.absolutePath), {
            type: file.mimeType,
            length: file.size,
        });
    }
}
