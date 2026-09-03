import {
    getAuthHeaders,
    isLegacyApiUrl,
    LEGACY_API_UNAVAILABLE_MESSAGE,
} from './api.js';

export async function apiRequest(
    url,
    {
        method = 'GET',
        body,
        signal,
    } = {},
) {
    if (isLegacyApiUrl(url)) {
        throw new Error(LEGACY_API_UNAVAILABLE_MESSAGE);
    }

    const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: body === undefined
            ? undefined
            : JSON.stringify(body),
        signal,
    });

    let result;

    try {
        result = await response.json();
    } catch {
        throw new Error('Сервер вернул некорректный ответ');
    }

    if (!response.ok || !result.success) {
        throw new Error(
            result.message || 'Не удалось выполнить запрос',
        );
    }

    return result;
}
