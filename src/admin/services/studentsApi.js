import { API } from '../../api/api.js';
import { adminApiRequest } from './adminApiRequest.js';

export const studentsApi = {
    getStudents(params = {}) {
        const searchParams = new URLSearchParams();

        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.set(key, value);
            }
        });

        return adminApiRequest(
            `${API.adminStudents}?${searchParams.toString()}`,
        );
    },

    getStudent(id) {
        return adminApiRequest(`${API.adminStudents}/${id}`);
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
                id,
                status,
                blocked_reason,
                archive_reason,
            },
        });
    },
};
