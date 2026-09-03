import { useCallback, useEffect, useState } from 'react';

import { messagesApi } from '../services/messagesApi.js';

const INITIAL_PAGE = { page: 1, limit: 20, total: 0, pages: 0 };

export function useAdminMessages() {
    const [status, setStatusState] = useState('pending');
    const [reports, setReports] = useState([]);
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
            const result = await messagesApi.reports({
                status,
                page: pagination.page,
                limit: pagination.limit,
            });
            setReports(result.data?.items || []);
            setPagination(result.data?.pagination || INITIAL_PAGE);
        } catch (requestError) {
            setError(requestError.message || 'Не удалось загрузить жалобы');
        } finally {
            setIsLoading(false);
        }
    }, [pagination.limit, pagination.page, status]);

    useEffect(() => {
        const timer = window.setTimeout(load, 0);
        return () => window.clearTimeout(timer);
    }, [load]);

    const open = useCallback(async (reportId) => {
        setIsLoadingDetails(true);
        setError('');
        try {
            const result = await messagesApi.report(reportId);
            setSelected(result.data || null);
        } catch (requestError) {
            setError(requestError.message || 'Не удалось открыть жалобу');
        } finally {
            setIsLoadingDetails(false);
        }
    }, []);

    const resolve = useCallback(async (reportId, body) => {
        setIsSaving(true);
        setError('');
        setNotice('');
        try {
            const result = await messagesApi.resolve(reportId, body);
            setNotice(result.message || 'Решение сохранено');
            setSelected(null);
            await load();
            return true;
        } catch (requestError) {
            setError(requestError.message || 'Не удалось сохранить решение');
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [load]);

    const download = useCallback(async (reportId, attachment) => {
        setError('');
        try {
            await messagesApi.download(reportId, attachment);
        } catch (requestError) {
            setError(requestError.message || 'Не удалось скачать вложение');
        }
    }, []);

    return {
        status,
        reports,
        pagination,
        selected,
        isLoading,
        isLoadingDetails,
        isSaving,
        error,
        notice,
        setStatus: (next) => {
            setStatusState(next);
            setPagination(INITIAL_PAGE);
        },
        setPage: (page) => setPagination((current) => ({ ...current, page })),
        load,
        open,
        close: () => setSelected(null),
        resolve,
        download,
    };
}
