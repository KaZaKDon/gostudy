import {
    useMemo,
    useState,
} from 'react';

import { useNavigate } from 'react-router-dom';

import { useCurrentTime } from '../../../../hooks/useCurrentTime.js';
import { ScheduleDayRow } from './components/ScheduleDayRow.jsx';
import { LessonChangeModal } from '../Lessons/LessonChangeModal.jsx';

import { useSchedule } from '../../hooks/useSchedule.js';

import {
    createScheduleWeek,
    getScheduleWeekLabel,
    isCurrentScheduleWeek,
    parseLessonDate,
    shiftScheduleWeek,
} from '../../utils/schedule.js';

import './ScheduleSection.css';

export function ScheduleSection({
    role,
    onAddLesson,
    refreshKey,
    initialDate,
}) {
    const navigate = useNavigate();
    const currentTime = useCurrentTime();

    const [displayedDate, setDisplayedDate] = useState(
        () => parseLessonDate(initialDate) || new Date(),
    );
    const [localRevision, setLocalRevision] = useState(0);
    const [changeDialog, setChangeDialog] = useState(null);
    const [noticeMessage, setNoticeMessage] = useState('');

    const {
        schedule,
        requestStatus,
        errorMessage,
    } = useSchedule(displayedDate, refreshKey + localRevision);

    /*
     * undefined — пользователь ещё не открывал и не закрывал дни;
     * null — пользователь вручную закрыл открытый день;
     * string — выбранный день.
     */
    const [openedDayId, setOpenedDayId] = useState(undefined);

    const displayedWeek = useMemo(
        () => createScheduleWeek(schedule, displayedDate),
        [displayedDate, schedule],
    );

    const weekLabel = getScheduleWeekLabel(displayedDate);
    const isCurrentWeek = isCurrentScheduleWeek(displayedDate);

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

    const handleEnterClass = (lesson) => {
        navigate(`/classroom/${lesson.id}`);
    };

    const handleShiftWeek = (direction) => {
        setDisplayedDate((currentDate) =>
            shiftScheduleWeek(currentDate, direction),
        );
        setOpenedDayId(undefined);
    };

    const handleShowCurrentWeek = () => {
        setDisplayedDate(new Date());
        setOpenedDayId(undefined);
    };

    const handleOpenChange = (lesson, action) => {
        setNoticeMessage('');
        setChangeDialog({
            action,
            lesson: {
                ...lesson,
                personName:
                    role === 'teacher'
                        ? lesson.studentName
                        : lesson.teacherName,
            },
        });
    };

    const handleChangeCompleted = (message) => {
        setChangeDialog(null);
        setNoticeMessage(message || 'Расписание обновлено');
        setLocalRevision((revision) => revision + 1);
    };

    return (
        <section className="schedule-section">
            <header className="schedule-section__header">
                <div>
                    <span>Расписание</span>
                    <h2>Неделя занятий</h2>
                </div>

                <div className="schedule-section__header-actions">
                    {onAddLesson && (
                        <button
                            type="button"
                            className="schedule-section__add"
                            onClick={() => onAddLesson()}
                        >
                            {role === 'teacher'
                                ? 'Добавить урок'
                                : 'Найти преподавателя'}
                        </button>
                    )}
                </div>
            </header>

            <nav
                className="schedule-section__navigation"
                aria-label="Навигация по неделям"
            >
                <button
                    type="button"
                    aria-label="Предыдущая неделя"
                    onClick={() => handleShiftWeek(-1)}
                >
                    ←
                </button>

                <strong>{weekLabel}</strong>

                <button
                    type="button"
                    aria-label="Следующая неделя"
                    onClick={() => handleShiftWeek(1)}
                >
                    →
                </button>

                {!isCurrentWeek && (
                    <button
                        type="button"
                        className="schedule-section__today"
                        onClick={handleShowCurrentWeek}
                    >
                        Текущая неделя
                    </button>
                )}
            </nav>

            {noticeMessage && (
                <p className="schedule-section__notice">
                    {noticeMessage}
                </p>
            )}

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
                        {role === 'teacher'
                            ? 'Когда будет назначен первый урок, расписание появится здесь.'
                            : 'Когда преподаватель назначит первый урок, расписание появится здесь.'}
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
                            onEnterClass={handleEnterClass}
                            onOpenChange={handleOpenChange}
                            currentTime={currentTime}
                            onToggle={() =>
                                handleToggleDay(day.id)
                            }
                        />
                    ))}
                </div>
            )}

            {changeDialog && (
                <LessonChangeModal
                    lesson={changeDialog.lesson}
                    action={changeDialog.action}
                    onClose={() => setChangeDialog(null)}
                    onCompleted={handleChangeCompleted}
                />
            )}
        </section>
    );
}
