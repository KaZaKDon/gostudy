import { useEffect, useState } from 'react';
import { getAdminSubscriptions } from '../services/subscriptionsApi.js';

export const DEFAULT_SUBSCRIPTION_FILTERS = {
    q: '', mode: 'live', payment_status: '', period_status: '', receipt_state: '', paid_from: '', paid_to: '',
};

export function useAdminSubscriptions(enabled) {
    const [query, setQuery] = useState({ ...DEFAULT_SUBSCRIPTION_FILTERS, page: 1, limit: 20 });
    const [revision, setRevision] = useState(0);
    const [result, setResult] = useState(null);
    const [status, setStatus] = useState('loading');
    const [error, setError] = useState('');
    useEffect(() => {
        if (!enabled) return;
        let cancelled = false;
        getAdminSubscriptions(query).then((response) => {
            if (cancelled) return;
            setResult(response.data);
            setStatus('ready');
        }).catch((err) => {
            if (cancelled) return;
            setError(err.message || 'Не удалось загрузить оплаты');
            setStatus('error');
        });
        return () => { cancelled = true; };
    }, [enabled, query, revision]);

    function startRequest() { setStatus('loading'); setError(''); }
    function applyFilters(filters) {
        startRequest();
        setQuery({ ...filters, page: 1, limit: 20 });
    }
    function changePage(page) {
        startRequest();
        setQuery((current) => ({ ...current, page }));
    }
    function refresh() { startRequest(); setRevision((value) => value + 1); }
    return { result, status, error, query, applyFilters, changePage, refresh };
}
