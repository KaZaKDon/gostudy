import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';

import { PrivateFileStorageService } from '../../common/files/private-file-storage.service';
import { HomeworkFileStorageService } from './homework-file-storage.service';

describe('HomeworkFileStorageService', () => {
    it('uses separate one-file and total upload limits', () => {
        const config = new ConfigService({
            UPLOAD_HOMEWORK_MAX_BYTES: '1024',
            UPLOAD_HOMEWORK_TOTAL_MAX_BYTES: '4096',
        });
        const service = new HomeworkFileStorageService(
            config,
            new PrivateFileStorageService(config),
        );

        expect(service.limits()).toEqual({
            maxFiles: 5,
            maxFileBytes: 1024,
            maxTotalBytes: 4096,
        });
    });
});
