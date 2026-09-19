import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'node:path';

import {
    type BufferedUploadFile,
    PrivateFileStorageService,
} from '../../common/files/private-file-storage.service';

export const TEACHER_DOCUMENT_MAX_FILES = 1;
const DEFAULT_MAX_FILE_BYTES = 10 * 1024 * 1024;

export type TeacherDocumentUploadFile = BufferedUploadFile;

@Injectable()
export class TeacherDocumentFileStorageService {
    constructor(
        private readonly config: ConfigService,
        private readonly storage: PrivateFileStorageService,
    ) {}

    limits() {
        const maxFileBytes = this.positiveInteger(
            'UPLOAD_TEACHER_DOCUMENT_MAX_BYTES',
            DEFAULT_MAX_FILE_BYTES,
        );

        return {
            maxFiles: TEACHER_DOCUMENT_MAX_FILES,
            maxFileBytes,
            maxTotalBytes: maxFileBytes,
        };
    }

    validateUpload(file: TeacherDocumentUploadFile | undefined) {
        return this.storage.validateUploads(
            file ? [file] : [],
            this.limits(),
        );
    }

    storeUpload(
        teacherId: number,
        file: ReturnType<
            TeacherDocumentFileStorageService['validateUpload']
        >,
    ) {
        return this.storage.storeUploads(
            join('teacher-documents', String(teacherId)),
            file,
        );
    }

    readStoredFile(storedPath: string) {
        return this.storage.readStoredFile(
            storedPath,
            'Файл документа отсутствует на сервере',
        );
    }

    removeStoredPath(storedPath: string) {
        return this.storage.removeStoredPaths([storedPath]);
    }

    maxFileBytes(): number {
        return this.limits().maxFileBytes;
    }

    private positiveInteger(key: string, fallback: number): number {
        const value = Number(this.config.get(key));

        return Number.isSafeInteger(value) && value > 0 ? value : fallback;
    }
}
