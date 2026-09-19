import { useCallback, useEffect, useState } from 'react';

import { API } from '../../../../api/api.js';
import { apiRequest } from '../../../../api/apiRequest.js';

export function useAccessibilityProgram(enabled) {
    const [data, setData] = useState({
        subjects: [],
        offers: [],
        rules: null,
    });
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [savingType, setSavingType] = useState(null);
    const [revision, setRevision] = useState(0);

    const refresh = useCallback(() => {
        setStatus('loading');
        setError('');
        setRevision((value) => value + 1);
    }, []);

    useEffect(() => {
        if (!enabled) return undefined;
        const controller = new AbortController();

        apiRequest(API.accessibilityOffers, { signal: controller.signal })
            .then((result) => {
                setData({
                    subjects: result.subjects || [],
                    offers: result.offers || [],
                    rules: result.rules || null,
                });
                setStatus('success');
            })
            .catch((requestError) => {
                if (requestError.name === 'AbortError') return;
                setError(requestError.message || 'Не удалось загрузить программу');
                setStatus('error');
            });

        return () => controller.abort();
    }, [enabled, revision]);

    async function saveOffer(payload) {
        setSavingType(payload.offer_type);
        setError('');
        setNotice('');
        try {
            const result = await apiRequest(API.accessibilityOffers, {
                method: 'POST',
                body: payload,
            });
            setNotice(result.message || 'Условия отправлены на модерацию');
            refresh();
            return true;
        } catch (requestError) {
            setError(requestError.message || 'Не удалось сохранить условия');
            return false;
        } finally {
            setSavingType(null);
        }
    }

    async function archiveOffer(offer) {
        setSavingType(offer.offer_type);
        setError('');
        setNotice('');
        try {
            const result = await apiRequest(
                `${API.accessibilityOffers}/${offer.id}/archive`,
                { method: 'PATCH' },
            );
            setNotice(result.message || 'Предложение закрыто');
            refresh();
            return true;
        } catch (requestError) {
            setError(requestError.message || 'Не удалось закрыть предложение');
            return false;
        } finally {
            setSavingType(null);
        }
    }

    return {
        ...data,
        status,
        error,
        notice,
        savingType,
        refresh,
        saveOffer,
        archiveOffer,
    };
}
