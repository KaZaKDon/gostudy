import {
    BadRequestException,
    Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'node:path';

import {
    type BufferedUploadFile,
    PrivateFileStorageService,
    type StoredPrivateFile,
} from '../../common/files/private-file-storage.service';

export const CLASSROOM_MAX_FILES = 5;
const DEFAULT_MAX_FILE_BYTES = 10 * 1024 * 1024;
const DEFAULT_MAX_TOTAL_BYTES = 30 * 1024 * 1024;
const DEFAULT_LESSON_MAX_BYTES = 100 * 1024 * 1024;

export type ClassroomUploadFile = BufferedUploadFile;
export type PreparedClassroomFile = StoredPrivateFile;

@Injectable()
export class ClassroomFileStorageService {
    constructor(
        private readonly config: ConfigService,
        private readonly storage: PrivateFileStorageService,
    ) {}

    limits() {
        const maxFileBytes = this.positiveInteger(
            'UPLOAD_CLASSROOM_MAX_BYTES',
            DEFAULT_MAX_FILE_BYTES,
        );
        const maxTotalBytes = Math.max(
            maxFileBytes,
            this.positiveInteger(
                'UPLOAD_CLASSROOM_TOTAL_MAX_BYTES',
                DEFAULT_MAX_TOTAL_BYTES,
            ),
        );

        return {
            maxFiles: CLASSROOM_MAX_FILES,
            maxFileBytes,
            maxTotalBytes,
            lessonMaxBytes: Math.max(
                maxTotalBytes,
                this.positiveInteger(
                    'UPLOAD_CLASSROOM_LESSON_MAX_BYTES',
                    DEFAULT_LESSON_MAX_BYTES,
                ),
            ),
        };
    }

    validateUploads(files: ClassroomUploadFile[]) {
        if (!files.length) {
            throw new BadRequestException('Выберите хотя бы один файл');
        }

        return this.storage.validateUploads(files, this.limits());
    }

    storeUploads(
        lessonId: number,
        validated: ReturnType<ClassroomFileStorageService['validateUploads']>,
    ): Promise<PreparedClassroomFile[]> {
        return this.storage.storeUploads(
            join('classroom', String(lessonId), 'materials'),
            validated,
        );
    }

    readStoredFile(storedPath: string) {
        return this.storage.readStoredFile(
            storedPath,
            'Файл материала отсутствует на сервере',
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
