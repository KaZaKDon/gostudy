const WINDOWS_1252_BYTES = new Map<number, number>([
    [0x20ac, 0x80],
    [0x201a, 0x82],
    [0x0192, 0x83],
    [0x201e, 0x84],
    [0x2026, 0x85],
    [0x2020, 0x86],
    [0x2021, 0x87],
    [0x02c6, 0x88],
    [0x2030, 0x89],
    [0x0160, 0x8a],
    [0x2039, 0x8b],
    [0x0152, 0x8c],
    [0x017d, 0x8e],
    [0x2018, 0x91],
    [0x2019, 0x92],
    [0x201c, 0x93],
    [0x201d, 0x94],
    [0x2022, 0x95],
    [0x2013, 0x96],
    [0x2014, 0x97],
    [0x02dc, 0x98],
    [0x2122, 0x99],
    [0x0161, 0x9a],
    [0x203a, 0x9b],
    [0x0153, 0x9c],
    [0x017e, 0x9e],
    [0x0178, 0x9f],
]);

function mojibakeScore(value: string): number {
    let score = 0;
    const commonUtf8ByteMarkers = new Set(['Â', 'Ã', 'Ð', 'Ñ', 'â', 'ð']);

    for (const character of value) {
        const codePoint = character.codePointAt(0) ?? 0;
        if (
            (codePoint >= 0x80 && codePoint <= 0x9f)
            || commonUtf8ByteMarkers.has(character)
            || WINDOWS_1252_BYTES.has(codePoint)
        ) {
            score += 1;
        }
    }

    return score;
}

function singleByteBuffer(value: string): Buffer | null {
    const bytes: number[] = [];

    for (const character of value) {
        const codePoint = character.codePointAt(0) ?? 0;
        if (codePoint <= 0xff) {
            bytes.push(codePoint);
            continue;
        }

        const windowsByte = WINDOWS_1252_BYTES.get(codePoint);
        if (windowsByte === undefined) {
            return null;
        }
        bytes.push(windowsByte);
    }

    return Buffer.from(bytes);
}

/**
 * Restores a UTF-8 multipart filename that was decoded as Latin-1/Windows-1252.
 * Correct Unicode and ASCII names are returned unchanged (apart from NFC).
 */
export function normalizeUploadedFileName(value: string): string {
    const normalized = value.normalize('NFC');
    const bytes = singleByteBuffer(normalized);
    if (!bytes) {
        return normalized;
    }

    let decoded: string;
    try {
        decoded = new TextDecoder('utf-8', { fatal: true })
            .decode(bytes)
            .normalize('NFC');
    } catch {
        return normalized;
    }

    if (!decoded.trim() || decoded === normalized) {
        return normalized;
    }

    return mojibakeScore(decoded) < mojibakeScore(normalized)
        ? decoded
        : normalized;
}
