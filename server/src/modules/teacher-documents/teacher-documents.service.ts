import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
    UnsupportedMediaTypeException,
} from '@nestjs/common';
import { parse } from 'node:path';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
    TeacherDocumentStatus,
    TeacherDocumentType,
    UserRole,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import type { DeleteTeacherDocumentDto } from './dto/delete-teacher-document.dto';
import type { UploadTeacherDocumentDto } from './dto/upload-teacher-document.dto';
import {
    TeacherDocumentFileStorageService,
    type TeacherDocumentUploadFile,
} from './teacher-document-file-storage.service';

const TYPE_BY_VALUE: Record<UploadTeacherDocumentDto['type'], TeacherDocumentType> = {
    diploma: TeacherDocumentType.DIPLOMA,
    certificate: TeacherDocumentType.CERTIFICATE,
    qualification: TeacherDocumentType.QUALIFICATION,
    other: TeacherDocumentType.OTHER,
};

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp']);

@Injectable()
export class TeacherDocumentsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly files: TeacherDocumentFileStorageService,
    ) {}

    async upload(
        user: SessionUser,
        input: UploadTeacherDocumentDto,
        file: TeacherDocumentUploadFile | undefined,
    ) {
        this.requireTeacher(user);
        const validated = this.files.validateUpload(file);

        if (validated.length !== 1) {
            throw new BadRequestException('Выберите файл документа');
        }

        if (!ALLOWED_EXTENSIONS.has(validated[0].extension)) {
            throw new UnsupportedMediaTypeException(
                'Документ должен быть в формате PDF, JPG, PNG или WebP',
            );
        }

        if (input.education_id) {
            const education = await this.prisma.teacherEducation.findFirst({
                where: {
                    id: input.education_id,
                    teacherId: user.id,
                },
                select: { id: true },
            });

            if (!education) {
                throw new BadRequestException(
                    'Запись об образовании не принадлежит преподавателю',
                );
            }
        }

        const [stored] = await this.files.storeUpload(user.id, validated);
        const fallbackTitle = parse(stored.originalName).name.trim()
            || 'Документ';

        try {
            const document = await this.prisma.teacherDocument.create({
                data: {
                    teacherId: user.id,
                    educationId: input.education_id ?? null,
                    type: TYPE_BY_VALUE[input.type],
                    documentTitle: input.document_title?.trim()
                        || fallbackTitle.slice(0, 255),
                    institution: input.institution?.trim() || null,
                    documentYear: input.document_year ?? null,
                    storedPath: stored.storedPath,
                    originalName: stored.originalName,
                    mimeType: stored.mimeType,
                    fileSize: BigInt(stored.fileSize),
                    status: TeacherDocumentStatus.PENDING,
                },
            });

            return {
                success: true,
                message: 'Документ загружен и отправлен на проверку',
                document: this.serialize(document),
            };
        } catch (error) {
            await this.files.removeStoredPath(stored.storedPath);
            throw error;
        }
    }

    async delete(user: SessionUser, input: DeleteTeacherDocumentDto) {
        this.requireTeacher(user);
        const document = await this.prisma.teacherDocument.findFirst({
            where: {
                id: input.document_id,
                teacherId: user.id,
            },
        });

        if (!document) {
            throw new NotFoundException('Документ не найден');
        }

        await this.prisma.teacherDocument.delete({
            where: { id: document.id },
        });
        await this.files.removeStoredPath(document.storedPath);

        return {
            success: true,
            message: 'Документ удалён',
            document_id: document.id,
        };
    }

    async downloadOwn(user: SessionUser, documentId: number) {
        this.requireTeacher(user);
        const document = await this.prisma.teacherDocument.findFirst({
            where: { id: documentId, teacherId: user.id },
        });

        if (!document) {
            throw new NotFoundException('Документ не найден');
        }

        const stored = await this.files.readStoredFile(document.storedPath);

        return {
            ...stored,
            originalName: document.originalName,
            mimeType: document.mimeType,
        };
    }

    serialize(document: Record<string, any>) {
        return {
            id: document.id,
            teacher_id: document.teacherId,
            education_id: document.educationId,
            type: String(document.type).toLowerCase(),
            document_title: document.documentTitle,
            institution: document.institution,
            document_year: document.documentYear,
            original_name: document.originalName,
            mime_type: document.mimeType,
            file_size: Number(document.fileSize),
            status: String(document.status).toLowerCase(),
            reject_reason: document.rejectionReason,
            checked_at: document.checkedAt,
            created_at: document.createdAt,
            updated_at: document.updatedAt,
        };
    }

    private requireTeacher(user: SessionUser): void {
        if (user.role !== UserRole.TEACHER) {
            throw new ForbiddenException(
                'Документы доступны только преподавателю',
            );
        }
    }
}
