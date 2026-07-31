import { getAuthToken } from './api.js';

export const DEFAULT_UPLOAD_LIMITS = {
    maxFiles: 5,
    maxFileBytes: 10 * 1024 * 1024,
    maxTotalBytes: 30 * 1024 * 1024,
};

export function validateSelectedFiles(
    files = [],
    limits = DEFAULT_UPLOAD_LIMITS,
) {
    const selectedFiles = [...files];
    const maxFiles = Number(limits.maxFiles) || DEFAULT_UPLOAD_LIMITS.maxFiles;
    const maxFileBytes = Number(limits.maxFileBytes)
        || DEFAULT_UPLOAD_LIMITS.maxFileBytes;
    const maxTotalBytes = Number(limits.maxTotalBytes)
        || DEFAULT_UPLOAD_LIMITS.maxTotalBytes;

    if (selectedFiles.length > maxFiles) {
        throw new Error(`Можно прикрепить не более ${maxFiles} файлов`);
    }

    const oversizedFile = selectedFiles.find(
        (file) => file.size > maxFileBytes,
    );

    if (oversizedFile) {
        throw new Error(
            `Файл «${oversizedFile.name}» весит ${formatFileSize(oversizedFile.size)}. Максимальный размер — ${formatFileSize(maxFileBytes)}`,
        );
    }

    const totalBytes = selectedFiles.reduce(
        (sum, file) => sum + Number(file.size || 0),
        0,
    );

    if (totalBytes > maxTotalBytes) {
        throw new Error(
            `Общий размер файлов — ${formatFileSize(totalBytes)}. Разрешено не более ${formatFileSize(maxTotalBytes)}`,
        );
    }

    return selectedFiles;
}

export function uploadFile({
    url,
    file,
    fields = {},
    onProgress,
}) {
    return new Promise((resolve, reject) => {
        const token = getAuthToken();

        if (!token) {
            reject(new Error('Требуется авторизация'));
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        Object.entries(fields).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                formData.append(key, String(value));
            }
        });

        const request = new XMLHttpRequest();
        request.open('POST', url);
        request.setRequestHeader('X-Auth-Token', token);
        request.setRequestHeader('Accept', 'application/json');

        request.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable && onProgress) {
                onProgress(Math.round((event.loaded / event.total) * 100));
            }
        });

        request.addEventListener('load', () => {
            let result;

            try {
                result = JSON.parse(request.responseText);
            } catch {
                reject(new Error(
                    request.status === 413
                        ? 'Файл превышает ограничение сервера'
                        : 'Сервер вернул некорректный ответ',
                ));
                return;
            }

            if (request.status < 200 || request.status >= 300 || !result?.success) {
                reject(new Error(result?.message || 'Не удалось загрузить файл'));
                return;
            }

            resolve(result);
        });

        request.addEventListener('error', () => {
            reject(new Error('Соединение прервано во время загрузки'));
        });

        request.addEventListener('abort', () => {
            reject(new Error('Загрузка отменена'));
        });

        request.send(formData);
    });
}

export function submitMultipart({
    url,
    fields = {},
    files = [],
    limits = DEFAULT_UPLOAD_LIMITS,
    onProgress,
}) {
    return new Promise((resolve, reject) => {
        const token = getAuthToken();

        if (!token) {
            reject(new Error('Требуется авторизация'));
            return;
        }

        let validatedFiles;

        try {
            validatedFiles = validateSelectedFiles(files, limits);
        } catch (error) {
            reject(error);
            return;
        }

        const formData = new FormData();

        Object.entries(fields).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                formData.append(key, String(value));
            }
        });

        validatedFiles.forEach((file) => formData.append('files[]', file));

        const request = new XMLHttpRequest();
        request.open('POST', url);
        request.setRequestHeader('X-Auth-Token', token);
        request.setRequestHeader('Accept', 'application/json');

        request.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable && onProgress) {
                onProgress(Math.round((event.loaded / event.total) * 100));
            }
        });

        request.addEventListener('load', () => {
            let result;

            try {
                result = JSON.parse(request.responseText);
            } catch {
                reject(new Error(
                    request.status === 413
                        ? 'Файлы превышают ограничение сервера'
                        : 'Сервер вернул некорректный ответ',
                ));
                return;
            }

            if (
                request.status < 200
                || request.status >= 300
                || !result?.success
            ) {
                reject(new Error(
                    result?.message || 'Не удалось отправить данные',
                ));
                return;
            }

            resolve(result);
        });

        request.addEventListener('error', () => {
            reject(new Error('Соединение прервано во время отправки'));
        });

        request.send(formData);
    });
}

export async function fetchAuthFileBlob(url, { signal } = {}) {
    const token = getAuthToken();
    const response = await fetch(url, {
        headers: token ? { 'X-Auth-Token': token } : {},
        signal,
    });

    if (!response.ok) {
        let message = 'Не удалось получить файл';

        try {
            const result = await response.json();
            message = result.message || message;
        } catch {
            // The endpoint may return a non-JSON server error.
        }

        throw new Error(message);
    }

    return response.blob();
}

export async function downloadAuthFile(url, fileName = 'file') {
    const blob = await fetchAuthFileBlob(url);
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
}

export function formatFileSize(bytes) {
    const size = Number(bytes || 0);

    if (size < 1024) {
        return `${size} Б`;
    }

    if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(1)} КБ`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} МБ`;
}
