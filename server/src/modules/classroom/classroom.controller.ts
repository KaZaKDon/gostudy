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
import { createReadStream } from 'node:fs';
import type { Response } from 'express';

import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import type { SessionUser } from '../auth/session-user';
import {
    CLASSROOM_MAX_FILES,
    type ClassroomUploadFile,
} from './classroom-file-storage.service';
import { ClassroomService } from './classroom.service';
import { ClassroomFileDto } from './dto/classroom-file.dto';
import { ClassroomLessonDto } from './dto/classroom-lesson.dto';
import { DownloadClassroomFileQueryDto } from './dto/download-classroom-file-query.dto';
import { SaveClassroomNoteDto } from './dto/save-classroom-note.dto';
import { SendClassroomMessageDto } from './dto/send-classroom-message.dto';
import { ShareClassroomMaterialDto } from './dto/share-classroom-material.dto';
import { SyncClassroomDto } from './dto/sync-classroom.dto';

@Controller('classroom')
@UseGuards(SessionAuthGuard)
export class ClassroomController {
    constructor(private readonly classroom: ClassroomService) {}

    @Get('show')
    show(
        @CurrentUser() user: SessionUser,
        @Query() query: ClassroomLessonDto,
    ) {
        return this.classroom.show(user, query.lesson_id);
    }

    @Post('sync')
    sync(
        @CurrentUser() user: SessionUser,
        @Body() input: SyncClassroomDto,
    ) {
        return this.classroom.sync(user, input);
    }

    @Post('start')
    start(
        @CurrentUser() user: SessionUser,
        @Body() input: ClassroomLessonDto,
    ) {
        return this.classroom.start(user, input.lesson_id);
    }

    @Post('finish')
    finish(
        @CurrentUser() user: SessionUser,
        @Body() input: ClassroomLessonDto,
    ) {
        return this.classroom.finish(user, input.lesson_id);
    }

    @Post('send-message')
    sendMessage(
        @CurrentUser() user: SessionUser,
        @Body() input: SendClassroomMessageDto,
    ) {
        return this.classroom.sendMessage(user, input);
    }

    @Post('save-note')
    saveNote(
        @CurrentUser() user: SessionUser,
        @Body() input: SaveClassroomNoteDto,
    ) {
        return this.classroom.saveNote(user, input);
    }

    @Post('upload-file')
    @UseInterceptors(FilesInterceptor('files[]', CLASSROOM_MAX_FILES))
    uploadFiles(
        @CurrentUser() user: SessionUser,
        @Body() input: ClassroomLessonDto,
        @UploadedFiles() files: ClassroomUploadFile[] = [],
    ) {
        return this.classroom.uploadFiles(user, input.lesson_id, files);
    }

    @Post('delete-file')
    deleteFile(
        @CurrentUser() user: SessionUser,
        @Body() input: ClassroomFileDto,
    ) {
        return this.classroom.deleteFile(user, input);
    }

    @Get('download-file')
    @Header('Cache-Control', 'private, no-store, max-age=0')
    async downloadFile(
        @CurrentUser() user: SessionUser,
        @Query() query: DownloadClassroomFileQueryDto,
        @Res({ passthrough: true }) response: Response,
    ) {
        const file = await this.classroom.downloadFile(user, query.file_id);
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

    @Post('share-material')
    shareMaterial(
        @CurrentUser() user: SessionUser,
        @Body() input: ShareClassroomMaterialDto,
    ) {
        return this.classroom.shareMaterial(user, input);
    }

    @Post('stop-material-sharing')
    stopMaterialSharing(
        @CurrentUser() user: SessionUser,
        @Body() input: ClassroomLessonDto,
    ) {
        return this.classroom.stopMaterialSharing(user, input.lesson_id);
    }
}
