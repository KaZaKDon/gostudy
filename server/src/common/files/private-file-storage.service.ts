import {
    BadRequestException,
    Injectable,
    NotFoundException,
    PayloadTooLargeException,
    UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import {
    mkdir,
    stat,
    unlink,
    writeFile,
} from 'node:fs/promises';
import {
    basename,
    extname,
    join,
    relative,
    resolve,
    sep,
} from 'node:path';

import { normalizeUploadedFileName } from './upload-file-name';

export type BufferedUploadFile = {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
};

export type PrivateUploadLimits = {
    maxFiles: number;
    maxFileBytes: number;
    maxTotalBytes: number;
};

export type ValidatedPrivateUpload = {
    file: BufferedUploadFile;
    originalName: string;
    extension: string;
    mimeType: string;
};

export type StoredPrivateFile = {
    originalName: string;
    mimeType: string;
    fileSize: number;
    storedPath: string;
};

const FILE_RULES: Record<string, {
    mimeType: string;
    acceptedMimeTypes: string[];
    signature: 'pdf' | 'jpeg' | 'png' | 'webp' | 'ole' | 'docx' | 'xlsx' | 'pptx' | 'text';
}> = {
    '.pdf': {
        mimeType: 'application/pdf',
        acceptedMimeTypes: ['application/pdf'],
        signature: 'pdf',
    },
    '.jpg': {
        mimeType: 'image/jpeg',
        acceptedMimeTypes: ['image/jpeg'],
        signature: 'jpeg',
    },
    '.jpeg': {
        mimeType: 'image/jpeg',
        acceptedMimeTypes: ['image/jpeg'],
        signature: 'jpeg',
    },
    '.png': {
        mimeType: 'image/png',
        acceptedMimeTypes: ['image/png'],
        signature: 'png',
    },
    '.webp': {
        mimeType: 'image/webp',
        acceptedMimeTypes: ['image/webp'],
        signature: 'webp',
    },
    '.txt': {
        mimeType: 'text/plain',
        acceptedMimeTypes: ['text/plain'],
        signature: 'text',
    },
    '.doc': {
        mimeType: 'application/msword',
        acceptedMimeTypes: ['application/msword'],
        signature: 'ole',
    },
    '.xls': {
        mimeType: 'application/vnd.ms-excel',
        acceptedMimeTypes: ['application/vnd.ms-excel'],
        signature: 'ole',
    },
    '.ppt': {
        mimeType: 'application/vnd.ms-powerpoint',
        acceptedMimeTypes: ['application/vnd.ms-powerpoint'],
        signature: 'ole',
    },
    '.docx': {
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        acceptedMimeTypes: [
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        signature: 'docx',
    },
    '.xlsx': {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        acceptedMimeTypes: [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
        signature: 'xlsx',
    },
    '.pptx': {
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        acceptedMimeTypes: [
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ],
        signature: 'pptx',
    },
};

@Injectable()
export class PrivateFileStorageService {
    private readonly privateRoot: string;

    constructor(config: ConfigService) {
        this.privateRoot = resolve(
            String(config.get('UPLOAD_PRIVATE_DIR') || 'storage/private'),
        );
    }

    validateUploads(
        files: BufferedUploadFile[],
        limits: PrivateUploadLimits,
    ): ValidatedPrivateUpload[] {
        if (!files.length) {
            return [];
        }
        if (files.length > limits.maxFiles) {
            throw new BadRequestException(
                `Можно загрузить не более ${limits.maxFiles} файлов`,
            );
        }

        const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
        if (totalBytes > limits.maxTotalBytes) {
            throw new PayloadTooLargeException(
                'Общий размер выбранных файлов превышает допустимый',
            );
        }

        return files.map((file) => {
            if (!file.buffer?.length || file.size <= 0) {
                throw new BadRequestException('Пустой файл загрузить нельзя');
            }
            if (file.size > limits.maxFileBytes) {
                throw new PayloadTooLargeException(
                    `Файл «${file.originalname}» превышает допустимый размер`,
                );
            }

            const originalName = this.safeOriginalName(file.originalname);
            const extension = extname(originalName).toLowerCase();
            const rule = FILE_RULES[extension];

            if (!rule) {
                throw new UnsupportedMediaTypeException(
                    `Формат файла «${originalName}» не поддерживается`,
                );
            }

            const browserMime = file.mimetype.toLowerCase().trim();
            if (
                browserMime
                && browserMime !== 'application/octet-stream'
                && !rule.acceptedMimeTypes.includes(browserMime)
            ) {
                throw new UnsupportedMediaTypeException(
                    `Тип файла «${originalName}» не соответствует расширению`,
                );
            }
            if (!this.hasExpectedSignature(file.buffer, rule.signature)) {
                throw new UnsupportedMediaTypeException(
                    `Содержимое файла «${originalName}» не соответствует формату`,
                );
            }

            return {
                file,
                originalName,
                extension,
                mimeType: rule.mimeType,
            };
        });
    }

    async storeUploads(
        relativeDirectory: string,
        validated: ValidatedPrivateUpload[],
    ): Promise<StoredPrivateFile[]> {
        if (!validated.length) {
            return [];
        }

        const directory = this.safeAbsolutePath(relativeDirectory);
        await mkdir(directory, { recursive: true });
        const prepared: StoredPrivateFile[] = [];

        try {
            for (const item of validated) {
                const storedName = `${randomUUID()}${item.extension}`;
                const absolutePath = join(directory, storedName);
                await writeFile(absolutePath, item.file.buffer, { flag: 'wx' });
                prepared.push({
                    originalName: item.originalName,
                    mimeType: item.mimeType,
                    fileSize: item.file.size,
                    storedPath: relative(this.privateRoot, absolutePath)
                        .split(sep)
                        .join('/'),
                });
            }

            return prepared;
        } catch (error) {
            await this.removeStoredPaths(
                prepared.map((item) => item.storedPath),
            );
            throw error;
        }
    }

    async readStoredFile(
        storedPath: string,
        missingMessage = 'Файл отсутствует на сервере',
    ): Promise<{ absolutePath: string; size: number }> {
        const absolutePath = this.safeAbsolutePath(storedPath);

        try {
            const fileStat = await stat(absolutePath);
            if (!fileStat.isFile()) {
                throw new Error('Not a regular file');
            }

            return { absolutePath, size: fileStat.size };
        } catch {
            throw new NotFoundException(missingMessage);
        }
    }

    async removeStoredPaths(storedPaths: string[]): Promise<void> {
        await Promise.all(storedPaths.map(async (storedPath) => {
            try {
                await unlink(this.safeAbsolutePath(storedPath));
            } catch {
                // Отсутствующий файл не мешает очистке записи в базе.
            }
        }));
    }

    private safeAbsolutePath(storedPath: string): string {
        const absolutePath = resolve(this.privateRoot, storedPath);
        if (
            absolutePath !== this.privateRoot
            && !absolutePath.startsWith(`${this.privateRoot}${sep}`)
        ) {
            throw new NotFoundException('Файл не найден');
        }

        return absolutePath;
    }

    private safeOriginalName(value: string): string {
        const normalized = normalizeUploadedFileName(value);
        const cleaned = basename(normalized.replaceAll('\\', '/'))
            .replace(/[\u0000-\u001f\u007f]/g, '')
            .trim();
        if (!cleaned) {
            throw new BadRequestException('У файла отсутствует имя');
        }

        return cleaned.slice(-255);
    }

    private hasExpectedSignature(
        buffer: Buffer,
        signature: (typeof FILE_RULES)[string]['signature'],
    ): boolean {
        if (signature === 'pdf') return buffer.subarray(0, 4).toString() === '%PDF';
        if (signature === 'jpeg') {
            return buffer[0] === 0xff
                && buffer[1] === 0xd8
                && buffer[2] === 0xff;
        }
        if (signature === 'png') {
            return buffer.subarray(0, 8).equals(
                Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
            );
        }
        if (signature === 'webp') {
            return buffer.subarray(0, 4).toString() === 'RIFF'
                && buffer.subarray(8, 12).toString() === 'WEBP';
        }
        if (signature === 'ole') {
            return buffer.subarray(0, 8).equals(
                Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
            );
        }
        if (['docx', 'xlsx', 'pptx'].includes(signature)) {
            const containerMarker = signature === 'docx'
                ? 'word/'
                : signature === 'xlsx'
                    ? 'xl/'
                    : 'ppt/';

            return buffer[0] === 0x50
                && buffer[1] === 0x4b
                && buffer.includes(Buffer.from('[Content_Types].xml'))
                && buffer.includes(Buffer.from(containerMarker));
        }

        return !buffer.includes(0x00) && this.isReadableText(buffer);
    }

    private isReadableText(buffer: Buffer): boolean {
        try {
            const value = new TextDecoder('utf-8', { fatal: true })
                .decode(buffer);

            return value.length > 0;
        } catch {
            return false;
        }
    }
}
