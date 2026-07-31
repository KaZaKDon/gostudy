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

function mapCourse(course) {
    return {
        id: `${course.student_id}:${course.subject_id}`,
        studentId: Number(course.student_id),
        subjectId: Number(course.subject_id),
        studentName: course.student_name || 'Ученик',
        studentAvatarUrl: course.student_avatar_url || null,
        subjectName: course.subject_name || 'Предмет',
        classLevel: course.class_level || '',
        lessonsCount: Number(course.lessons_count) || 0,
        pendingResultsCount: Number(course.pending_results_count) || 0,
    };
}

export function useJournal(
    targetLessonId = null,
    initialStudentId = null,
    initialSubjectId = null,
) {
    const [courses, setCourses] = useState([]);
    const [activeCourse, setActiveCourse] = useState(null);
    const [lessons, setLessons] = useState([]);
    const [targetLesson, setTargetLesson] = useState(null);
    const [status, setStatus] = useState('loading');
    const [errorMessage, setErrorMessage] = useState('');
    const [actionError, setActionError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const cursorRef = useRef(null);
    const requestControllerRef = useRef(null);

    const loadJournal = useCallback(async ({
        course = null,
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

            if (course) {
                params.set('student_id', String(course.studentId));
                params.set('subject_id', String(course.subjectId));
            }

            if (!append && !course && targetLessonId) {
                params.set('lesson_id', String(targetLessonId));
            }

            if (
                !append
                && !course
                && !targetLessonId
                && initialStudentId
                && initialSubjectId
            ) {
                params.set('student_id', String(initialStudentId));
                params.set('subject_id', String(initialSubjectId));
            }

            if (append && cursorRef.current) {
                params.set('before_date', cursorRef.current.date);
                params.set('before_id', String(cursorRef.current.id));
            }

            const result = await apiRequest(
                `${API.teacherJournal}?${params.toString()}`,
                { signal: controller.signal },
            );
            const loadedCourses = Array.isArray(result.courses)
                ? result.courses.map(mapCourse)
                : [];
            const loadedLessons = Array.isArray(result.lessons)
                ? result.lessons.map(mapLearningLesson)
                : [];
            const loadedActiveCourse = result.active_course
                ? mapCourse(result.active_course)
                : null;
            const loadedTargetLesson = result.target_lesson
                ? mapLearningLesson(result.target_lesson)
                : null;

            setCourses(loadedCourses);
            setActiveCourse(loadedActiveCourse);
            setLessons((current) => append
                ? mergeLearningLessons(current, loadedLessons)
                : loadedLessons);
            setHasMore(Boolean(result.has_more));
            setTargetLesson(loadedTargetLesson);
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
                    : 'Не удалось загрузить журнал',
            );
            setStatus('error');
        }
    }, [
        initialStudentId,
        initialSubjectId,
        targetLessonId,
    ]);

    useEffect(() => {
        const requestTimer = window.setTimeout(() => {
            loadJournal();
        }, 0);

        return () => {
            window.clearTimeout(requestTimer);
            requestControllerRef.current?.abort();
        };
    }, [loadJournal]);

    const selectCourse = useCallback((courseId) => {
        const course = courses.find((item) => item.id === courseId);

        if (course && course.id !== activeCourse?.id) {
            cursorRef.current = null;
            loadJournal({ course });
        }
    }, [activeCourse?.id, courses, loadJournal]);

    const saveResult = useCallback(async (lessonId, formData) => {
        setActionError('');
        setIsSaving(true);

        try {
            await apiRequest(API.saveJournalResult, {
                method: 'POST',
                body: {
                    lesson_id: lessonId,
                    ...formData,
                },
            });
            await loadJournal({ course: activeCourse });
            window.dispatchEvent(new Event('gostudy:notifications-refresh'));

            return true;
        } catch (error) {
            setActionError(
                error instanceof Error
                    ? error.message
                    : 'Не удалось сохранить запись журнала',
            );

            return false;
        } finally {
            setIsSaving(false);
        }
    }, [activeCourse, loadJournal]);

    return {
        courses,
        activeCourse,
        lessons,
        targetLesson,
        status,
        errorMessage,
        actionError,
        isSaving,
        hasMore,
        retry: () => loadJournal({ course: activeCourse }),
        selectCourse,
        loadMore: () => loadJournal({
            course: activeCourse,
            append: true,
        }),
        saveResult,
        clearActionError: () => setActionError(''),
    };
}
