import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'node:path';

import {
    type BufferedUploadFile,
    PrivateFileStorageService,
} from '../../common/files/private-file-storage.service';

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

    storeUploads(materialId: number, files: ReturnType<
        MaterialFileStorageService['validateUploads']
    >) {
        return this.storage.storeUploads(
            join('materials', String(materialId)),
            files,
        );
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

    private positiveInteger(key: string, fallback: number): number {
        const value = Number(this.config.get(key));

        return Number.isSafeInteger(value) && value > 0 ? value : fallback;
    }
}
