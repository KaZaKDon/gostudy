import { getAdminToken } from './adminSession.js';

export async function adminApiRequest(
    url,
    {
        method = 'GET',
        body,
        token = getAdminToken(),
    } = {},
) {
    const response = await fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'X-Auth-Token': token } : {}),
        },
        body: body === undefined
            ? undefined
            : JSON.stringify(body),
    });

    let result;

    try {
        result = await response.json();
    } catch {
        throw new Error('Сервер вернул некорректный ответ');
    }

    if (!response.ok || !result.success) {
        throw new Error(result.message || 'Не удалось выполнить запрос');
    }

    return result;
}
