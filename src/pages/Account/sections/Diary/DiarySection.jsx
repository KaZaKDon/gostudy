import {
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    API,
    getAuthHeaders,
} from '../../../../api/api.js';

import {
    getDiarySubjectById,
} from './utils.js';

import { DiarySubjectSidebar } from './components/DiarySubjectSidebar.jsx';
import { DiaryStats } from './components/DiaryStats.jsx';
import { DiaryTable } from './components/DiaryTable.jsx';
import { DiaryLessonModal } from './components/DiaryLessonModal.jsx';

import './DiarySection.css';

const ATTENDANCE_LABELS = {
    present: 'Присутствовал',
    absent: 'Отсутствовал',
    late: 'Опоздал',
};

function formatDate(dateValue) {
    if (!dateValue) {
        return 'Дата не указана';
    }

    const date = new Date(
        String(dateValue).replace(' ', 'T'),
    );

    if (Number.isNaN(date.getTime())) {
        return String(dateValue);
    }

    return new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(date);
}

function calculateAverageGrade(lessons) {
    const grades = lessons
        .map((lesson) => Number(lesson.grade))
        .filter((grade) => Number.isFinite(grade));

    if (!grades.length) {
        return 'Нет оценок';
    }

    const sum = grades.reduce(
        (currentSum, grade) => currentSum + grade,
        0,
    );

    return (sum / grades.length).toFixed(1);
}

function mapDiaryFromApi(apiDiary) {
    const subjectsMap = new Map();

    apiDiary.forEach((item) => {
        const subjectId =
            item.subject_id ||
            `subject-${item.subject_name || 'unknown'}`;

        const subjectName =
            item.subject_name || 'Предмет не указан';

        if (!subjectsMap.has(subjectId)) {
            subjectsMap.set(subjectId, {
                id: String(subjectId),
                subject: subjectName,
                averageGrade: 'Нет оценок',
                lessons: [],
            });
        }

        subjectsMap.get(subjectId).lessons.push({
            id: item.lesson_id,
            date: formatDate(item.lesson_date),
            topic:
                item.lesson_topic ||
                item.lesson_title ||
                'Тема не указана',
            grade: item.grade || 'Без оценки',

            textbookSection:
                item.lesson_notes ||
                'Раздел учебника не указан',

            lessonPlan:
                item.lesson_result ||
                'Результат занятия пока не заполнен',

            homeworkTitle:
                item.homework_title ||
                item.homework_description ||
                'Домашнее задание не назначено',

            teacherComment:
                item.teacher_comment ||
                'Комментарий преподавателя отсутствует',

            homeworkComment:
                item.homework_comment || '',

            teacherName:
                item.teacher_name || 'Преподаватель',

            attendance:
                ATTENDANCE_LABELS[item.attendance] ||
                'Посещаемость не указана',

            lessonStatus: item.lesson_status,
            homeworkStatus: item.homework_status,
            homeworkDueDate: item.homework_due_date,
        });
    });

    return Array.from(subjectsMap.values()).map((subject) => ({
        ...subject,
        averageGrade: calculateAverageGrade(subject.lessons),
    }));
}

export function DiarySection({
    role,
    diary = [],
}) {
    const isStudent = role === 'student';

    const [studentDiary, setStudentDiary] = useState([]);
    const [requestStatus, setRequestStatus] = useState(
        isStudent ? 'loading' : 'success',
    );
    const [errorMessage, setErrorMessage] = useState('');

    const [selectedSubjectId, setSelectedSubjectId] =
        useState(undefined);

    const [selectedLesson, setSelectedLesson] =
        useState(null);

    useEffect(() => {
        if (!isStudent) {
            return undefined;
        }

        const controller = new AbortController();

        async function loadDiary() {
            try {
                const response = await fetch(API.studentDiary, {
                    method: 'GET',
                    headers: getAuthHeaders(),
                    signal: controller.signal,
                });

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message ||
                            'Не удалось загрузить дневник',
                    );
                }

                const mappedDiary = mapDiaryFromApi(
                    Array.isArray(result.diary)
                        ? result.diary
                        : [],
                );

                setStudentDiary(mappedDiary);
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
                        : 'Не удалось загрузить дневник',
                );

                setRequestStatus('error');
            }
        }

        loadDiary();

        return () => {
            controller.abort();
        };
    }, [isStudent]);

    const displayedDiary = isStudent
        ? studentDiary
        : diary;

    const firstSubjectId =
        displayedDiary[0]?.id ?? null;

    const activeSubjectId =
        selectedSubjectId === undefined
            ? firstSubjectId
            : selectedSubjectId;

    const activeSubject = useMemo(
        () =>
            getDiarySubjectById(
                displayedDiary,
                activeSubjectId,
            ),
        [activeSubjectId, displayedDiary],
    );

    if (requestStatus === 'loading') {
        return (
            <section className="diary-section">
                <header className="diary-section__header">
                    <div>
                        <span>Дневник обучения</span>
                        <h2>История занятий</h2>
                    </div>
                </header>

                <div className="diary-table__empty">
                    Загружаем дневник...
                </div>
            </section>
        );
    }

    if (requestStatus === 'error') {
        return (
            <section className="diary-section">
                <header className="diary-section__header">
                    <div>
                        <span>Дневник обучения</span>
                        <h2>История занятий</h2>
                    </div>
                </header>

                <div className="diary-table__empty">
                    {errorMessage}
                </div>
            </section>
        );
    }

    if (!displayedDiary.length) {
        return (
            <section className="diary-section">
                <header className="diary-section__header">
                    <div>
                        <span>Дневник обучения</span>
                        <h2>История занятий</h2>
                    </div>
                </header>

                <div className="diary-table__empty">
                    <h3>В дневнике пока нет записей</h3>

                    <p>
                        После завершённых занятий здесь появятся темы,
                        оценки и комментарии преподавателей.
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section className="diary-section">
            <header className="diary-section__header">
                <div>
                    <span>Дневник обучения</span>
                    <h2>История занятий</h2>
                </div>
            </header>

            <DiaryStats diary={displayedDiary} />

            <div className="diary-section__layout">
                <DiarySubjectSidebar
                    subjects={displayedDiary}
                    activeSubjectId={activeSubject?.id}
                    onSelectSubject={setSelectedSubjectId}
                />

                <DiaryTable
                    subject={activeSubject}
                    onOpenLesson={setSelectedLesson}
                />
            </div>

            <DiaryLessonModal
                lesson={selectedLesson}
                onClose={() => setSelectedLesson(null)}
            />
        </section>
    );
}