import {
    useCallback,
    useState,
} from 'react';

import { API } from '../../../../api/api.js';
import { apiRequest } from '../../../../api/apiRequest.js';

export function useLessonChanges() {
    const [submitStatus, setSubmitStatus] = useState('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const runRequest = useCallback(async (url, body) => {
        setSubmitStatus('loading');
        setErrorMessage('');

        try {
            const result = await apiRequest(url, {
                method: 'POST',
                body,
            });

            setSubmitStatus('success');
            return result;
        } catch (error) {
            setSubmitStatus('error');
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'Не удалось выполнить действие',
            );
            throw error;
        }
    }, []);

    const requestChange = useCallback(
        (lessonId, type, form) => runRequest(
            API.requestLessonChange,
            {
                lesson_id: Number(lessonId),
                request_type: type,
                proposed_lesson_date:
                    type === 'reschedule'
                        ? form.proposedLessonDate
                        : null,
                comment: form.comment.trim(),
            },
        ),
        [runRequest],
    );

    const respondChange = useCallback(
        (requestId, form) => runRequest(
            API.respondLessonChange,
            {
                request_id: Number(requestId),
                decision: form.decision,
                comment: form.responseComment.trim(),
            },
        ),
        [runRequest],
    );

    const withdrawChange = useCallback(
        (requestId) => runRequest(
            API.withdrawLessonChange,
            {
                request_id: Number(requestId),
            },
        ),
        [runRequest],
    );

    return {
        submitStatus,
        errorMessage,
        setErrorMessage,
        requestChange,
        respondChange,
        withdrawChange,
    };
}
