import { API } from '../../api/api.js';
import { adminApiRequest } from './adminApiRequest.js';

export const reviewsApi = {
    getReviews(params = {}) {
        const searchParams = new URLSearchParams();

        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.set(key, String(value));
            }
        });

        const query = searchParams.toString();
        return adminApiRequest(
            query ? `${API.adminReviews}?${query}` : API.adminReviews,
        );
    },

    moderate(payload) {
        const { review_id: reviewId, ...body } = payload;
        return adminApiRequest(`${API.adminReviews}/${reviewId}/moderation`, {
            method: 'PATCH',
            body,
        });
    },
};
