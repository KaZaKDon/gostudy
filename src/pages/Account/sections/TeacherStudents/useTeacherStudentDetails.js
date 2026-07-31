import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import { API } from '../../../../api/api.js';
import { apiRequest } from '../../../../api/apiRequest.js';

export function useTeacherStudentDetails(relationId, activeTab) {
    const [cache, setCache] = useState({});
    const [status, setStatus] = useState('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const requestRef = useRef(null);

    const cacheKey = relationId
        ? `${relationId}:${activeTab}`
        : null;
    const data = cacheKey ? cache[cacheKey] ?? null : null;

    const loadTab = useCallback(async ({ force = false } = {}) => {
        if (!relationId || !activeTab) {
            return;
        }

        const nextCacheKey = `${relationId}:${activeTab}`;

        if (!force && cache[nextCacheKey]) {
            setStatus('success');
            setErrorMessage('');
            return;
        }

        requestRef.current?.abort();
        const controller = new AbortController();
        requestRef.current = controller;

        setStatus('loading');
        setErrorMessage('');

        try {
            const params = new URLSearchParams({
                relation_id: String(relationId),
                tab: activeTab,
            });
            const result = await apiRequest(
                `${API.teacherStudentDetails}?${params.toString()}`,
                { signal: controller.signal },
            );

            setCache((current) => ({
                ...current,
                [nextCacheKey]: result.data ?? {},
            }));
            setStatus('success');
        } catch (error) {
            if (
                error instanceof DOMException
                && error.name === 'AbortError'
            ) {
                return;
            }

            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'Не удалось загрузить раздел',
            );
            setStatus('error');
        }
    }, [activeTab, cache, relationId]);

    useEffect(() => {
        const timerId = window.setTimeout(() => {
            loadTab();
        }, 0);

        return () => {
            window.clearTimeout(timerId);
            requestRef.current?.abort();
        };
    }, [loadTab]);

    return {
        data,
        status: data ? 'success' : status,
        errorMessage,
        retry: () => loadTab({ force: true }),
    };
}
