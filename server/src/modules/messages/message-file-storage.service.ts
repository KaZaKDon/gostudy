import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'node:path';

import {
    type BufferedUploadFile,
    PrivateFileStorageService,
} from '../../common/files/private-file-storage.service';

export const MESSAGE_MAX_FILES = 5;
const DEFAULT_MAX_FILE_BYTES = 10 * 1024 * 1024;
const DEFAULT_MAX_TOTAL_BYTES = 30 * 1024 * 1024;

export type MessageUploadFile = BufferedUploadFile;

@Injectable()
export class MessageFileStorageService {
    constructor(
        private readonly config: ConfigService,
        private readonly storage: PrivateFileStorageService,
    ) {}

    limits() {
        const maxFileBytes = this.positiveInteger(
            'UPLOAD_MESSAGE_MAX_BYTES',
            DEFAULT_MAX_FILE_BYTES,
        );

        return {
            maxFiles: MESSAGE_MAX_FILES,
            maxFileBytes,
            maxTotalBytes: Math.max(
                maxFileBytes,
                this.positiveInteger(
                    'UPLOAD_MESSAGE_TOTAL_MAX_BYTES',
                    DEFAULT_MAX_TOTAL_BYTES,
                ),
            ),
        };
    }

    validateUploads(files: MessageUploadFile[]) {
        return this.storage.validateUploads(files, this.limits());
    }

    storeUploads(
        messageId: number,
        files: ReturnType<MessageFileStorageService['validateUploads']>,
    ) {
        return this.storage.storeUploads(
            join('messages', String(messageId)),
            files,
        );
    }

    readStoredFile(path: string) {
        return this.storage.readStoredFile(
            path,
            'Вложение сообщения отсутствует на сервере',
        );
    }

    removeStoredPaths(paths: string[]) {
        return this.storage.removeStoredPaths(paths);
    }

    private positiveInteger(key: string, fallback: number): number {
        const value = Number(this.config.get(key));
        return Number.isSafeInteger(value) && value > 0 ? value : fallback;
    }
}
