import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import { API } from '../../../../api/api.js';
import { apiRequest } from '../../../../api/apiRequest.js';

import './ParentDashboard.css';

const HOMEWORK_STATUS = {
    progress: 'Выполняется',
    review: 'На проверке',
    late: 'Просрочено',
};

const ATTENDANCE = {
    present: 'Присутствовал',
    absent: 'Отсутствовал',
    late: 'Опоздал',
};

function parseLocalDate(value) {
    if (!value) return null;

    const date = new Date(String(value).replace(' ', 'T'));

    return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value, options) {
    const date = parseLocalDate(value);

    if (!date) return value || 'Дата не указана';

    return new Intl.DateTimeFormat('ru-RU', options).format(date);
}

function DashboardBlock({
    title,
    actionLabel,
    onOpenAll,
    children,
    emptyText,
}) {
    return (
        <section className="parent-dashboard__block">
            <header className="parent-dashboard__block-header">
                <h3>{title}</h3>
                <button type="button" onClick={onOpenAll}>
                    {actionLabel}
                </button>
            </header>

            {children || (
                <p className="parent-dashboard__empty">{emptyText}</p>
            )}
        </section>
    );
}

export function ParentDashboard({
    onOpenSection,
    onOpenSchedule,
    onOpenHomework,
    onOpenDiary,
}) {
    const [dashboard, setDashboard] = useState(null);
    const [status, setStatus] = useState('loading');
    const [message, setMessage] = useState('');

    const load = useCallback((signal) => {
        apiRequest(API.parentDashboard, { signal }).then((result) => {
            setDashboard(result);
            setStatus('success');
        }).catch((error) => {
            if (error.name !== 'AbortError') {
                setMessage(error.message);
                setStatus('error');
            }
        });
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        load(controller.signal);

        return () => controller.abort();
    }, [load]);

    const retry = () => {
        setStatus('loading');
        setMessage('');
        load();
    };

    if (status === 'loading') {
        return (
            <section className="parent-dashboard parent-dashboard--state">
                <p>Собираем события детей...</p>
            </section>
        );
    }

    if (status === 'error' || !dashboard) {
        return (
            <section className="parent-dashboard parent-dashboard--state">
                <p className="parent-dashboard__error">
                    {message || 'Не удалось загрузить семейную сводку'}
                </p>
                <button type="button" onClick={retry}>
                    Повторить
                </button>
            </section>
        );
    }

    if (!dashboard.children.length) {
        return (
            <section className="parent-dashboard parent-dashboard--state">
                <span>Семейный обзор</span>
                <h2>Подключите аккаунт ребёнка</h2>
                <p>
                    После подтверждения связи здесь появятся занятия,
                    домашние задания и записи дневника.
                </p>
                <button
                    type="button"
                    onClick={() => onOpenSection('children')}
                >
                    Перейти в «Мои дети»
                </button>
            </section>
        );
    }

    const summary = dashboard.summary;

    return (
        <section className="parent-dashboard">
            <header className="parent-dashboard__header">
                <span>Семейный обзор</span>
                <h2>Главное по всем детям</h2>
                <p>
                    Ближайшие занятия, текущие задания и последние результаты
                    собраны в одном месте.
                </p>
            </header>

            <div className="parent-dashboard__stats">
                <article>
                    <strong>{summary.children_count}</strong>
                    <span>детей подключено</span>
                </article>
                <article>
                    <strong>{summary.upcoming_lessons_count}</strong>
                    <span>занятий впереди</span>
                </article>
                <article>
                    <strong>{summary.active_homework_count}</strong>
                    <span>активных заданий</span>
                </article>
                <article>
                    <strong>{summary.recent_diary_count}</strong>
                    <span>последних записей</span>
                </article>
            </div>

            <div className="parent-dashboard__grid">
                <DashboardBlock
                    title="Ближайшие занятия"
                    actionLabel="Всё расписание"
                    onOpenAll={() => onOpenSection('schedule')}
                    emptyText="Ближайших занятий пока нет."
                >
                    {dashboard.upcoming_lessons.length > 0 && (
                        <div className="parent-dashboard__list">
                            {dashboard.upcoming_lessons.map((lesson) => (
                                <button
                                    type="button"
                                    className="parent-dashboard__row"
                                    key={lesson.id}
                                    onClick={() => onOpenSchedule(lesson)}
                                >
                                    <span className="parent-dashboard__date">
                                        {formatDate(lesson.lesson_date, {
                                            day: 'numeric',
                                            month: 'short',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </span>
                                    <span className="parent-dashboard__row-main">
                                        <strong>{lesson.subject_name}</strong>
                                        <small>
                                            {lesson.child_name} · {lesson.teacher_name}
                                        </small>
                                    </span>
                                    <span className="parent-dashboard__arrow">→</span>
                                </button>
                            ))}
                        </div>
                    )}
                </DashboardBlock>

                <DashboardBlock
                    title="Домашние задания"
                    actionLabel="Все задания"
                    onOpenAll={() => onOpenSection('homework')}
                    emptyText="Активных домашних заданий нет."
                >
                    {dashboard.active_homework.length > 0 && (
                        <div className="parent-dashboard__list">
                            {dashboard.active_homework.map((homework) => (
                                <button
                                    type="button"
                                    className="parent-dashboard__row"
                                    key={homework.id}
                                    onClick={() => onOpenHomework(homework.id)}
                                >
                                    <span
                                        className={`parent-dashboard__badge is-${homework.display_status}`}
                                    >
                                        {HOMEWORK_STATUS[homework.display_status]
                                            || 'Активно'}
                                    </span>
                                    <span className="parent-dashboard__row-main">
                                        <strong>{homework.title}</strong>
                                        <small>
                                            {homework.child_name} · {homework.subject_name}
                                            {homework.due_date
                                                ? ` · до ${formatDate(homework.due_date, {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}`
                                                : ''}
                                        </small>
                                    </span>
                                    <span className="parent-dashboard__arrow">→</span>
                                </button>
                            ))}
                        </div>
                    )}
                </DashboardBlock>

                <DashboardBlock
                    title="Последние записи дневника"
                    actionLabel="Весь дневник"
                    onOpenAll={() => onOpenSection('diary')}
                    emptyText="Опубликованных записей пока нет."
                >
                    {dashboard.recent_diary.length > 0 && (
                        <div className="parent-dashboard__list">
                            {dashboard.recent_diary.map((entry) => (
                                <button
                                    type="button"
                                    className="parent-dashboard__row"
                                    key={entry.lesson_id}
                                    onClick={() => onOpenDiary(entry.lesson_id)}
                                >
                                    <span className="parent-dashboard__grade">
                                        {entry.grade || '—'}
                                    </span>
                                    <span className="parent-dashboard__row-main">
                                        <strong>{entry.subject_name}</strong>
                                        <small>{entry.topic}</small>
                                        <small>
                                            {entry.child_name} · {ATTENDANCE[entry.attendance]
                                                || 'Посещаемость не указана'}
                                        </small>
                                    </span>
                                    <span className="parent-dashboard__arrow">→</span>
                                </button>
                            ))}
                        </div>
                    )}
                </DashboardBlock>
            </div>
        </section>
    );
}
