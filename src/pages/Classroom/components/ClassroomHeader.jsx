import { useEffect, useState } from 'react';

import {
    formatLessonTimer,
    getClassroomStatusLabel,
} from '../utils/classroom.js';

export function ClassroomHeader({
    lesson,
    session,
    access,
    role,
    isSaving,
    onBack,
    onStart,
    onFinish,
}) {
    const [elapsedSeconds, setElapsedSeconds] = useState(
        Number(session.elapsed_seconds) || 0,
    );

    useEffect(() => {
        if (session.status !== 'active') {
            return undefined;
        }

        const timerId = window.setInterval(() => {
            setElapsedSeconds((seconds) => seconds + 1);
        }, 1000);

        return () => window.clearInterval(timerId);
    }, [session.status]);

    const participantLabel = role === 'teacher'
        ? 'Ученик'
        : 'Преподаватель';
    const participantName = role === 'teacher'
        ? lesson.student.name
        : lesson.teacher.name;

    return (
        <header className={`classroom-header classroom-header--${role}`}>
            <div className="classroom-header__main">
                <button
                    type="button"
                    className="classroom-header__back"
                    onClick={onBack}
                >
                    ← Назад
                </button>

                <div>
                    <span className="classroom-header__eyebrow">
                        Урок №{lesson.id} · {lesson.subject_name}
                    </span>

                    <h1>{lesson.topic}</h1>

                    <p>
                        {participantLabel}: <strong>{participantName}</strong>
                        {' · '}
                        <span>{getClassroomStatusLabel(session.status)}</span>
                    </p>
                </div>
            </div>

            <div className="classroom-header__actions">
                <div className="classroom-header__timer">
                    <span>Время урока</span>
                    <strong>{formatLessonTimer(elapsedSeconds)}</strong>
                </div>

                {role === 'teacher' && access.can_start && (
                    <button
                        type="button"
                        className="classroom-header__start"
                        disabled={isSaving}
                        onClick={onStart}
                    >
                        {isSaving ? 'Запускаем...' : 'Начать урок'}
                    </button>
                )}

                {role === 'teacher' && access.can_finish && (
                    <button
                        type="button"
                        className="classroom-header__finish"
                        disabled={isSaving}
                        onClick={onFinish}
                    >
                        Завершить урок
                    </button>
                )}
            </div>
        </header>
    );
}
