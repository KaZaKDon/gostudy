import {
    useEffect,
    useMemo,
    useState,
} from 'react';

import { useNavigate } from 'react-router-dom';

import {
    API,
    getAuthHeaders,
} from '../../../api/api.js';

const STATUS_LABELS = {
    planned: 'Запланирован',
    active: 'Идёт сейчас',
    completed: 'Завершён',
    cancelled: 'Отменён',
    rescheduled: 'Перенесён',
};

function getLocalDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function formatLessonTime(dateValue) {
    if (!dateValue) {
        return '';
    }

    const date = new Date(
        String(dateValue).replace(' ', 'T'),
    );

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return new Intl.DateTimeFormat('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

function mapStudentLesson(lesson) {
    return {
        id: lesson.id,
        time: formatLessonTime(lesson.lesson_date),
        teacher:
            lesson.teacher_name || 'Преподаватель',
        subject:
            lesson.subject_name ||
            lesson.title ||
            'Предмет не указан',
        topic:
            lesson.lesson_topic ||
            lesson.title ||
            'Тема не указана',
        status:
            STATUS_LABELS[lesson.status] ||
            lesson.status ||
            'Не указан',
        rawData: lesson,
    };
}

export function ClassroomTodaySection({
    role,
    lessons = [],
}) {
    const navigate = useNavigate();

    const isTeacher = role === 'teacher';

    const [studentLessons, setStudentLessons] = useState([]);
    const [requestStatus, setRequestStatus] = useState(
        isTeacher ? 'success' : 'loading',
    );
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (isTeacher) {
            return undefined;
        }

        const controller = new AbortController();

        async function loadTodayLessons() {
            try {
                const response = await fetch(
                    API.studentSchedule,
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
                            'Не удалось загрузить уроки',
                    );
                }

                const todayKey = getLocalDateKey();

                const todayLessons = (
                    Array.isArray(result.schedule)
                        ? result.schedule
                        : []
                )
                    .filter((lesson) =>
                        String(
                            lesson.lesson_date || '',
                        ).startsWith(todayKey),
                    )
                    .map(mapStudentLesson);

                setStudentLessons(todayLessons);
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
                        : 'Не удалось загрузить уроки',
                );

                setRequestStatus('error');
            }
        }

        loadTodayLessons();

        return () => {
            controller.abort();
        };
    }, [isTeacher]);

    const displayedLessons = useMemo(
        () => (
            isTeacher
                ? lessons
                : studentLessons
        ),
        [isTeacher, lessons, studentLessons],
    );

    const lessonCountText =
        displayedLessons.length === 1
            ? '1 урок'
            : displayedLessons.length >= 2 &&
                displayedLessons.length <= 4
              ? `${displayedLessons.length} урока`
              : `${displayedLessons.length} уроков`;

    return (
        <section className="account-section">
            <header className="account-section__header">
                <div>
                    <h2>Класс</h2>

                    <p>
                        Сегодня у вас {lessonCountText}
                    </p>
                </div>
            </header>

            {requestStatus === 'loading' ? (
                <div className="account-panel__placeholder">
                    <p>Загружаем уроки...</p>
                </div>
            ) : requestStatus === 'error' ? (
                <div className="account-panel__placeholder">
                    <p>{errorMessage}</p>
                </div>
            ) : displayedLessons.length === 0 ? (
                <div className="account-panel__placeholder">
                    <h3>Сегодня уроков нет</h3>

                    <p>
                        Запланированные на сегодня занятия
                        появятся здесь.
                    </p>
                </div>
            ) : (
                <div className="account-table-wrap">
                    <table className="account-table">
                        <thead>
                            <tr>
                                <th>Время</th>

                                <th>
                                    {isTeacher
                                        ? 'Ученик'
                                        : 'Преподаватель'}
                                </th>

                                <th>Предмет</th>
                                <th>Тема</th>
                                <th>Статус</th>
                                <th>Действие</th>
                            </tr>
                        </thead>

                        <tbody>
                            {displayedLessons.map((lesson) => (
                                <tr key={lesson.id}>
                                    <td data-label="Время">
                                        {lesson.time}
                                    </td>

                                    <td
                                        data-label={
                                            isTeacher
                                                ? 'Ученик'
                                                : 'Преподаватель'
                                        }
                                    >
                                        {isTeacher
                                            ? lesson.student
                                            : lesson.teacher}
                                    </td>

                                    <td data-label="Предмет">
                                        {lesson.subject}
                                    </td>

                                    <td data-label="Тема">
                                        {lesson.topic}
                                    </td>

                                    <td data-label="Статус">
                                        <span className="account-table__status">
                                            {lesson.status}
                                        </span>
                                    </td>

                                    <td data-label="Действие">
                                        <button
                                            type="button"
                                            className="account-table__action"
                                            onClick={() =>
                                                navigate(
                                                    `/classroom/${lesson.id}`,
                                                    {
                                                        state: {
                                                            role,
                                                            lesson,
                                                        },
                                                    },
                                                )
                                            }
                                        >
                                            Войти в класс
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}