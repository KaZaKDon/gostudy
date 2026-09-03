import {
    Body,
    Controller,
    Get,
    Header,
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
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { DownloadHomeworkFileQueryDto } from './dto/download-homework-file-query.dto';
import {
    HomeworkIdDto,
    HomeworkIdQueryDto,
} from './dto/homework-id.dto';
import { ReviewHomeworkDto } from './dto/review-homework.dto';
import { SubmitHomeworkDto } from './dto/submit-homework.dto';
import {
    HOMEWORK_MAX_FILES,
    type HomeworkUploadFile,
} from './homework-file-storage.service';
import { HomeworkService } from './homework.service';

@Controller('homework')
@UseGuards(SessionAuthGuard)
export class HomeworkController {
    constructor(private readonly homework: HomeworkService) {}

    @Get()
    list(@CurrentUser() user: SessionUser) {
        return this.homework.list(user);
    }

    @Get('options')
    options(@CurrentUser() user: SessionUser) {
        return this.homework.options(user);
    }

    @Get('show')
    show(
        @CurrentUser() user: SessionUser,
        @Query() query: HomeworkIdQueryDto,
    ) {
        return this.homework.show(user, query.id);
    }

    @Post()
    @UseInterceptors(FilesInterceptor('files[]', HOMEWORK_MAX_FILES))
    create(
        @CurrentUser() user: SessionUser,
        @Body() input: CreateHomeworkDto,
        @UploadedFiles() files: HomeworkUploadFile[] = [],
    ) {
        return this.homework.create(user, input, files);
    }

    @Post('submit')
    @UseInterceptors(FilesInterceptor('files[]', HOMEWORK_MAX_FILES))
    submit(
        @CurrentUser() user: SessionUser,
        @Body() input: SubmitHomeworkDto,
        @UploadedFiles() files: HomeworkUploadFile[] = [],
    ) {
        return this.homework.submit(user, input, files);
    }

    @Post('review')
    review(
        @CurrentUser() user: SessionUser,
        @Body() input: ReviewHomeworkDto,
    ) {
        return this.homework.review(user, input);
    }

    @Post('cancel')
    cancel(
        @CurrentUser() user: SessionUser,
        @Body() input: HomeworkIdDto,
    ) {
        return this.homework.cancel(user, input.homework_id);
    }

    @Post('viewed')
    markViewed(
        @CurrentUser() user: SessionUser,
        @Body() input: HomeworkIdDto,
    ) {
        return this.homework.markViewed(user, input.homework_id);
    }

    @Get('download')
    @Header('Cache-Control', 'private, no-store, max-age=0')
    async download(
        @CurrentUser() user: SessionUser,
        @Query() query: DownloadHomeworkFileQueryDto,
        @Res({ passthrough: true }) response: Response,
    ) {
        const file = await this.homework.download(user, query);
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
