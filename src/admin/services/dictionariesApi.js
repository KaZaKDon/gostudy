const DICTIONARIES_API_BASE =
    '/api/admin/dictionaries';

async function request(url, options = {}) {
    const response = await fetch(url, {
        credentials: 'include',
        ...options,
        headers: {
            ...(options.body
                ? {
                    'Content-Type': 'application/json',
                }
                : {}),
            ...options.headers,
        },
    });

    const data = await response
        .json()
        .catch(() => null);

    if (!data) {
        throw new Error(
            'Сервер вернул некорректный ответ',
        );
    }

    return data;
}

function post(url, payload) {
    return request(url, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

function buildQuery(filters = {}) {
    const params = new URLSearchParams();

    if (filters.group_id) {
        params.set(
            'group_id',
            String(filters.group_id),
        );
    }

    if (filters.is_active !== undefined) {
        params.set(
            'is_active',
            filters.is_active ? '1' : '0',
        );
    }

    if (filters.search?.trim()) {
        params.set(
            'search',
            filters.search.trim(),
        );
    }

    const query = params.toString();

    return query
        ? `?${query}`
        : '';
}

export const dictionariesApi = {
    getSubjectGroups() {
        return request(
            `${DICTIONARIES_API_BASE}/subject-groups/index.php`,
        );
    },

    createSubjectGroup(payload) {
        return post(
            `${DICTIONARIES_API_BASE}/subject-groups/create.php`,
            payload,
        );
    },

    updateSubjectGroup(payload) {
        return post(
            `${DICTIONARIES_API_BASE}/subject-groups/update.php`,
            payload,
        );
    },

    deleteSubjectGroup(id) {
        return post(
            `${DICTIONARIES_API_BASE}/subject-groups/delete.php`,
            {
                id,
            },
        );
    },

    getSubjects(filters = {}) {
        return request(
            `${DICTIONARIES_API_BASE}/subjects/index.php${buildQuery(filters)}`,
        );
    },

    createSubject(payload) {
        return post(
            `${DICTIONARIES_API_BASE}/subjects/create.php`,
            payload,
        );
    },

    updateSubject(payload) {
        return post(
            `${DICTIONARIES_API_BASE}/subjects/update.php`,
            payload,
        );
    },

    deleteSubject(id) {
        return post(
            `${DICTIONARIES_API_BASE}/subjects/delete.php`,
            {
                id,
            },
        );
    },

    getPreparationGroups() {
        return request(
            `${DICTIONARIES_API_BASE}/preparation-groups/index.php`,
        );
    },

    createPreparationGroup(payload) {
        return post(
            `${DICTIONARIES_API_BASE}/preparation-groups/create.php`,
            payload,
        );
    },

    updatePreparationGroup(payload) {
        return post(
            `${DICTIONARIES_API_BASE}/preparation-groups/update.php`,
            payload,
        );
    },

    deletePreparationGroup(id) {
        return post(
            `${DICTIONARIES_API_BASE}/preparation-groups/delete.php`,
            {
                id,
            },
        );
    },

    getPreparations(filters = {}) {
        return request(
            `${DICTIONARIES_API_BASE}/preparations/index.php${buildQuery(filters)}`,
        );
    },

    createPreparation(payload) {
        return post(
            `${DICTIONARIES_API_BASE}/preparations/create.php`,
            payload,
        );
    },

    updatePreparation(payload) {
        return post(
            `${DICTIONARIES_API_BASE}/preparations/update.php`,
            payload,
        );
    },

    deletePreparation(id) {
        return post(
            `${DICTIONARIES_API_BASE}/preparations/delete.php`,
            {
                id,
            },
        );
    },

    getAgeGroups() {
        return request(
            `${DICTIONARIES_API_BASE}/age-groups/index.php`,
        );
    },

    createAgeGroup(payload) {
        return post(
            `${DICTIONARIES_API_BASE}/age-groups/create.php`,
            payload,
        );
    },

    updateAgeGroup(payload) {
        return post(
            `${DICTIONARIES_API_BASE}/age-groups/update.php`,
            payload,
        );
    },

    deleteAgeGroup(id) {
        return post(
            `${DICTIONARIES_API_BASE}/age-groups/delete.php`,
            {
                id,
            },
        );
    },

    getSubjectPreparationsData() {
        return request(
            `${DICTIONARIES_API_BASE}/subject-preparations/index.php`,
        );
    },

    getSubjectPreparationLinks(subjectId) {
        const params = new URLSearchParams({
            subject_id: String(subjectId),
        });

        return request(
            `${DICTIONARIES_API_BASE}/subject-preparations/links.php?${params.toString()}`,
        );
    },

    updateSubjectPreparations(payload) {
        return post(
            `${DICTIONARIES_API_BASE}/subject-preparations/update.php`,
            payload,
        );
    },
};