export function createTeacherDirectoryFilters() {
    return {
        search: '',
        subjectId: '',
        preparationId: '',
        ageGroupId: '',
        city: '',
        minExperience: '',
        maxPrice: '',
        minRating: '',
        accessibleOnly: false,
    };
}

export function buildTeacherDirectorySearchParams(filters, page) {
    const params = new URLSearchParams();
    const search = filters.search.trim();

    if (search) params.set('search', search);
    if (filters.subjectId) params.set('subject_id', filters.subjectId);
    if (filters.preparationId) {
        params.set('preparation_id', filters.preparationId);
    }
    if (filters.ageGroupId) {
        params.set('age_group_id', filters.ageGroupId);
    }
    if (filters.city) params.set('city', filters.city);
    if (filters.minExperience) {
        params.set('min_experience', filters.minExperience);
    }
    if (filters.maxPrice) params.set('max_price', filters.maxPrice);
    if (filters.minRating) params.set('min_rating', filters.minRating);
    if (filters.accessibleOnly) params.set('accessible_only', 'true');
    params.set('page', String(page));

    return params;
}

export function hasTeacherDirectoryFilters(filters) {
    return Object.entries(filters).some(([key, value]) => (
        key === 'accessibleOnly' ? value : String(value).trim()
    ));
}

export function preparationsForSubject(preparations, subjectId) {
    if (!subjectId) return preparations;

    const numericSubjectId = Number(subjectId);

    return preparations.filter((preparation) => (
        Array.isArray(preparation.subject_ids)
        && preparation.subject_ids.includes(numericSubjectId)
    ));
}
