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
    Res,
    StreamableFile,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { createReadStream } from 'node:fs';

import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import type { SessionUser } from '../auth/session-user';
import { DeleteTeacherDocumentDto } from '../teacher-documents/dto/delete-teacher-document.dto';
import { UploadTeacherDocumentDto } from '../teacher-documents/dto/upload-teacher-document.dto';
import type { TeacherDocumentUploadFile } from '../teacher-documents/teacher-document-file-storage.service';
import { TeacherDocumentsService } from '../teacher-documents/teacher-documents.service';
import { UpdateAccountDto } from './dto/update-account.dto';
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto';
import { UpdateTeacherProfileDto } from './dto/update-teacher-profile.dto';
import { UpdateTeacherVisibilityDto } from './dto/update-teacher-visibility.dto';
import { ProfileService } from './profile.service';

@Controller('profile')
@UseGuards(SessionAuthGuard)
export class ProfileController {
    constructor(
        private readonly profileService: ProfileService,
        private readonly teacherDocuments: TeacherDocumentsService,
    ) {}

    @Get('me')
    async me(
        @CurrentUser() user: SessionUser,
    ): Promise<Record<string, unknown>> {
        return this.profileService.getMe(user);
    }

    @Post('account')
    @HttpCode(HttpStatus.OK)
    async updateAccount(
        @CurrentUser() user: SessionUser,
        @Body() input: UpdateAccountDto,
    ): Promise<Record<string, unknown>> {
        return this.profileService.updateAccount(user, input);
    }

    @Get('teacher-options')
    async teacherOptions(
        @CurrentUser() user: SessionUser,
    ): Promise<Record<string, unknown>> {
        return this.profileService.getTeacherOptions(user);
    }

    @Post('teacher')
    @HttpCode(HttpStatus.OK)
    async updateTeacher(
        @CurrentUser() user: SessionUser,
        @Body() input: UpdateTeacherProfileDto,
    ): Promise<Record<string, unknown>> {
        return this.profileService.updateTeacherProfile(user, input);
    }

    @Post('teacher/visibility')
    @HttpCode(HttpStatus.OK)
    async updateTeacherVisibility(
        @CurrentUser() user: SessionUser,
        @Body() input: UpdateTeacherVisibilityDto,
    ): Promise<Record<string, unknown>> {
        return this.profileService.updateTeacherVisibility(user, input);
    }

    @Post('teacher/documents')
    @UseInterceptors(FileInterceptor('file'))
    uploadTeacherDocument(
        @CurrentUser() user: SessionUser,
        @Body() input: UploadTeacherDocumentDto,
        @UploadedFile() file: TeacherDocumentUploadFile | undefined,
    ) {
        return this.teacherDocuments.upload(user, input, file);
    }

    @Post('teacher/documents/delete')
    @HttpCode(HttpStatus.OK)
    deleteTeacherDocument(
        @CurrentUser() user: SessionUser,
        @Body() input: DeleteTeacherDocumentDto,
    ) {
        return this.teacherDocuments.delete(user, input);
    }

    @Get('teacher/documents/:id/file')
    @Header('Cache-Control', 'private, no-store, max-age=0')
    async downloadTeacherDocument(
        @CurrentUser() user: SessionUser,
        @Param('id', ParseIntPipe) documentId: number,
        @Res({ passthrough: true }) response: Response,
    ) {
        const file = await this.teacherDocuments.downloadOwn(user, documentId);
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

    @Get('student')
    async student(
        @CurrentUser() user: SessionUser,
    ): Promise<Record<string, unknown>> {
        return this.profileService.getStudentProfile(user);
    }

    @Post('student')
    @HttpCode(HttpStatus.OK)
    async updateStudent(
        @CurrentUser() user: SessionUser,
        @Body() input: UpdateStudentProfileDto,
    ): Promise<Record<string, unknown>> {
        return this.profileService.updateStudentProfile(user, input);
    }
}
