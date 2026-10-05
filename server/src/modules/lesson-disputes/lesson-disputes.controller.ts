import {
    Body,
    Controller,
    Get,
    Header,
    Param,
    ParseIntPipe,
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
import { CreateLessonDisputeDto } from './dto/create-lesson-dispute.dto';
import { CreateLessonDisputeMessageDto } from './dto/create-lesson-dispute-message.dto';
import { ListLessonDisputesQueryDto } from './dto/list-lesson-disputes-query.dto';
import {
    LESSON_DISPUTE_MAX_FILES,
    type LessonDisputeUploadFile,
} from './lesson-dispute-file-storage.service';
import { LessonDisputesService } from './lesson-disputes.service';

@Controller('lesson-disputes')
@UseGuards(SessionAuthGuard)
export class LessonDisputesController {
    constructor(private readonly disputes: LessonDisputesService) {}

    @Get()
    list(
        @CurrentUser() user: SessionUser,
        @Query() query: ListLessonDisputesQueryDto,
    ) {
        return this.disputes.list(user, query);
    }

    @Get('options')
    options(
        @CurrentUser() user: SessionUser,
        @Query() query: ListLessonDisputesQueryDto,
    ) {
        return this.disputes.options(user, query.student_id);
    }

    @Get(':id')
    details(
        @CurrentUser() user: SessionUser,
        @Param('id', ParseIntPipe) disputeId: number,
    ) {
        return this.disputes.details(user, disputeId);
    }

    @Post()
    @UseInterceptors(FilesInterceptor('files[]', LESSON_DISPUTE_MAX_FILES))
    create(
        @CurrentUser() user: SessionUser,
        @Body() input: CreateLessonDisputeDto,
        @UploadedFiles() files: LessonDisputeUploadFile[] = [],
    ) {
        return this.disputes.create(user, input, files);
    }

    @Post(':id/messages')
    @UseInterceptors(FilesInterceptor('files[]', LESSON_DISPUTE_MAX_FILES))
    addMessage(
        @CurrentUser() user: SessionUser,
        @Param('id', ParseIntPipe) disputeId: number,
        @Body() input: CreateLessonDisputeMessageDto,
        @UploadedFiles() files: LessonDisputeUploadFile[] = [],
    ) {
        return this.disputes.addMessage(user, disputeId, input, files);
    }

    @Get(':id/attachments/:attachmentId')
    @Header('Cache-Control', 'private, no-store, max-age=0')
    async download(
        @CurrentUser() user: SessionUser,
        @Param('id', ParseIntPipe) disputeId: number,
        @Param('attachmentId', ParseIntPipe) attachmentId: number,
        @Res({ passthrough: true }) response: Response,
    ) {
        const file = await this.disputes.download(
            user,
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
