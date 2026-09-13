import { API } from '../../api/api.js';
import { adminApiRequest } from './adminApiRequest.js';

export const parentChildrenApi = {
    list(params = {}) {
        const searchParams = new URLSearchParams();

        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.set(key, String(value));
            }
        });

        const query = searchParams.toString();
        return adminApiRequest(
            query
                ? `${API.adminParentChildren}?${query}`
                : API.adminParentChildren,
        );
    },

    review(childProfileId, body) {
        return adminApiRequest(
            `${API.adminParentChildren}/${childProfileId}/review`,
            { method: 'PATCH', body },
        );
    },
};
