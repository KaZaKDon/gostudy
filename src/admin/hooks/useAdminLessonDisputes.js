import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import { lessonDisputesApi } from '../services/lessonDisputesApi.js';

const INITIAL_PAGE = { page: 1, limit: 20, total: 0, pages: 0 };

export function useAdminLessonDisputes() {
    const [status, setStatusState] = useState('open');
    const [items, setItems] = useState([]);
    const [pagination, setPagination] = useState(INITIAL_PAGE);
    const [selected, setSelected] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const load = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const result = await lessonDisputesApi.list({
                status,
                page: pagination.page,
                limit: pagination.limit,
            });
            setItems(result.data?.items || []);
            setPagination(result.data?.pagination || INITIAL_PAGE);
        } catch (requestError) {
            setError(requestError.message || 'Не удалось загрузить споры');
        } finally {
            setIsLoading(false);
        }
    }, [pagination.limit, pagination.page, status]);

    useEffect(() => {
        const timer = window.setTimeout(load, 0);
        return () => window.clearTimeout(timer);
    }, [load]);

    const open = useCallback(async (disputeId) => {
        setIsLoadingDetails(true);
        setError('');
        try {
            const result = await lessonDisputesApi.details(disputeId);
            setSelected(result.data || null);
        } catch (requestError) {
            setError(requestError.message || 'Не удалось открыть спор');
        } finally {
            setIsLoadingDetails(false);
        }
    }, []);

    const moderate = useCallback(async (disputeId, body) => {
        setIsSaving(true);
        setError('');
        setNotice('');
        try {
            const result = await lessonDisputesApi.moderate(disputeId, body);
            setNotice(result.message || 'Изменения сохранены');
            await load();
            await open(disputeId);
            return true;
        } catch (requestError) {
            setError(requestError.message || 'Не удалось сохранить решение');
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [load, open]);

    const download = useCallback(async (disputeId, attachment) => {
        setError('');
        try {
            await lessonDisputesApi.download(disputeId, attachment);
        } catch (requestError) {
            setError(requestError.message || 'Не удалось скачать вложение');
        }
    }, []);

    return {
        status,
        items,
        pagination,
        selected,
        isLoading,
        isLoadingDetails,
        isSaving,
        error,
        notice,
        setStatus: (nextStatus) => {
            setStatusState(nextStatus);
            setPagination(INITIAL_PAGE);
        },
        setPage: (page) => setPagination((current) => ({ ...current, page })),
        load,
        open,
        close: () => setSelected(null),
        moderate,
        download,
    };
}
