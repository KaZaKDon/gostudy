import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import { parentChildrenApi } from '../services/parentChildrenApi.js';

const DEFAULT_FILTERS = { q: '', status: 'pending' };
const DEFAULT_PAGINATION = {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
};

export function useAdminParentChildren() {
    const [children, setChildren] = useState([]);
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
    const [selectedChild, setSelectedChild] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [reviewError, setReviewError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const query = useMemo(() => ({
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
    }), [filters, pagination.limit, pagination.page]);

    const load = useCallback(async (params = query) => {
        setIsLoading(true);
        setError('');

        try {
            const response = await parentChildrenApi.list(params);
            setChildren(response.data?.items || []);
            setPagination(response.data?.pagination || DEFAULT_PAGINATION);
        } catch (requestError) {
            setError(requestError instanceof Error
                ? requestError.message
                : 'Не удалось загрузить карточки детей');
        } finally {
            setIsLoading(false);
        }
    }, [query]);

    useEffect(() => {
        const timerId = window.setTimeout(() => load(query), 350);
        return () => window.clearTimeout(timerId);
    }, [load, query]);

    function updateFilters(nextFilters) {
        setFilters(nextFilters);
        setPagination((current) => ({ ...current, page: 1 }));
    }

    async function review(decision, comment) {
        if (!selectedChild) return false;
        setIsSaving(true);
        setReviewError('');
        setSuccessMessage('');

        try {
            const response = await parentChildrenApi.review(
                selectedChild.id,
                { decision, comment },
            );
            setSuccessMessage(response.message || 'Решение сохранено');
            setSelectedChild(null);
            await load(query);
            return true;
        } catch (requestError) {
            setReviewError(requestError instanceof Error
                ? requestError.message
                : 'Не удалось сохранить решение');
            return false;
        } finally {
            setIsSaving(false);
        }
    }

    return {
        children,
        filters,
        pagination,
        selectedChild,
        isLoading,
        isSaving,
        error,
        reviewError,
        successMessage,
        updateFilters,
        changePage: (page) => setPagination((current) => ({ ...current, page })),
        refresh: load,
        openChild: (child) => {
            setSelectedChild(child);
            setReviewError('');
        },
        closeChild: () => {
            if (!isSaving) {
                setSelectedChild(null);
                setReviewError('');
            }
        },
        review,
    };
}
