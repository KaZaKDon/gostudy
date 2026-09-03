import { API } from '../../api/api.js';
import { adminApiRequest } from './adminApiRequest.js';
import { getAdminToken } from './adminSession.js';

function withQuery(url, params = {}) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            search.set(key, String(value));
        }
    });
    const query = search.toString();
    return query ? `${url}?${query}` : url;
}

export const messagesApi = {
    reports(params) {
        return adminApiRequest(withQuery(`${API.adminMessages}/reports`, params));
    },

    report(reportId) {
        return adminApiRequest(`${API.adminMessages}/reports/${reportId}`);
    },

    resolve(reportId, body) {
        return adminApiRequest(`${API.adminMessages}/reports/${reportId}`, {
            method: 'PATCH',
            body,
        });
    },

    async download(reportId, attachment) {
        const url = `${API.adminMessages}/reports/${reportId}/download?attachment_id=${attachment.id}`;
        const response = await fetch(url, {
            headers: { 'X-Auth-Token': getAdminToken() },
        });
        if (!response.ok) {
            let message = 'Не удалось скачать вложение';
            try {
                const result = await response.json();
                message = result.message || message;
            } catch {
                // Ответ сервера может быть без JSON.
            }
            throw new Error(message);
        }
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = attachment.original_name || 'message-file';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(objectUrl);
    },
};
