import { API } from '../../api/api.js';
import { adminApiRequest } from './adminApiRequest.js';
import { getAdminToken } from './adminSession.js';

function withQuery(url, params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            searchParams.set(key, String(value));
        }
    });
    const query = searchParams.toString();
    return query ? `${url}?${query}` : url;
}

export const materialsApi = {
    list(params) {
        return adminApiRequest(withQuery(API.adminMaterials, params));
    },

    moderate(materialId, body) {
        return adminApiRequest(`${API.adminMaterials}/${materialId}/moderation`, {
            method: 'PATCH',
            body,
        });
    },

    reports(params) {
        return adminApiRequest(withQuery(`${API.adminMaterials}/reports`, params));
    },

    resolveReport(reportId, body) {
        return adminApiRequest(`${API.adminMaterials}/reports/${reportId}`, {
            method: 'PATCH',
            body,
        });
    },

    async download(item) {
        const response = await fetch(`${API.adminMaterials}/download?item_id=${item.id}`, {
            headers: { 'X-Auth-Token': getAdminToken() },
        });
        if (!response.ok) {
            let message = 'Не удалось скачать файл';
            try {
                const result = await response.json();
                message = result.message || message;
            } catch {
                // Ответ без JSON.
            }
            throw new Error(message);
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = item.original_name || item.title || 'material';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
    },
};
