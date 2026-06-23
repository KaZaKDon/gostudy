import { getLessonCountLabel } from '../utils.js';

import { ScheduleLessonRow } from './ScheduleLessonRow.jsx';

export function ScheduleDayRow({
    role,
    day,
    isOpen,
    onToggle,
}) {
    const hasLessons = day.lessons.length > 0;

    return (
        <article
            className={
                isOpen
                    ? 'schedule-day schedule-day--open'
                    : 'schedule-day'
            }
        >
            <button
                type="button"
                className="schedule-day__summary"
                onClick={onToggle}
                disabled={!hasLessons}
            >
                <span className="schedule-day__name">
                    {day.dayName}
                </span>

                <span className="schedule-day__date">
                    {day.date}
                </span>

                <span className="schedule-day__count">
                    {getLessonCountLabel(day.lessons.length)}
                </span>

                <span className="schedule-day__start">
                    {day.startTime ? `с ${day.startTime}` : '—'}
                </span>
            </button>

            {isOpen && hasLessons && (
                <div className="schedule-day__lessons">
                    {day.lessons.map((lesson) => (
                        <ScheduleLessonRow
                            key={lesson.id}
                            role={role}
                            lesson={lesson}
                        />
                    ))}
                </div>
            )}
        </article>
    );
}