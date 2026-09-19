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
import { AdminProfileMediaService } from './admin-profile-media.service';
import { ListAdminProfileMediaQueryDto } from './dto/list-admin-profile-media-query.dto';
import { ModerateAdminProfileMediaDto } from './dto/moderate-admin-profile-media.dto';

@Controller('admin/profile-media')
@UseGuards(SessionAuthGuard, AdminAccessGuard)
export class AdminProfileMediaController {
    constructor(private readonly media: AdminProfileMediaService) {}

    @Get()
    list(
        @Req() request: AuthenticatedRequest,
        @Query() query: ListAdminProfileMediaQueryDto,
    ) {
        return this.media.list(request.authenticatedUser, query);
    }

    @Patch(':id/moderation')
    moderate(
        @Req() request: AuthenticatedRequest,
        @Param('id', ParseIntPipe) mediaId: number,
        @Body() input: ModerateAdminProfileMediaDto,
    ) {
        return this.media.moderate(
            request.authenticatedUser,
            mediaId,
            input,
            getRequestMetadata(request),
        );
    }

    @Get(':id/file')
    @Header('Cache-Control', 'private, no-store, max-age=0')
    async download(
        @Req() request: AuthenticatedRequest,
        @Param('id', ParseIntPipe) mediaId: number,
        @Res({ passthrough: true }) response: Response,
    ) {
        const file = await this.media.download(
            request.authenticatedUser,
            mediaId,
        );
        const encodedName = encodeURIComponent(file.originalName)
            .replace(/\*/g, '%2A');
        response.setHeader(
            'Content-Disposition',
            `inline; filename="media"; filename*=UTF-8''${encodedName}`,
        );
        response.setHeader('X-Content-Type-Options', 'nosniff');

        return new StreamableFile(createReadStream(file.absolutePath), {
            type: file.mimeType,
            length: file.size,
        });
    }
}
