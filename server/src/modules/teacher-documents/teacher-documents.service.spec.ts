import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { PrismaService } from '../../common/prisma/prisma.service';
import {
    TeacherDocumentStatus,
    TeacherDocumentType,
    UserRole,
    UserStatus,
} from '../../generated/prisma/enums';
import type { SessionUser } from '../auth/session-user';
import { TeacherDocumentFileStorageService } from './teacher-document-file-storage.service';
import { TeacherDocumentsService } from './teacher-documents.service';

const teacher: SessionUser = {
    id: 17,
    role: UserRole.TEACHER,
    email: 'teacher@example.com',
    fullName: 'Наталья Кузнецова',
    phone: null,
    avatarUrl: null,
    status: UserStatus.ACTIVE,
    emailVerifiedAt: new Date(),
    profileCompleted: true,
};

describe('TeacherDocumentsService', () => {
    it('stores a document privately and creates a pending record', async () => {
        const document = {
            id: 31,
            teacherId: teacher.id,
            educationId: 4,
            type: TeacherDocumentType.DIPLOMA,
            documentTitle: 'Диплом педагога',
            institution: 'Педагогический институт',
            documentYear: 1997,
            storedPath: 'teacher-documents/17/file.pdf',
            originalName: 'Диплом.pdf',
            mimeType: 'application/pdf',
            fileSize: BigInt(1200),
            status: TeacherDocumentStatus.PENDING,
            rejectionReason: null,
            checkedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const prisma = {
            teacherEducation: {
                findFirst: vi.fn().mockResolvedValue({ id: 4 }),
            },
            teacherDocument: {
                create: vi.fn().mockResolvedValue(document),
            },
        } as unknown as PrismaService;
        const files = {
            validateUpload: vi.fn().mockReturnValue([{
                extension: '.pdf',
                originalName: 'Диплом.pdf',
            }]),
            storeUpload: vi.fn().mockResolvedValue([{
                storedPath: document.storedPath,
                originalName: document.originalName,
                mimeType: document.mimeType,
                fileSize: 1200,
            }]),
            removeStoredPath: vi.fn(),
        } as unknown as TeacherDocumentFileStorageService;
        const service = new TeacherDocumentsService(prisma, files);

        await expect(service.upload(teacher, {
            type: 'diploma',
            document_title: ' Диплом педагога ',
            institution: 'Педагогический институт',
            document_year: 1997,
            education_id: 4,
        }, {
            originalname: 'Диплом.pdf',
            mimetype: 'application/pdf',
            size: 1200,
            buffer: Buffer.from('%PDF-1.4'),
        })).resolves.toMatchObject({
            success: true,
            document: {
                id: 31,
                status: 'pending',
                file_size: 1200,
            },
        });
        expect(prisma.teacherDocument.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                teacherId: teacher.id,
                educationId: 4,
                type: TeacherDocumentType.DIPLOMA,
                status: TeacherDocumentStatus.PENDING,
                storedPath: document.storedPath,
            }),
        });
    });

    it('does not delete another teacher document', async () => {
        const prisma = {
            teacherDocument: {
                findFirst: vi.fn().mockResolvedValue(null),
                delete: vi.fn(),
            },
        } as unknown as PrismaService;
        const files = {
            removeStoredPath: vi.fn(),
        } as unknown as TeacherDocumentFileStorageService;
        const service = new TeacherDocumentsService(prisma, files);

        await expect(service.delete(teacher, { document_id: 99 }))
            .rejects.toThrow('Документ не найден');
        expect(prisma.teacherDocument.delete).not.toHaveBeenCalled();
        expect(files.removeStoredPath).not.toHaveBeenCalled();
    });
});
