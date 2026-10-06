import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import {
    API,
    API_FEATURES,
    getAuthHeaders,
} from '../../../../api/api.js';

const EMPTY_DATA = {
    enabled: null,
    mode: null,
    notice: '',
    subscription: null,
    summary: {
        completed_lessons: 0,
        gross_amount: 0,
        commission_amount: 0,
        teacher_amount: 0,
        awaiting_payment_amount: 0,
        overdue_amount: 0,
        pay_later_amount: 0,
        disputed_amount: 0,
        ready_for_payout_amount: 0,
        paid_out_amount: 0,
    },
    tariff: null,
    items: [],
    pagination: { page: 1, limit: 20, total: 0, pages: 1 },
    payouts: [],
    payouts_notice: '',
};

export function useTeacherFinance(enabled) {
    const [period, setPeriod] = useState('current_month');
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(1);
    const [data, setData] = useState(EMPTY_DATA);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(async (signal) => {
        if (!enabled || !API_FEATURES.teacherFinance) return;

        setIsLoading(true);
        setError('');

        try {
            const query = new URLSearchParams({
                period,
                status,
                page: String(page),
                limit: '20',
            });
            const response = await fetch(`${API.teacherFinance}?${query}`, {
                headers: getAuthHeaders(),
                signal,
            });
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Не удалось загрузить финансовую сводку');
            }

            setData({ ...EMPTY_DATA, ...result.data });
        } catch (requestError) {
            if (requestError.name !== 'AbortError') {
                setError(requestError.message || 'Не удалось загрузить финансовую сводку');
            }
        } finally {
            if (!signal?.aborted) setIsLoading(false);
        }
    }, [enabled, page, period, status]);

    useEffect(() => {
        const controller = new AbortController();
        const timer = window.setTimeout(() => load(controller.signal), 0);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [load]);

    const changePeriod = (value) => {
        setPeriod(value);
        setPage(1);
    };

    const changeStatus = (value) => {
        setStatus(value);
        setPage(1);
    };

    return {
        data,
        period,
        status,
        page,
        isLoading,
        error,
        setPeriod: changePeriod,
        setStatus: changeStatus,
        setPage,
        reload: () => load(),
    };
}
