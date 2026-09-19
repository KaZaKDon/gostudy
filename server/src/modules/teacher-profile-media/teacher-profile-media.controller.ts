import {
    Body,
    Controller,
    Get,
    Header,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Post,
    Req,
    Res,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type {
    Request,
    Response,
} from 'express';
import { createReadStream } from 'node:fs';

import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import type { SessionUser } from '../auth/session-user';
import { DeleteTeacherProfileMediaDto } from './dto/delete-teacher-profile-media.dto';
import {
    DEFAULT_TEACHER_PHOTO_MAX_BYTES,
    DEFAULT_TEACHER_VIDEO_MAX_BYTES,
    type TeacherProfileMediaUploadFile,
} from './teacher-profile-media-file-storage.service';
import { TeacherProfileMediaService } from './teacher-profile-media.service';

type StoredMediaResult = {
    absolutePath: string;
    size: number;
    originalName: string;
    mimeType: string;
};

function sendMediaFile(
    request: Request,
    response: Response,
    file: StoredMediaResult,
    cacheControl: string,
) {
    const encodedName = encodeURIComponent(file.originalName)
        .replace(/\*/g, '%2A');
    response.setHeader(
        'Content-Disposition',
        `inline; filename="media"; filename*=UTF-8''${encodedName}`,
    );
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', cacheControl);
    response.setHeader('Accept-Ranges', 'bytes');

    const range = request.headers.range;
    if (range && file.mimeType.startsWith('video/')) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
        const suffixLength = match && !match[1] && match[2]
            ? Number(match[2])
            : null;
        const start = suffixLength !== null
            ? Math.max(file.size - suffixLength, 0)
            : match?.[1]
                ? Number(match[1])
                : 0;
        const requestedEnd = suffixLength !== null
            ? file.size - 1
            : match?.[2]
                ? Number(match[2])
                : file.size - 1;
        const end = Math.min(requestedEnd, file.size - 1);

        if (
            !match
            || (!match[1] && !match[2])
            || !Number.isSafeInteger(start)
            || !Number.isSafeInteger(end)
            || start < 0
            || start > end
        ) {
            response.status(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE);
            response.setHeader('Content-Range', `bytes */${file.size}`);
            response.end();
            return;
        }

        response.status(HttpStatus.PARTIAL_CONTENT);
        response.setHeader('Content-Range', `bytes ${start}-${end}/${file.size}`);
        response.setHeader('Content-Length', end - start + 1);
        createReadStream(file.absolutePath, { start, end }).pipe(response);
        return;
    }

    response.status(HttpStatus.OK);
    response.setHeader('Content-Length', file.size);
    createReadStream(file.absolutePath).pipe(response);
}

@Controller('profile/teacher/media')
@UseGuards(SessionAuthGuard)
export class TeacherProfileMediaController {
    constructor(private readonly media: TeacherProfileMediaService) {}

    @Post('photo')
    @UseInterceptors(FileInterceptor('file', {
        limits: { files: 1, fileSize: DEFAULT_TEACHER_PHOTO_MAX_BYTES },
    }))
    uploadPhoto(
        @CurrentUser() user: SessionUser,
        @UploadedFile() file: TeacherProfileMediaUploadFile | undefined,
    ) {
        return this.media.upload(user, 'photo', file);
    }

    @Post('video')
    @UseInterceptors(FileInterceptor('file', {
        limits: { files: 1, fileSize: DEFAULT_TEACHER_VIDEO_MAX_BYTES },
    }))
    uploadVideo(
        @CurrentUser() user: SessionUser,
        @UploadedFile() file: TeacherProfileMediaUploadFile | undefined,
    ) {
        return this.media.upload(user, 'video', file);
    }

    @Post('delete')
    @HttpCode(HttpStatus.OK)
    delete(
        @CurrentUser() user: SessionUser,
        @Body() input: DeleteTeacherProfileMediaDto,
    ) {
        return this.media.delete(user, input);
    }

    @Get(':id/file')
    @Header('Cache-Control', 'private, no-store, max-age=0')
    async downloadOwn(
        @CurrentUser() user: SessionUser,
        @Param('id', ParseIntPipe) mediaId: number,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const file = await this.media.downloadOwn(user, mediaId);
        sendMediaFile(request, response, file, 'private, no-store, max-age=0');
    }
}

@Controller('teachers/profile-media')
export class PublicTeacherProfileMediaController {
    constructor(private readonly media: TeacherProfileMediaService) {}

    @Get(':id')
    @Header('Cross-Origin-Resource-Policy', 'cross-origin')
    async downloadPublic(
        @Param('id', ParseIntPipe) mediaId: number,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        const file = await this.media.downloadPublic(mediaId);
        response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        sendMediaFile(
            request,
            response,
            file,
            'public, max-age=86400, immutable',
        );
    }
}
