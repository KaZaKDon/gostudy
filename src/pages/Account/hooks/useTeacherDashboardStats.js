import { useEffect, useState } from 'react';

import { API } from '../../../api/api.js';
import { apiRequest } from '../../../api/apiRequest.js';

const EMPTY_STATS = [
    { label: 'учеников', value: '—' },
    { label: 'уроков сегодня', value: '—' },
    { label: 'работ на проверке', value: '—' },
];

export function useTeacherDashboardStats(enabled) {
    const [stats, setStats] = useState(EMPTY_STATS);

    useEffect(() => {
        if (!enabled) {
            return undefined;
        }

        const controller = new AbortController();
        apiRequest(API.teacherDashboardStats, { signal: controller.signal })
            .then((result) => {
                if (Array.isArray(result.stats)) setStats(result.stats);
            })
            .catch((error) => {
                if (error.name !== 'AbortError') setStats(EMPTY_STATS);
            });

        return () => controller.abort();
    }, [enabled]);

    return enabled ? stats : [];
}
