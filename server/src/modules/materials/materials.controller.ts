import {
    Body,
    Controller,
    Get,
    Header,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
    Res,
    StreamableFile,
    UploadedFiles,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { createReadStream } from 'node:fs';

import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import type { SessionUser } from '../auth/session-user';
import { AssignMaterialDto } from './dto/assign-material.dto';
import { CreateMaterialDto } from './dto/create-material.dto';
import { ListMaterialsQueryDto } from './dto/list-materials-query.dto';
import {
    MaterialIdQueryDto,
    MaterialItemIdQueryDto,
} from './dto/material-id.dto';
import { ReportMaterialDto } from './dto/report-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import {
    MATERIAL_MAX_FILES,
    type MaterialUploadFile,
} from './material-file-storage.service';
import { MaterialsService } from './materials.service';

@Controller('materials')
@UseGuards(SessionAuthGuard)
export class MaterialsController {
    constructor(private readonly materials: MaterialsService) {}

    @Get()
    list(
        @CurrentUser() user: SessionUser,
        @Query() query: ListMaterialsQueryDto,
    ) {
        return this.materials.list(user, query);
    }

    @Get('options')
    options(@CurrentUser() user: SessionUser) {
        return this.materials.options(user);
    }

    @Get('show')
    show(
        @CurrentUser() user: SessionUser,
        @Query() query: MaterialIdQueryDto,
    ) {
        return this.materials.show(user, query.id);
    }

    @Post()
    @UseInterceptors(FilesInterceptor('files[]', MATERIAL_MAX_FILES))
    create(
        @CurrentUser() user: SessionUser,
        @Body() input: CreateMaterialDto,
        @UploadedFiles() files: MaterialUploadFile[] = [],
    ) {
        return this.materials.create(user, input, files);
    }

    @Patch(':id')
    update(
        @CurrentUser() user: SessionUser,
        @Param('id', ParseIntPipe) materialId: number,
        @Body() input: UpdateMaterialDto,
    ) {
        return this.materials.update(user, materialId, input);
    }

    @Post(':id/submit-moderation')
    submitModeration(
        @CurrentUser() user: SessionUser,
        @Param('id', ParseIntPipe) materialId: number,
    ) {
        return this.materials.submitModeration(user, materialId);
    }

    @Post(':id/hide')
    hide(
        @CurrentUser() user: SessionUser,
        @Param('id', ParseIntPipe) materialId: number,
    ) {
        return this.materials.hide(user, materialId);
    }

    @Post(':id/assign')
    assign(
        @CurrentUser() user: SessionUser,
        @Param('id', ParseIntPipe) materialId: number,
        @Body() input: AssignMaterialDto,
    ) {
        return this.materials.assign(user, materialId, input);
    }

    @Post(':id/unassign')
    unassign(
        @CurrentUser() user: SessionUser,
        @Param('id', ParseIntPipe) materialId: number,
        @Body() input: AssignMaterialDto,
    ) {
        return this.materials.unassign(user, materialId, input);
    }

    @Post(':id/report')
    report(
        @CurrentUser() user: SessionUser,
        @Param('id', ParseIntPipe) materialId: number,
        @Body() input: ReportMaterialDto,
    ) {
        return this.materials.report(user, materialId, input);
    }

    @Get('download')
    @Header('Cache-Control', 'private, no-store, max-age=0')
    async download(
        @CurrentUser() user: SessionUser,
        @Query() query: MaterialItemIdQueryDto,
        @Res({ passthrough: true }) response: Response,
    ) {
        const file = await this.materials.download(user, query.item_id);
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
