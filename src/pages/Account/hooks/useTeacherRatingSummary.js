import { useCallback, useEffect, useState } from 'react';

import { API } from '../../../api/api.js';
import { apiRequest } from '../../../api/apiRequest.js';

export function useTeacherRatingSummary(enabled) {
    const [summary, setSummary] = useState(null);
    const [status, setStatus] = useState('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [revision, setRevision] = useState(0);

    const refresh = useCallback(() => {
        setStatus('loading');
        setErrorMessage('');
        setRevision((value) => value + 1);
    }, []);

    useEffect(() => {
        if (!enabled) return undefined;

        const controller = new AbortController();

        apiRequest(API.teacherDashboardRating, {
            signal: controller.signal,
        })
            .then((result) => {
                setSummary(result.rating ?? null);
                setStatus('success');
            })
            .catch((error) => {
                if (error.name === 'AbortError') return;
                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : 'Не удалось загрузить рейтинг',
                );
                setStatus('error');
            });

        return () => controller.abort();
    }, [enabled, revision]);

    return {
        summary,
        status,
        errorMessage,
        refresh,
    };
}
