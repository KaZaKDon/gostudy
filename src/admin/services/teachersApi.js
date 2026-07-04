const TEACHERS_API_URL = '/api/admin/teachers';

export const teachersApi = {
    async getTeachers(params = {}) {
        const searchParams = new URLSearchParams();

        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.set(key, value);
            }
        });

        const response = await fetch(`${TEACHERS_API_URL}/index.php?${searchParams.toString()}`, {
            credentials: 'include',
        });

        return response.json();
    },

    async getTeacher(id) {
        const response = await fetch(`${TEACHERS_API_URL}/show.php?id=${id}`, {
            credentials: 'include',
        });

        return response.json();
    },

    async updateStatus(payload) {
        const response = await fetch(`${TEACHERS_API_URL}/update-status.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(payload),
        });

        return response.json();
    },

    async updateVerification(payload) {
        const response = await fetch(`${TEACHERS_API_URL}/update-verification.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(payload),
        });

        return response.json();
    },
};