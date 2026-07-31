const REVIEWS_API_URL = '/api/admin/reviews';

async function parseResponse(response) {
    const result = await response.json();

    if (!response.ok || !result.success) {
        throw new Error(
            result.message || 'Не удалось выполнить запрос',
        );
    }

    return result;
}

export const reviewsApi = {
    async getReviews(params = {}) {
        const searchParams = new URLSearchParams();

        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.set(key, value);
            }
        });

        const response = await fetch(
            `${REVIEWS_API_URL}/index.php?${searchParams.toString()}`,
            {
                credentials: 'include',
            },
        );

        return parseResponse(response);
    },

    async moderate(payload) {
        const response = await fetch(
            `${REVIEWS_API_URL}/moderate.php`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(payload),
            },
        );

        return parseResponse(response);
    },
};
