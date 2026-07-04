const STUDENTS_API_URL = '/api/admin/students';

export const studentsApi = {
    async getStudents(params = {}) {
        const searchParams = new URLSearchParams();

        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.set(key, value);
            }
        });

        const response = await fetch(`${STUDENTS_API_URL}/index.php?${searchParams.toString()}`, {
            credentials: 'include',
        });

        return response.json();
    },

    async getStudent(id) {
        const response = await fetch(`${STUDENTS_API_URL}/show.php?id=${id}`, {
            credentials: 'include',
        });

        return response.json();
    },

    async updateStatus({
        id,
        status,
        blocked_reason = '',
        archive_reason = '',
    }) {
        const response = await fetch(`${STUDENTS_API_URL}/update-status.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                id,
                status,
                blocked_reason,
                archive_reason,
            }),
        });

        return response.json();
    },
};