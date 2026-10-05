import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'node:path';

import {
    type BufferedUploadFile,
    PrivateFileStorageService,
    type StoredPrivateFile,
} from '../../common/files/private-file-storage.service';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import { MaterialOwnerType } from '../../generated/prisma/enums';

export const MATERIAL_MAX_FILES = 5;
const DEFAULT_MAX_FILE_BYTES = 20 * 1024 * 1024;
const DEFAULT_MAX_TOTAL_BYTES = 50 * 1024 * 1024;

export type MaterialUploadFile = BufferedUploadFile;

@Injectable()
export class MaterialFileStorageService {
    constructor(
        private readonly config: ConfigService,
        private readonly storage: PrivateFileStorageService,
    ) {}

    limits() {
        const maxFileBytes = this.positiveInteger(
            'UPLOAD_MATERIAL_MAX_BYTES',
            DEFAULT_MAX_FILE_BYTES,
        );

        return {
            maxFiles: MATERIAL_MAX_FILES,
            maxFileBytes,
            maxTotalBytes: Math.max(
                maxFileBytes,
                this.positiveInteger(
                    'UPLOAD_MATERIAL_TOTAL_MAX_BYTES',
                    DEFAULT_MAX_TOTAL_BYTES,
                ),
            ),
        };
    }

    validateUploads(files: MaterialUploadFile[]) {
        return this.storage.validateUploads(files, this.limits());
    }

    storeUploads(
        ownerType: MaterialOwnerType,
        ownerId: number,
        materialId: number,
        files: ReturnType<MaterialFileStorageService['validateUploads']>,
    ) {
        const relativeDirectory = join('materials', String(materialId));
        return ownerType === MaterialOwnerType.PLATFORM
            ? this.storage.storePlatformUploads(relativeDirectory, files)
            : this.storage.storeUploads(ownerId, relativeDirectory, files);
    }

    readStoredFile(storedPath: string) {
        return this.storage.readStoredFile(
            storedPath,
            'Файл материала отсутствует на сервере',
        );
    }

    removeStoredPaths(storedPaths: string[]) {
        return this.storage.removeStoredPaths(storedPaths);
    }

    releaseQuota(
        ownerId: number,
        byteCount: number | bigint,
        database?: PrismaService | Prisma.TransactionClient,
    ) {
        return this.storage.releaseQuota(ownerId, byteCount, database);
    }

    discardStoredFiles(
        ownerType: MaterialOwnerType,
        ownerId: number,
        files: StoredPrivateFile[],
    ) {
        return ownerType === MaterialOwnerType.PLATFORM
            ? this.storage.discardPlatformStoredFiles(files)
            : this.storage.discardStoredFiles(ownerId, files);
    }

    private positiveInteger(key: string, fallback: number): number {
        const value = Number(this.config.get(key));

        return Number.isSafeInteger(value) && value > 0 ? value : fallback;
    }
}
