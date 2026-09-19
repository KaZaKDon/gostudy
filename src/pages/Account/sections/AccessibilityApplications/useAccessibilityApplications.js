import { useCallback, useEffect, useState } from 'react';

import { API } from '../../../../api/api.js';
import { apiRequest } from '../../../../api/apiRequest.js';

export function useAccessibilityApplications(enabled) {
    const [applications, setApplications] = useState([]);
    const [status, setStatus] = useState('loading');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [savingId, setSavingId] = useState(null);
    const [revision, setRevision] = useState(0);

    const refresh = useCallback(() => {
        setStatus('loading');
        setError('');
        setRevision((value) => value + 1);
    }, []);

    useEffect(() => {
        if (!enabled) return undefined;
        const controller = new AbortController();
        apiRequest(`${API.accessibilityApplications}/teacher`, {
            signal: controller.signal,
        })
            .then((result) => {
                setApplications(result.applications || []);
                setStatus('success');
            })
            .catch((requestError) => {
                if (requestError.name === 'AbortError') return;
                setError(requestError.message || 'Не удалось загрузить заявки');
                setStatus('error');
            });

        return () => controller.abort();
    }, [enabled, revision]);

    async function respond(applicationId, decision, comment) {
        setSavingId(applicationId);
        setError('');
        setNotice('');
        try {
            const result = await apiRequest(
                `${API.accessibilityApplications}/${applicationId}/respond`,
                { method: 'PATCH', body: { decision, comment } },
            );
            setNotice(result.message || 'Решение сохранено');
            refresh();
            return true;
        } catch (requestError) {
            setError(requestError.message || 'Не удалось обработать заявку');
            return false;
        } finally {
            setSavingId(null);
        }
    }

    return {
        applications,
        status,
        error,
        notice,
        savingId,
        refresh,
        respond,
    };
}
