import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import { API } from '../../../../api/api.js';
import { apiRequest } from '../../../../api/apiRequest.js';
import {
    mapLearningLesson,
    mergeLearningLessons,
} from '../LearningResults/learningResults.js';

const PAGE_SIZE = 30;

function mapSubject(subject) {
    return {
        id: Number(subject.id),
        name: subject.name || 'Предмет',
        lessonsCount: Number(subject.lessons_count) || 0,
        attendedCount: Number(subject.attended_count) || 0,
        averageGrade: subject.average_grade || null,
    };
}

function mapSummary(summary) {
    return {
        lessonsCount: Number(summary?.lessons_count) || 0,
        attendedCount: Number(summary?.attended_count) || 0,
        averageGrade: summary?.average_grade || null,
    };
}

export function useDiary(targetLessonId = null) {
    const [subjects, setSubjects] = useState([]);
    const [activeSubject, setActiveSubject] = useState(null);
    const [lessons, setLessons] = useState([]);
    const [summary, setSummary] = useState(mapSummary(null));
    const [targetLesson, setTargetLesson] = useState(null);
    const [status, setStatus] = useState('loading');
    const [errorMessage, setErrorMessage] = useState('');
    const [hasMore, setHasMore] = useState(false);
    const cursorRef = useRef(null);
    const requestControllerRef = useRef(null);

    const loadDiary = useCallback(async ({
        subject = null,
        lessonId = null,
        append = false,
    } = {}) => {
        requestControllerRef.current?.abort();
        const controller = new AbortController();
        requestControllerRef.current = controller;

        setStatus(append ? 'loading-more' : 'loading');
        setErrorMessage('');

        try {
            const params = new URLSearchParams({
                limit: String(PAGE_SIZE),
            });

            if (subject) {
                params.set('subject_id', String(subject.id));
            }

            if (lessonId) {
                params.set('lesson_id', String(lessonId));
            }

            if (append && cursorRef.current) {
                params.set('before_date', cursorRef.current.date);
                params.set('before_id', String(cursorRef.current.id));
            }

            const result = await apiRequest(
                `${API.studentDiary}?${params.toString()}`,
                { signal: controller.signal },
            );
            const loadedSubjects = Array.isArray(result.subjects)
                ? result.subjects.map(mapSubject)
                : [];
            const loadedLessons = Array.isArray(result.lessons)
                ? result.lessons.map(mapLearningLesson)
                : [];

            setSubjects(loadedSubjects);
            setActiveSubject(
                result.active_subject
                    ? mapSubject(result.active_subject)
                    : null,
            );
            setLessons((current) => append
                ? mergeLearningLessons(current, loadedLessons)
                : loadedLessons);
            setSummary(mapSummary(result.summary));
            setTargetLesson(
                result.target_lesson
                    ? mapLearningLesson(result.target_lesson)
                    : null,
            );
            setHasMore(Boolean(result.has_more));
            cursorRef.current = result.next_before_date
                && result.next_before_id
                ? {
                    date: result.next_before_date,
                    id: Number(result.next_before_id),
                }
                : null;
            setStatus('success');
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                return;
            }

            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'Не удалось загрузить дневник',
            );
            setStatus('error');
        }
    }, []);

    useEffect(() => {
        const requestTimer = window.setTimeout(() => {
            loadDiary({ lessonId: targetLessonId });
        }, 0);

        return () => {
            window.clearTimeout(requestTimer);
            requestControllerRef.current?.abort();
        };
    }, [loadDiary, targetLessonId]);

    const selectSubject = useCallback((subjectId) => {
        const subject = subjects.find((item) => item.id === subjectId);

        if (subject && subject.id !== activeSubject?.id) {
            cursorRef.current = null;
            loadDiary({ subject });
        }
    }, [activeSubject?.id, loadDiary, subjects]);

    return {
        subjects,
        activeSubject,
        lessons,
        summary,
        targetLesson,
        status,
        errorMessage,
        hasMore,
        retry: () => loadDiary({ subject: activeSubject }),
        selectSubject,
        loadMore: () => loadDiary({
            subject: activeSubject,
            append: true,
        }),
    };
}
