import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import { API } from '../../../../api/api.js';
import { apiRequest } from '../../../../api/apiRequest.js';

const EMPTY_SUMMARY = {
    rating: 0,
    reviews_count: 0,
};

const EMPTY_PAGINATION = {
    page: 1,
    pages: 0,
    total: 0,
};

export function useReviews(role) {
    const [items, setItems] = useState([]);
    const [summary, setSummary] = useState(EMPTY_SUMMARY);
    const [pagination, setPagination] = useState(EMPTY_PAGINATION);
    const [status, setStatus] = useState('loading');
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const load = useCallback(async ({
        page = 1,
        append = false,
        signal,
    } = {}) => {
        if (!role) {
            return;
        }

        if (append) {
            setIsLoadingMore(true);
        } else {
            setStatus('loading');
        }

        setErrorMessage('');

        try {
            const query = role === 'teacher'
                ? `?page=${page}&limit=20`
                : '';
            const result = await apiRequest(`${API.reviews}${query}`, {
                signal,
            });
            const nextItems = role === 'teacher'
                ? result.items || []
                : result.relations || [];

            setItems((current) => (
                append
                    ? [...current, ...nextItems]
                    : nextItems
            ));
            setSummary(result.summary || EMPTY_SUMMARY);
            setPagination(result.pagination || EMPTY_PAGINATION);
            setStatus('success');
        } catch (error) {
            if (error?.name === 'AbortError') {
                return;
            }

            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'Не удалось загрузить отзывы',
            );
            setStatus('error');
        } finally {
            setIsLoadingMore(false);
        }
    }, [role]);

    useEffect(() => {
        const controller = new AbortController();
        const requestId = window.setTimeout(() => {
            load({ signal: controller.signal });
        }, 0);

        return () => {
            window.clearTimeout(requestId);
            controller.abort();
        };
    }, [load]);

    const saveReview = useCallback(async ({
        relationId,
        rating,
        text,
    }) => {
        setIsSaving(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            const result = await apiRequest(API.saveReview, {
                method: 'POST',
                body: {
                    relation_id: relationId,
                    rating,
                    text,
                },
            });

            setSuccessMessage(result.message || 'Отзыв сохранён');
            await load();

            return true;
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'Не удалось сохранить отзыв',
            );

            return false;
        } finally {
            setIsSaving(false);
        }
    }, [load]);

    const saveReply = useCallback(async ({
        reviewId,
        text,
    }) => {
        setIsSaving(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            const result = await apiRequest(API.replyReview, {
                method: 'POST',
                body: {
                    review_id: reviewId,
                    text,
                },
            });

            setSuccessMessage(result.message || 'Ответ сохранён');
            await load();

            return true;
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'Не удалось сохранить ответ',
            );

            return false;
        } finally {
            setIsSaving(false);
        }
    }, [load]);

    const loadMore = useCallback(() => {
        if (
            role !== 'teacher'
            || isLoadingMore
            || pagination.page >= pagination.pages
        ) {
            return;
        }

        load({
            page: pagination.page + 1,
            append: true,
        });
    }, [
        isLoadingMore,
        load,
        pagination.page,
        pagination.pages,
        role,
    ]);

    const clearMessages = useCallback(() => {
        setErrorMessage('');
        setSuccessMessage('');
    }, []);

    return {
        items,
        summary,
        pagination,
        status,
        isLoadingMore,
        isSaving,
        errorMessage,
        successMessage,
        saveReview,
        saveReply,
        loadMore,
        refresh: load,
        clearMessages,
    };
}
