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
import {
    MessageAttachmentQueryDto,
    MessageDialogQueryDto,
    MessageThreadQueryDto,
} from './dto/message-dialog-query.dto';
import { ReportMessageDto } from './dto/report-message.dto';
import { SendMessageDto } from './dto/send-message.dto';
import {
    MESSAGE_MAX_FILES,
    type MessageUploadFile,
} from './message-file-storage.service';
import { MessagesService } from './messages.service';

@Controller('messages')
@UseGuards(SessionAuthGuard)
export class MessagesController {
    constructor(private readonly messages: MessagesService) {}

    @Get('dialogs')
    dialogs(@CurrentUser() user: SessionUser) {
        return this.messages.dialogs(user);
    }

    @Get('thread')
    thread(
        @CurrentUser() user: SessionUser,
        @Query() query: MessageThreadQueryDto,
    ) {
        return this.messages.thread(user, query);
    }

    @Post('send')
    @UseInterceptors(FilesInterceptor('files[]', MESSAGE_MAX_FILES))
    send(
        @CurrentUser() user: SessionUser,
        @Body() input: SendMessageDto,
        @UploadedFiles() files: MessageUploadFile[] = [],
    ) {
        return this.messages.send(user, input, files);
    }

    @Post('read')
    markRead(
        @CurrentUser() user: SessionUser,
        @Body() input: MessageDialogQueryDto,
    ) {
        return this.messages.markRead(user, input);
    }

    @Post('report')
    report(
        @CurrentUser() user: SessionUser,
        @Body() input: ReportMessageDto,
    ) {
        return this.messages.report(user, input);
    }

    @Get('download')
    @Header('Cache-Control', 'private, no-store, max-age=0')
    async download(
        @CurrentUser() user: SessionUser,
        @Query() query: MessageAttachmentQueryDto,
        @Res({ passthrough: true }) response: Response,
    ) {
        const file = await this.messages.download(user, query.attachment_id);
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
