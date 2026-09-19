import { API } from '../../api/api.js';
import { adminApiRequest } from './adminApiRequest.js';

export const accessibilityApi = {
    getOffers(params = {}) {
        const searchParams = new URLSearchParams();

        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.set(key, String(value));
            }
        });

        const query = searchParams.toString();
        return adminApiRequest(
            query
                ? `${API.adminAccessibilityOffers}?${query}`
                : API.adminAccessibilityOffers,
        );
    },

    moderate(offerId, payload) {
        return adminApiRequest(
            `${API.adminAccessibilityOffers}/${offerId}/moderation`,
            { method: 'PATCH', body: payload },
        );
    },
};
