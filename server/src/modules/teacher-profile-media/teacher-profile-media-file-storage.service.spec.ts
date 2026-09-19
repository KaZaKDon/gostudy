import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { PrivateFileStorageService } from '../../common/files/private-file-storage.service';
import { TeacherProfileMediaFileStorageService } from './teacher-profile-media-file-storage.service';

function png(width: number, height: number) {
    const buffer = Buffer.alloc(24);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
        .copy(buffer, 0);
    buffer.writeUInt32BE(width, 16);
    buffer.writeUInt32BE(height, 20);
    return buffer;
}

describe('TeacherProfileMediaFileStorageService', () => {
    it('rejects a profile photo smaller than 300 by 300 pixels', () => {
        const file = {
            originalname: 'small.png',
            mimetype: 'image/png',
            size: 24,
            buffer: png(299, 300),
        };
        const storage = {
            validateUploads: vi.fn().mockReturnValue([{
                file,
                originalName: 'small.png',
                extension: '.png',
                mimeType: 'image/png',
            }]),
        } as unknown as PrivateFileStorageService;
        const service = new TeacherProfileMediaFileStorageService(
            { get: vi.fn() } as unknown as ConfigService,
            storage,
        );

        expect(() => service.validateUpload('photo', file))
            .toThrow(BadRequestException);
    });
});
