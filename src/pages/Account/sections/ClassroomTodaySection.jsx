import {
    useMemo,
} from 'react';

import { useNavigate } from 'react-router-dom';

import { useCurrentTime } from '../../../hooks/useCurrentTime.js';
import { useSchedule } from '../hooks/useSchedule.js';

import {
    canEnterLesson,
    getClassButtonLabel,
    getLessonCountLabel,
    getTodayLessons,
} from '../utils/schedule.js';

export function ClassroomTodaySection({
    role,
}) {
    const navigate = useNavigate();
    const currentTime = useCurrentTime();

    const isTeacher = role === 'teacher';

    const {
        schedule,
        requestStatus,
        errorMessage,
    } = useSchedule();

    const displayedLessons = useMemo(
        () => getTodayLessons(schedule),
        [schedule],
    );

    const lessonCountText = displayedLessons.length > 0
        ? `Сегодня у вас ${getLessonCountLabel(displayedLessons.length)}`
        : 'Сегодня занятий нет';

    return (
        <section className="account-section">
            <header className="account-section__header">
                <div>
                    <h2>Класс</h2>

                    <p>{lessonCountText}</p>
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
                                            {lesson.statusLabel}
                                        </span>
                                    </td>

                                    <td data-label="Действие">
                                        <button
                                            type="button"
                                            className="account-table__action"
                                            disabled={
                                                !canEnterLesson(
                                                    lesson,
                                                    currentTime,
                                                )
                                            }
                                            onClick={() =>
                                                navigate(`/classroom/${lesson.id}`)
                                            }
                                        >
                                            {getClassButtonLabel(
                                                lesson,
                                                role,
                                                currentTime,
                                            )}
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
