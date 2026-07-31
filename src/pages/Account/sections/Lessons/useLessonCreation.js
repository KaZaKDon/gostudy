import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import { API } from '../../../../api/api.js';
import { apiRequest } from '../../../../api/apiRequest.js';

const EMPTY_OPTIONS = {
    relations: [],
    durations: [],
    timezone: '',
};

export function useLessonCreation() {
    const [options, setOptions] = useState(EMPTY_OPTIONS);
    const [requestStatus, setRequestStatus] = useState('loading');
    const [submitStatus, setSubmitStatus] = useState('idle');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const controller = new AbortController();

        async function loadOptions() {
            try {
                const result = await apiRequest(
                    API.teacherLessonOptions,
                    { signal: controller.signal },
                );

                setOptions({
                    relations: Array.isArray(result.relations)
                        ? result.relations
                        : [],
                    durations: Array.isArray(result.durations)
                        ? result.durations
                        : [],
                    timezone: result.timezone || '',
                });
                setRequestStatus('success');
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
                        : 'Не удалось загрузить данные урока',
                );
                setRequestStatus('error');
            }
        }

        loadOptions();

        return () => controller.abort();
    }, []);

    const createLesson = useCallback(async (form) => {
        setSubmitStatus('loading');
        setErrorMessage('');

        try {
            const result = await apiRequest(
                API.createTeacherLesson,
                {
                    method: 'POST',
                    body: {
                        relation_id: Number(form.relationId),
                        lesson_date: form.lessonDate,
                        duration_minutes: Number(
                            form.durationMinutes,
                        ),
                        lesson_topic: form.lessonTopic.trim(),
                        lesson_notes:
                            form.lessonNotes.trim(),
                    },
                },
            );

            setSubmitStatus('success');

            return result.lesson;
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'Не удалось назначить урок',
            );
            setSubmitStatus('error');
            throw error;
        }
    }, []);

    return {
        options,
        requestStatus,
        submitStatus,
        errorMessage,
        setErrorMessage,
        createLesson,
    };
}
