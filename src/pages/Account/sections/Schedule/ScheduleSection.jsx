import {
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    API,
    getAuthHeaders,
} from '../../../../api/api.js';

import { ScheduleDayRow } from './components/ScheduleDayRow.jsx';

import './ScheduleSection.css';

const DAY_NAMES = [
    'Воскресенье',
    'Понедельник',
    'Вторник',
    'Среда',
    'Четверг',
    'Пятница',
    'Суббота',
];

function getStartOfWeek(date = new Date()) {
    const result = new Date(date);
    const day = result.getDay();
    const diff = day === 0 ? -6 : 1 - day;

    result.setDate(result.getDate() + diff);
    result.setHours(0, 0, 0, 0);

    return result;
}

function formatDate(date) {
    return new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'long',
    }).format(date);
}

function parseLessonDate(dateValue) {
    if (!dateValue) {
        return null;
    }

    const date = new Date(String(dateValue).replace(' ', 'T'));

    return Number.isNaN(date.getTime()) ? null : date;
}

function formatTime(dateValue) {
    const date = parseLessonDate(dateValue);

    if (!date) {
        return '';
    }

    return new Intl.DateTimeFormat('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

function createStudentWeek(schedule) {
    const startOfWeek = getStartOfWeek();

    return Array.from({ length: 7 }, (_, index) => {
        const currentDate = new Date(startOfWeek);

        currentDate.setDate(startOfWeek.getDate() + index);

        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`;

        const lessons = schedule
            .filter((lesson) =>
                String(lesson.lesson_date || '').startsWith(dateKey),
            )
            .map((lesson) => ({
                id: lesson.id,
                time: formatTime(lesson.lesson_date),
                teacherName:
                    lesson.teacher_name || 'Преподаватель',
                subject:
                    lesson.subject_name ||
                    lesson.title ||
                    'Предмет не указан',
                topic:
                    lesson.lesson_topic ||
                    lesson.title ||
                    'Тема не указана',
                duration: `${lesson.duration_minutes || 0} минут`,
                status: lesson.status,
            }));

        return {
            id: dateKey,
            dayName: DAY_NAMES[currentDate.getDay()],
            date: formatDate(currentDate),
            startTime: lessons[0]?.time || null,
            lessons,
        };
    });
}

export function ScheduleSection({
    role,
    week = [],
    onAddLesson,
}) {
    const [studentSchedule, setStudentSchedule] = useState([]);
    const [requestStatus, setRequestStatus] = useState(
        role === 'student' ? 'loading' : 'success',
    );
    const [errorMessage, setErrorMessage] = useState('');

    /*
     * undefined — пользователь ещё не открывал и не закрывал дни;
     * null — пользователь вручную закрыл открытый день;
     * string — выбранный день.
     */
    const [openedDayId, setOpenedDayId] = useState(undefined);

    useEffect(() => {
        if (role !== 'student') {
            return undefined;
        }

        const controller = new AbortController();

        async function loadSchedule() {
            try {
                const response = await fetch(API.studentSchedule, {
                    method: 'GET',
                    headers: getAuthHeaders(),
                    signal: controller.signal,
                });

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message ||
                            'Не удалось загрузить расписание',
                    );
                }

                setStudentSchedule(
                    Array.isArray(result.schedule)
                        ? result.schedule
                        : [],
                );
                setRequestStatus('success');
            } catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError') {
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
    }, [role]);

    const displayedWeek = useMemo(
        () =>
            role === 'student'
                ? createStudentWeek(studentSchedule)
                : week,
        [role, studentSchedule, week],
    );

    const firstActiveDayId = useMemo(
        () =>
            displayedWeek.find(
                (day) => day.lessons.length > 0,
            )?.id ?? null,
        [displayedWeek],
    );

    const activeOpenedDayId =
        openedDayId === undefined
            ? firstActiveDayId
            : openedDayId;

    const hasLessons = displayedWeek.some(
        (day) => day.lessons.length > 0,
    );

    const handleToggleDay = (dayId) => {
        setOpenedDayId((currentDayId) => {
            const currentEffectiveDayId =
                currentDayId === undefined
                    ? firstActiveDayId
                    : currentDayId;

            return currentEffectiveDayId === dayId
                ? null
                : dayId;
        });
    };

    return (
        <section className="schedule-section">
            <header className="schedule-section__header">
                <div>
                    <span>Расписание</span>
                    <h2>Неделя занятий</h2>
                </div>

                {onAddLesson && (
                    <button
                        type="button"
                        onClick={onAddLesson}
                    >
                        {role === 'teacher'
                            ? 'Добавить урок'
                            : 'Найти преподавателя'}
                    </button>
                )}
            </header>

            {requestStatus === 'loading' ? (
                <div className="schedule-section__empty">
                    Загружаем расписание...
                </div>
            ) : requestStatus === 'error' ? (
                <div className="schedule-section__error">
                    {errorMessage}
                </div>
            ) : !hasLessons ? (
                <div className="schedule-section__empty">
                    <h3>
                        У вас пока нет запланированных занятий
                    </h3>

                    <p>
                        Когда преподаватель назначит первый урок,
                        расписание появится здесь.
                    </p>
                </div>
            ) : (
                <div className="schedule-section__week">
                    {displayedWeek.map((day) => (
                        <ScheduleDayRow
                            key={day.id}
                            role={role}
                            day={day}
                            isOpen={activeOpenedDayId === day.id}
                            onToggle={() =>
                                handleToggleDay(day.id)
                            }
                        />
                    ))}
                </div>
            )}
        </section>
    );
}