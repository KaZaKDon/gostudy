import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import { accessibilityApi } from '../services/accessibilityApi.js';

const DEFAULT_FILTERS = { q: '', status: 'pending', offer_type: '' };
const DEFAULT_PAGINATION = { page: 1, limit: 20, total: 0, pages: 0 };

export function useAdminAccessibility() {
    const [offers, setOffers] = useState([]);
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
    const [selectedOffer, setSelectedOffer] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [moderationError, setModerationError] = useState('');
    const [notice, setNotice] = useState('');

    const query = useMemo(() => ({
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
    }), [filters, pagination.limit, pagination.page]);

    const loadOffers = useCallback(async (params = query) => {
        setIsLoading(true);
        setError('');
        try {
            const response = await accessibilityApi.getOffers(params);
            setOffers(response.data?.items || []);
            setPagination(response.data?.pagination || DEFAULT_PAGINATION);
        } catch (requestError) {
            setError(requestError instanceof Error
                ? requestError.message
                : 'Не удалось загрузить предложения');
        } finally {
            setIsLoading(false);
        }
    }, [query]);

    useEffect(() => {
        const timer = window.setTimeout(() => loadOffers(query), 350);
        return () => window.clearTimeout(timer);
    }, [loadOffers, query]);

    function updateFilters(nextFilters) {
        setFilters(nextFilters);
        setPagination((current) => ({ ...current, page: 1 }));
    }

    function changePage(page) {
        setPagination((current) => ({ ...current, page }));
    }

    function openOffer(offer) {
        setSelectedOffer(offer);
        setModerationError('');
    }

    function closeOffer() {
        if (!isSaving) {
            setSelectedOffer(null);
            setModerationError('');
        }
    }

    async function moderate(decision, comment) {
        if (!selectedOffer) return false;
        setIsSaving(true);
        setModerationError('');
        setNotice('');
        try {
            const response = await accessibilityApi.moderate(
                selectedOffer.id,
                { decision, comment },
            );
            setNotice(response.message || 'Решение сохранено');
            setSelectedOffer(null);
            await loadOffers(query);
            return true;
        } catch (requestError) {
            setModerationError(requestError instanceof Error
                ? requestError.message
                : 'Не удалось сохранить решение');
            return false;
        } finally {
            setIsSaving(false);
        }
    }

    return {
        offers,
        filters,
        pagination,
        selectedOffer,
        isLoading,
        isSaving,
        error,
        moderationError,
        notice,
        updateFilters,
        changePage,
        openOffer,
        closeOffer,
        moderate,
        refresh: () => loadOffers(query),
    };
}
