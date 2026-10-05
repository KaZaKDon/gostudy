import { ConfigService } from '@nestjs/config';
import { join } from 'node:path';
import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    PrivateFileStorageService,
    type StoredPrivateFile,
} from '../../common/files/private-file-storage.service';
import { MaterialOwnerType } from '../../generated/prisma/enums';
import { MaterialFileStorageService } from './material-file-storage.service';

function createService() {
    const storage = {
        storeUploads: vi.fn().mockResolvedValue([]),
        storePlatformUploads: vi.fn().mockResolvedValue([]),
        discardStoredFiles: vi.fn().mockResolvedValue(undefined),
        discardPlatformStoredFiles: vi.fn().mockResolvedValue(undefined),
    } as unknown as PrivateFileStorageService;

    return {
        service: new MaterialFileStorageService(
            new ConfigService({}),
            storage,
        ),
        storage,
    };
}

describe('MaterialFileStorageService quota ownership', () => {
    it('uses the creator quota for a teacher material', async () => {
        const { service, storage } = createService();

        await service.storeUploads(MaterialOwnerType.TEACHER, 17, 42, []);

        expect(storage.storeUploads).toHaveBeenCalledWith(
            17,
            join('materials', '42'),
            [],
        );
        expect(storage.storePlatformUploads).not.toHaveBeenCalled();
    });

    it('stores a GoStudy material outside the creator quota', async () => {
        const { service, storage } = createService();

        await service.storeUploads(MaterialOwnerType.PLATFORM, 17, 42, []);

        expect(storage.storePlatformUploads).toHaveBeenCalledWith(
            join('materials', '42'),
            [],
        );
        expect(storage.storeUploads).not.toHaveBeenCalled();
    });

    it('does not release a user quota when a GoStudy file is discarded', async () => {
        const { service, storage } = createService();
        const files = [{
            originalName: 'guide.pdf',
            mimeType: 'application/pdf',
            fileSize: 512,
            storedPath: 'materials/42/guide.pdf',
        }] satisfies StoredPrivateFile[];

        await service.discardStoredFiles(
            MaterialOwnerType.PLATFORM,
            17,
            files,
        );

        expect(storage.discardPlatformStoredFiles).toHaveBeenCalledWith(files);
        expect(storage.discardStoredFiles).not.toHaveBeenCalled();
    });
});
