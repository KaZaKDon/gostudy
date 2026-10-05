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

export const lessonDisputesApi = {
    list(params) {
        return adminApiRequest(withQuery(API.adminLessonDisputes, params));
    },

    details(disputeId) {
        return adminApiRequest(`${API.adminLessonDisputes}/${disputeId}`);
    },

    moderate(disputeId, body) {
        return adminApiRequest(`${API.adminLessonDisputes}/${disputeId}`, {
            method: 'PATCH',
            body,
        });
    },

    async download(disputeId, attachment) {
        const response = await fetch(
            `${API.adminLessonDisputes}/${disputeId}/attachments/${attachment.id}`,
            { headers: { 'X-Auth-Token': getAdminToken() } },
        );
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
        anchor.download = attachment.original_name || 'dispute-file';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(objectUrl);
    },
};
