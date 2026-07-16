const SUBJECT_GROUPS_API_URL =
    '/api/admin/dictionaries/subject-groups';

async function parseResponse(response) {
    const data = await response.json().catch(() => null);

    if (!data) {
        throw new Error('Сервер вернул некорректный ответ');
    }

    return data;
}

export const subjectGroupsApi = {
    async getSubjectGroups() {
        const response = await fetch(
            `${SUBJECT_GROUPS_API_URL}/index.php`,
            {
                credentials: 'include',
            },
        );

        return parseResponse(response);
    },

    async createSubjectGroup(payload) {
        const response = await fetch(
            `${SUBJECT_GROUPS_API_URL}/create.php`,
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

    async updateSubjectGroup(payload) {
        const response = await fetch(
            `${SUBJECT_GROUPS_API_URL}/update.php`,
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

    async deleteSubjectGroup(id) {
        const response = await fetch(
            `${SUBJECT_GROUPS_API_URL}/delete.php`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    id,
                }),
            },
        );

        return parseResponse(response);
    },
};