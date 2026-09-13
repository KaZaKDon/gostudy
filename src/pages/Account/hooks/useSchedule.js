import {
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    API,
    API_FEATURES,
    getAuthHeaders,
} from '../../../api/api.js';

import { getCurrentWeekRange } from '../utils/schedule.js';

export function useSchedule(
    displayedDate = null,
    refreshKey = 0,
    options = {},
) {
    const studentId = Number(options.studentId) || null;
    const lessonId = Number(options.lessonId) || null;
    const defaultDate = useMemo(() => new Date(), []);
    const scheduleDate = displayedDate || defaultDate;
    const period = useMemo(
        () => getCurrentWeekRange(scheduleDate),
        [scheduleDate],
    );

    const [schedule, setSchedule] = useState([]);
    const [requestStatus, setRequestStatus] = useState(
        API_FEATURES.schedule ? 'loading' : 'success',
    );
    const [errorMessage, setErrorMessage] = useState('');
    const [children, setChildren] = useState([]);
    const [selectedStudentId, setSelectedStudentId] = useState(null);

    useEffect(() => {
        if (!API_FEATURES.schedule) {
            return undefined;
        }

        const controller = new AbortController();

        async function loadSchedule() {
            setRequestStatus('loading');
            setErrorMessage('');

            try {
                const params = new URLSearchParams(period);

                if (studentId) {
                    params.set('student_id', String(studentId));
                }

                if (lessonId) {
                    params.set('lesson_id', String(lessonId));
                }

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
                setChildren(
                    Array.isArray(result.children) ? result.children : [],
                );
                setSelectedStudentId(
                    Number(result.selected_student_id) || null,
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
    }, [lessonId, period, refreshKey, studentId]);

    return {
        schedule,
        requestStatus,
        errorMessage,
        period,
        children,
        selectedStudentId,
    };
}
