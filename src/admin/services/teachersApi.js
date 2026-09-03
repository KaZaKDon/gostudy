import { API } from '../../api/api.js';
import { adminApiRequest } from './adminApiRequest.js';

export const teachersApi = {
    getTeachers(params = {}) {
        const searchParams = new URLSearchParams();

        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.set(key, value);
            }
        });

        return adminApiRequest(
            `${API.adminTeachers}?${searchParams.toString()}`,
        );
    },

    getTeacher(id) {
        return adminApiRequest(`${API.adminTeachers}/${id}`);
    },

    updateStatus({
        id,
        status,
        blocked_reason = '',
        archive_reason = '',
    }) {
        return adminApiRequest(`${API.adminAccounts}/${id}/status`, {
            method: 'PATCH',
            body: {
                status,
                blocked_reason,
                archive_reason,
            },
        });
    },

    updateVerification({ id, status, comment = '' }) {
        return adminApiRequest(`${API.adminTeachers}/${id}/verification`, {
            method: 'PATCH',
            body: { status, comment },
        });
    },

    updateVisibility({ id, is_visible }) {
        return adminApiRequest(`${API.adminTeachers}/${id}/visibility`, {
            method: 'PATCH',
            body: { is_visible },
        });
    },
};
