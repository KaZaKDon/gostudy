import { describe, expect, it } from 'vitest';

import { normalizeUploadedFileName } from './upload-file-name';

function asLatin1Mojibake(value: string): string {
    return Buffer.from(value, 'utf8').toString('latin1');
}

function asWindows1252Mojibake(value: string): string {
    return new TextDecoder('windows-1252')
        .decode(Buffer.from(value, 'utf8'));
}

describe('normalizeUploadedFileName', () => {
    it('restores a Russian multipart filename decoded as Latin-1', () => {
        const original = 'Домашняя работа №1 09-26 (2).docx';

        expect(normalizeUploadedFileName(asLatin1Mojibake(original)))
            .toBe(original);
    });

    it('keeps an already correct Unicode filename unchanged', () => {
        const original = 'Материалы к уроку №2.pdf';

        expect(normalizeUploadedFileName(original)).toBe(original);
    });

    it('keeps an ASCII filename unchanged', () => {
        expect(normalizeUploadedFileName('lesson-01.pdf'))
            .toBe('lesson-01.pdf');
    });

    it('restores a non-Cyrillic UTF-8 filename', () => {
        const original = 'présentation.pdf';

        expect(normalizeUploadedFileName(asLatin1Mojibake(original)))
            .toBe(original);
    });

    it('restores a filename decoded as Windows-1252', () => {
        const original = 'Домашняя работа №1.docx';

        expect(normalizeUploadedFileName(asWindows1252Mojibake(original)))
            .toBe(original);
    });
});
