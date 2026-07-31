export const CLASSROOM_SYNC_INTERVAL = 4000;

export const CLASSROOM_UPLOAD_LIMITS = {
    maxFiles: 5,
    maxFileBytes: 10 * 1024 * 1024,
    maxTotalBytes: 30 * 1024 * 1024,
};

const IMAGE_PREVIEW_EXTENSIONS = new Set([
    'jpg',
    'jpeg',
    'png',
    'webp',
    'gif',
]);

const TEXT_PREVIEW_EXTENSIONS = new Set([
    'txt',
    'csv',
    'md',
]);

const DOCX_PREVIEW_EXTENSIONS = new Set([
    'docx',
]);

export function mergeClassroomMessages(currentMessages, newMessages) {
    const messagesById = new Map(
        currentMessages.map((message) => [Number(message.id), message]),
    );

    newMessages.forEach((message) => {
        messagesById.set(Number(message.id), message);
    });

    return [...messagesById.values()].sort(
        (first, second) => Number(first.id) - Number(second.id),
    );
}

export function formatClassroomTime(dateValue) {
    if (!dateValue) {
        return '';
    }

    const date = new Date(String(dateValue).replace(' ', 'T'));

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return new Intl.DateTimeFormat('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

export function formatClassroomDateTime(dateValue) {
    if (!dateValue) {
        return '';
    }

    const date = new Date(String(dateValue).replace(' ', 'T'));

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

export function formatLessonTimer(totalSeconds) {
    const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
    const hours = String(Math.floor(safeSeconds / 3600)).padStart(2, '0');
    const minutes = String(
        Math.floor((safeSeconds % 3600) / 60),
    ).padStart(2, '0');
    const seconds = String(safeSeconds % 60).padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
}

export function getClassroomStatusLabel(sessionStatus) {
    if (sessionStatus === 'active') {
        return 'Урок идёт';
    }

    if (sessionStatus === 'ended') {
        return 'Урок завершён';
    }

    return 'Ожидание начала';
}

export function getFileTypeLabel(file) {
    const extension = String(file?.original_name || '')
        .split('.')
        .pop()
        .toUpperCase();

    return extension && extension.length <= 6
        ? extension
        : 'Файл';
}

export function getClassroomFilePreviewKind(file) {
    const mimeType = String(file?.mime_type || '').toLowerCase();
    const extension = String(file?.original_name || '')
        .split('.')
        .pop()
        .toLowerCase();

    if (mimeType === 'application/pdf' || extension === 'pdf') {
        return 'pdf';
    }

    if (mimeType.startsWith('image/') || IMAGE_PREVIEW_EXTENSIONS.has(extension)) {
        return 'image';
    }

    if (
        mimeType.startsWith('text/')
        || TEXT_PREVIEW_EXTENSIONS.has(extension)
    ) {
        return 'text';
    }

    if (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        || DOCX_PREVIEW_EXTENSIONS.has(extension)
    ) {
        return 'docx';
    }

    return 'unsupported';
}
