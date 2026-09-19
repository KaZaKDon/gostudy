import { API } from '../../api/api.js';
import { adminApiRequest } from './adminApiRequest.js';
import { getAdminToken } from './adminSession.js';

export const profileMediaApi = {
    list(params = {}) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.set(key, String(value));
            }
        });
        return adminApiRequest(
            `${API.adminProfileMedia}?${searchParams.toString()}`,
        );
    },

    moderate(id, decision, comment = '') {
        return adminApiRequest(`${API.adminProfileMedia}/${id}/moderation`, {
            method: 'PATCH',
            body: { decision, comment },
        });
    },

    async openFile(id) {
        const preview = window.open('about:blank', '_blank');
        if (preview) preview.opener = null;

        try {
            const response = await fetch(`${API.adminProfileMedia}/${id}/file`, {
                headers: { 'X-Auth-Token': getAdminToken() },
            });
            if (!response.ok) {
                let message = 'Не удалось открыть файл';
                try {
                    const result = await response.json();
                    message = result.message || message;
                } catch {
                    // Сервер мог вернуть не JSON.
                }
                throw new Error(message);
            }

            const objectUrl = URL.createObjectURL(await response.blob());
            if (preview) {
                preview.location.replace(objectUrl);
            } else {
                const link = document.createElement('a');
                link.href = objectUrl;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.click();
            }
            window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
        } catch (error) {
            preview?.close();
            throw error;
        }
    },
};
