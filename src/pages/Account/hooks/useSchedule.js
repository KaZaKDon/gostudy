import {
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    API,
    getAuthHeaders,
} from '../../../api/api.js';

import { getCurrentWeekRange } from '../utils/schedule.js';

export function useSchedule(
    displayedDate = null,
    refreshKey = 0,
) {
    const defaultDate = useMemo(() => new Date(), []);
    const scheduleDate = displayedDate || defaultDate;
    const period = useMemo(
        () => getCurrentWeekRange(scheduleDate),
        [scheduleDate],
    );

    const [schedule, setSchedule] = useState([]);
    const [requestStatus, setRequestStatus] = useState('loading');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const controller = new AbortController();

        async function loadSchedule() {
            setRequestStatus('loading');
            setErrorMessage('');

            try {
                const params = new URLSearchParams(period);

                const response = await fetch(
                    `${API.schedule}?${params.toString()}`,
                    {
                        method: 'GET',
                        headers: getAuthHeaders(),
                        signal: controller.signal,
                    },
                );

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message ||
                            'Не удалось загрузить расписание',
                    );
                }

                const receivedAt = Date.now();
                const viewerNow = result.period?.viewer_now || null;

                setSchedule(
                    Array.isArray(result.schedule)
                        ? result.schedule.map((lesson) => ({
                            ...lesson,
                            _viewer_now: viewerNow,
                            _received_at: receivedAt,
                        }))
                        : [],
                );
                setRequestStatus('success');
            } catch (error) {
                if (
                    error instanceof DOMException &&
                    error.name === 'AbortError'
                ) {
                    return;
                }

                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : 'Не удалось загрузить расписание',
                );
                setRequestStatus('error');
            }
        }

        loadSchedule();

        return () => {
            controller.abort();
        };
    }, [period, refreshKey]);

    return {
        schedule,
        requestStatus,
        errorMessage,
        period,
    };
}
