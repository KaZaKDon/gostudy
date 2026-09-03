import { API } from '../../api/api.js';
import { adminApiRequest } from './adminApiRequest.js';

export const accountsApi = {
    getAccounts(params = {}) {
        const searchParams = new URLSearchParams();

        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.set(key, value);
            }
        });

        return adminApiRequest(
            `${API.adminAccounts}?${searchParams.toString()}`,
        );
    },

    getAccount(id) {
        return adminApiRequest(`${API.adminAccounts}/${id}`);
    },

    async updateStatus({
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

    async updateRole({
        id,
        role
    }) {
        return adminApiRequest(`${API.adminAccounts}/${id}/role`, {
            method: 'PATCH',
            body: { role },
        });
    },
};
