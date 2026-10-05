import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'node:path';

import {
    type BufferedUploadFile,
    PrivateFileStorageService,
    type StoredPrivateFile,
} from '../../common/files/private-file-storage.service';

export const LESSON_DISPUTE_MAX_FILES = 5;
const DEFAULT_MAX_FILE_BYTES = 10 * 1024 * 1024;
const DEFAULT_MAX_TOTAL_BYTES = 30 * 1024 * 1024;

export type LessonDisputeUploadFile = BufferedUploadFile;

@Injectable()
export class LessonDisputeFileStorageService {
    constructor(
        private readonly config: ConfigService,
        private readonly storage: PrivateFileStorageService,
    ) {}

    limits() {
        const maxFileBytes = this.positiveInteger(
            'UPLOAD_DISPUTE_MAX_BYTES',
            DEFAULT_MAX_FILE_BYTES,
        );

        return {
            maxFiles: LESSON_DISPUTE_MAX_FILES,
            maxFileBytes,
            maxTotalBytes: Math.max(
                maxFileBytes,
                this.positiveInteger(
                    'UPLOAD_DISPUTE_TOTAL_MAX_BYTES',
                    DEFAULT_MAX_TOTAL_BYTES,
                ),
            ),
        };
    }

    validateUploads(files: LessonDisputeUploadFile[]) {
        return this.storage.validateUploads(files, this.limits());
    }

    storeUploads(
        ownerId: number,
        disputeId: number,
        messageId: number | null,
        files: ReturnType<LessonDisputeFileStorageService['validateUploads']>,
    ) {
        return this.storage.storeUploads(
            ownerId,
            messageId
                ? join('lesson-disputes', String(disputeId), 'messages', String(messageId))
                : join('lesson-disputes', String(disputeId), 'claim'),
            files,
        );
    }

    readStoredFile(path: string) {
        return this.storage.readStoredFile(
            path,
            'Вложение спора отсутствует на сервере',
        );
    }

    discardStoredFiles(ownerId: number, files: StoredPrivateFile[]) {
        return this.storage.discardStoredFiles(ownerId, files);
    }

    private positiveInteger(key: string, fallback: number): number {
        const value = Number(this.config.get(key));
        return Number.isSafeInteger(value) && value > 0 ? value : fallback;
    }
}
