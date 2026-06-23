import { useState } from 'react';

import { ScheduleDayRow } from './components/ScheduleDayRow.jsx';

import './ScheduleSection.css';

export function ScheduleSection({ role, week, onAddLesson }) {
    const firstActiveDay = week.find((day) => day.lessons.length > 0);

    const [openedDayId, setOpenedDayId] = useState(
        firstActiveDay?.id ?? null,
    );

    const handleToggleDay = (dayId) => {
        setOpenedDayId((currentDayId) =>
            currentDayId === dayId ? null : dayId,
        );
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

            <div className="schedule-section__week">
                {week.map((day) => (
                    <ScheduleDayRow
                        key={day.id}
                        role={role}
                        day={day}
                        isOpen={openedDayId === day.id}
                        onToggle={() => handleToggleDay(day.id)}
                    />
                ))}
            </div>
        </section>
    );
}