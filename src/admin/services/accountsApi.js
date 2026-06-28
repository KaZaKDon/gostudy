const ACCOUNTS_API_URL = '/api/admin/users';

export const accountsApi = {
    async getAccounts(params = {}) {
        const searchParams = new URLSearchParams();

        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.set(key, value);
            }
        });

        const response = await fetch(`${ACCOUNTS_API_URL}/index.php?${searchParams.toString()}`, {
            credentials: 'include',
        });

        return response.json();
    },

    async getAccount(id) {
        const response = await fetch(`${ACCOUNTS_API_URL}/show.php?id=${id}`, {
            credentials: 'include',
        });

        return response.json();
    },

    async updateStatus({
        id,
        status,
        blocked_reason = ''
    }) {
        const response = await fetch(`${ACCOUNTS_API_URL}/update-status.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                id,
                status,
                blocked_reason,
            }),
        });

        return response.json();
    },

    async updateRole({
        id,
        role
    }) {
        const response = await fetch(`${ACCOUNTS_API_URL}/update-role.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                id,
                role,
            }),
        });

        return response.json();
    },
};