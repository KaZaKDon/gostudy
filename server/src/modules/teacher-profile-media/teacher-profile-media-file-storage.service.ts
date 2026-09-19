import {
    BadRequestException,
    Injectable,
    UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'node:path';

import {
    type BufferedUploadFile,
    PrivateFileStorageService,
    type ValidatedPrivateUpload,
} from '../../common/files/private-file-storage.service';

export const DEFAULT_TEACHER_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const DEFAULT_TEACHER_VIDEO_MAX_BYTES = 100 * 1024 * 1024;

export type TeacherProfileMediaUploadFile = BufferedUploadFile;
export type TeacherProfileMediaInputType = 'photo' | 'video';

const PHOTO_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm']);

@Injectable()
export class TeacherProfileMediaFileStorageService {
    constructor(
        private readonly config: ConfigService,
        private readonly storage: PrivateFileStorageService,
    ) {}

    validateUpload(
        type: TeacherProfileMediaInputType,
        file: TeacherProfileMediaUploadFile | undefined,
    ): ValidatedPrivateUpload {
        const maxFileBytes = type === 'photo'
            ? this.photoMaxBytes()
            : this.videoMaxBytes();
        const validated = this.storage.validateUploads(
            file ? [file] : [],
            { maxFiles: 1, maxFileBytes, maxTotalBytes: maxFileBytes },
        );

        if (validated.length !== 1) {
            throw new BadRequestException('Выберите файл');
        }

        const item = validated[0];
        const allowed = type === 'photo' ? PHOTO_EXTENSIONS : VIDEO_EXTENSIONS;
        if (!allowed.has(item.extension)) {
            throw new UnsupportedMediaTypeException(
                type === 'photo'
                    ? 'Фото должно быть в формате JPG, PNG или WebP'
                    : 'Видео должно быть в формате MP4 или WebM',
            );
        }

        if (type === 'photo') {
            const dimensions = this.imageDimensions(
                item.file.buffer,
                item.extension,
            );
            if (!dimensions) {
                throw new UnsupportedMediaTypeException(
                    'Не удалось определить размер изображения',
                );
            }
            if (dimensions.width < 300 || dimensions.height < 300) {
                throw new BadRequestException(
                    'Размер фотографии должен быть не меньше 300 × 300 пикселей',
                );
            }
        }

        return item;
    }

    async storeUpload(
        teacherId: number,
        type: TeacherProfileMediaInputType,
        file: ValidatedPrivateUpload,
    ) {
        const [stored] = await this.storage.storeUploads(
            join('teacher-profile-media', String(teacherId), type),
            [file],
        );

        return stored;
    }

    readStoredFile(storedPath: string) {
        return this.storage.readStoredFile(
            storedPath,
            'Файл профиля отсутствует на сервере',
        );
    }

    removeStoredPath(storedPath: string) {
        return this.storage.removeStoredPaths([storedPath]);
    }

    removeStoredPaths(storedPaths: string[]) {
        return this.storage.removeStoredPaths(storedPaths);
    }

    photoMaxBytes(): number {
        return this.positiveInteger(
            'UPLOAD_TEACHER_PHOTO_MAX_BYTES',
            DEFAULT_TEACHER_PHOTO_MAX_BYTES,
        );
    }

    videoMaxBytes(): number {
        return this.positiveInteger(
            'UPLOAD_TEACHER_VIDEO_MAX_BYTES',
            DEFAULT_TEACHER_VIDEO_MAX_BYTES,
        );
    }

    private positiveInteger(key: string, fallback: number): number {
        const value = Number(this.config.get(key));
        return Number.isSafeInteger(value) && value > 0 ? value : fallback;
    }

    private imageDimensions(
        buffer: Buffer,
        extension: string,
    ): { width: number; height: number } | null {
        if (extension === '.png' && buffer.length >= 24) {
            return {
                width: buffer.readUInt32BE(16),
                height: buffer.readUInt32BE(20),
            };
        }

        if (extension === '.jpg' || extension === '.jpeg') {
            let offset = 2;
            while (offset + 8 < buffer.length) {
                if (buffer[offset] !== 0xff) return null;
                const marker = buffer[offset + 1];
                const length = buffer.readUInt16BE(offset + 2);
                if (length < 2) return null;
                if (
                    [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]
                        .includes(marker)
                ) {
                    return {
                        height: buffer.readUInt16BE(offset + 5),
                        width: buffer.readUInt16BE(offset + 7),
                    };
                }
                offset += 2 + length;
            }
            return null;
        }

        if (extension === '.webp' && buffer.length >= 30) {
            const chunk = buffer.subarray(12, 16).toString();
            if (chunk === 'VP8X') {
                return {
                    width: 1 + buffer.readUIntLE(24, 3),
                    height: 1 + buffer.readUIntLE(27, 3),
                };
            }
            if (chunk === 'VP8L' && buffer[20] === 0x2f) {
                return {
                    width: 1 + buffer[21] + ((buffer[22] & 0x3f) << 8),
                    height: 1
                        + ((buffer[22] & 0xc0) >> 6)
                        + (buffer[23] << 2)
                        + ((buffer[24] & 0x0f) << 10),
                };
            }
            if (
                chunk === 'VP8 '
                && buffer[23] === 0x9d
                && buffer[24] === 0x01
                && buffer[25] === 0x2a
            ) {
                return {
                    width: buffer.readUInt16LE(26) & 0x3fff,
                    height: buffer.readUInt16LE(28) & 0x3fff,
                };
            }
        }

        return null;
    }
}
