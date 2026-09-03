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
import { AdminMaterialsService } from './admin-materials.service';
import {
    ListAdminMaterialReportsQueryDto,
    ListAdminMaterialsQueryDto,
} from './dto/list-admin-materials-query.dto';
import {
    ModerateMaterialDto,
    ResolveMaterialReportDto,
} from './dto/moderate-material.dto';

@Controller('admin/materials')
@UseGuards(SessionAuthGuard, AdminAccessGuard)
export class AdminMaterialsController {
    constructor(private readonly materials: AdminMaterialsService) {}

    @Get()
    list(
        @Req() request: AuthenticatedRequest,
        @Query() query: ListAdminMaterialsQueryDto,
    ) {
        return this.materials.list(request.authenticatedUser, query);
    }

    @Get('reports')
    reports(
        @Req() request: AuthenticatedRequest,
        @Query() query: ListAdminMaterialReportsQueryDto,
    ) {
        return this.materials.listReports(request.authenticatedUser, query);
    }

    @Patch('reports/:id')
    resolveReport(
        @Req() request: AuthenticatedRequest,
        @Param('id', ParseIntPipe) reportId: number,
        @Body() input: ResolveMaterialReportDto,
    ) {
        return this.materials.resolveReport(
            request.authenticatedUser,
            reportId,
            input,
            getRequestMetadata(request),
        );
    }

    @Patch(':id/moderation')
    moderate(
        @Req() request: AuthenticatedRequest,
        @Param('id', ParseIntPipe) materialId: number,
        @Body() input: ModerateMaterialDto,
    ) {
        return this.materials.moderate(
            request.authenticatedUser,
            materialId,
            input,
            getRequestMetadata(request),
        );
    }

    @Get('download')
    @Header('Cache-Control', 'private, no-store, max-age=0')
    async download(
        @Req() request: AuthenticatedRequest,
        @Query('item_id', ParseIntPipe) itemId: number,
        @Res({ passthrough: true }) response: Response,
    ) {
        const file = await this.materials.download(
            request.authenticatedUser,
            itemId,
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
