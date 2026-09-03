import { UnsupportedMediaTypeException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';

import { PrivateFileStorageService } from '../../common/files/private-file-storage.service';
import {
    ClassroomFileStorageService,
    type ClassroomUploadFile,
} from './classroom-file-storage.service';

function upload(overrides: Partial<ClassroomUploadFile> = {}): ClassroomUploadFile {
    const buffer = Buffer.from('%PDF-1.7 test');
    return {
        originalname: 'lesson.pdf',
        mimetype: 'application/pdf',
        size: buffer.length,
        buffer,
        ...overrides,
    };
}

describe('ClassroomFileStorageService', () => {
    const config = new ConfigService({});
    const service = new ClassroomFileStorageService(
        config,
        new PrivateFileStorageService(config),
    );

    it('accepts a supported file with a matching signature', () => {
        const result = service.validateUploads([upload()]);

        expect(result[0]).toMatchObject({
            originalName: 'lesson.pdf',
            extension: '.pdf',
            mimeType: 'application/pdf',
        });
    });

    it('normalizes a UTF-8 filename decoded as Latin-1', () => {
        const originalName = 'Материалы к уроку №1.pdf';
        const result = service.validateUploads([upload({
            originalname: Buffer.from(originalName, 'utf8').toString('latin1'),
        })]);

        expect(result[0].originalName).toBe(originalName);
    });

    it('rejects content that does not match the extension', () => {
        expect(() => service.validateUploads([upload({
            buffer: Buffer.from('<html>not a pdf</html>'),
        })])).toThrow(UnsupportedMediaTypeException);
    });
});
