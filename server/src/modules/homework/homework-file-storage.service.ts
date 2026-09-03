import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'node:path';

import {
    type BufferedUploadFile,
    PrivateFileStorageService,
} from '../../common/files/private-file-storage.service';

export const HOMEWORK_MAX_FILES = 5;
const DEFAULT_MAX_FILE_BYTES = 10 * 1024 * 1024;
const DEFAULT_MAX_TOTAL_BYTES = 30 * 1024 * 1024;

export type HomeworkUploadFile = BufferedUploadFile;

@Injectable()
export class HomeworkFileStorageService {
    constructor(
        private readonly config: ConfigService,
        private readonly storage: PrivateFileStorageService,
    ) {}

    limits() {
        const maxFileBytes = this.positiveInteger(
            'UPLOAD_HOMEWORK_MAX_BYTES',
            DEFAULT_MAX_FILE_BYTES,
        );

        return {
            maxFiles: HOMEWORK_MAX_FILES,
            maxFileBytes,
            maxTotalBytes: Math.max(
                maxFileBytes,
                this.positiveInteger(
                    'UPLOAD_HOMEWORK_TOTAL_MAX_BYTES',
                    DEFAULT_MAX_TOTAL_BYTES,
                ),
            ),
        };
    }

    validateUploads(files: HomeworkUploadFile[]) {
        return this.storage.validateUploads(files, this.limits());
    }

    storeAssignment(homeworkId: number, files: ReturnType<
        HomeworkFileStorageService['validateUploads']
    >) {
        return this.storage.storeUploads(
            join('homework', String(homeworkId), 'assignment'),
            files,
        );
    }

    storeSubmission(
        homeworkId: number,
        attemptNumber: number,
        files: ReturnType<HomeworkFileStorageService['validateUploads']>,
    ) {
        return this.storage.storeUploads(
            join(
                'homework',
                String(homeworkId),
                `attempt-${attemptNumber}`,
            ),
            files,
        );
    }

    readStoredFile(storedPath: string) {
        return this.storage.readStoredFile(
            storedPath,
            'Файл домашнего задания отсутствует на сервере',
        );
    }

    removeStoredPaths(storedPaths: string[]): Promise<void> {
        return this.storage.removeStoredPaths(storedPaths);
    }

    private positiveInteger(key: string, fallback: number): number {
        const value = Number(this.config.get(key));

        return Number.isSafeInteger(value) && value > 0 ? value : fallback;
    }
}
