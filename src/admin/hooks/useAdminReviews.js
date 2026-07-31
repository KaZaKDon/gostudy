import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import { reviewsApi } from '../services/reviewsApi.js';

const DEFAULT_FILTERS = {
    q: '',
    status: 'pending',
    target: '',
};

const DEFAULT_PAGINATION = {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
};

const SEARCH_DELAY = 350;

export function useAdminReviews() {
    const [reviews, setReviews] = useState([]);
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
    const [selectedReview, setSelectedReview] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isModerating, setIsModerating] = useState(false);
    const [error, setError] = useState('');
    const [moderationError, setModerationError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const queryParams = useMemo(() => ({
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
    }), [filters, pagination.limit, pagination.page]);

    const loadReviews = useCallback(async (params = queryParams) => {
        setIsLoading(true);
        setError('');

        try {
            const response = await reviewsApi.getReviews(params);

            setReviews(response.data?.items || []);
            setPagination(
                response.data?.pagination || DEFAULT_PAGINATION,
            );
        } catch (requestError) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : 'Не удалось загрузить отзывы',
            );
        } finally {
            setIsLoading(false);
        }
    }, [queryParams]);

    useEffect(() => {
        const timerId = window.setTimeout(() => {
            loadReviews(queryParams);
        }, SEARCH_DELAY);

        return () => window.clearTimeout(timerId);
    }, [loadReviews, queryParams]);

    function updateFilters(nextFilters) {
        setFilters(nextFilters);
        setPagination((current) => ({
            ...current,
            page: 1,
        }));
    }

    function resetFilters() {
        setFilters(DEFAULT_FILTERS);
        setPagination((current) => ({
            ...current,
            page: 1,
        }));
    }

    function changePage(page) {
        setPagination((current) => ({
            ...current,
            page,
        }));
    }

    function openReview(review) {
        setSelectedReview(review);
        setModerationError('');
    }

    function closeReview() {
        if (isModerating) {
            return;
        }

        setSelectedReview(null);
        setModerationError('');
    }

    async function moderateReview({
        target,
        decision,
        comment,
    }) {
        if (!selectedReview) {
            return false;
        }

        setIsModerating(true);
        setModerationError('');
        setSuccessMessage('');

        try {
            const response = await reviewsApi.moderate({
                review_id: selectedReview.id,
                target,
                decision,
                comment,
            });

            setSuccessMessage(
                response.message || 'Решение сохранено',
            );
            setSelectedReview(null);
            await loadReviews(queryParams);

            return true;
        } catch (requestError) {
            setModerationError(
                requestError instanceof Error
                    ? requestError.message
                    : 'Не удалось сохранить решение',
            );

            return false;
        } finally {
            setIsModerating(false);
        }
    }

    return {
        reviews,
        filters,
        pagination,
        selectedReview,
        isLoading,
        isModerating,
        error,
        moderationError,
        successMessage,
        updateFilters,
        resetFilters,
        changePage,
        refresh: loadReviews,
        openReview,
        closeReview,
        moderateReview,
    };
}
