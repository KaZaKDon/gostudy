import { useEffect, useState } from 'react';

function formatLessonTime(totalSeconds) {
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
}

export function ClassroomHeader({ lesson, role, onBack, onFinish }) {
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
        const timerId = window.setInterval(() => {
            setSeconds((currentSeconds) => currentSeconds + 1);
        }, 1000);

        return () => window.clearInterval(timerId);
    }, []);

    const personLabel = role === 'teacher' ? 'Ученик' : 'Преподаватель';
    const personName = role === 'teacher' ? lesson.student : lesson.teacher;

    return (
        <header className="classroom-header">
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
                        {lesson.subject}
                    </span>

                    <h1>{lesson.topic}</h1>

                    <p>
                        {personLabel}: <strong>{personName}</strong>
                    </p>
                </div>
            </div>

            <div className="classroom-header__actions">
                <div className="classroom-header__timer">
                    <span>Время урока</span>
                    <strong>{formatLessonTime(seconds)}</strong>
                </div>

                <button
                    type="button"
                    className="classroom-header__finish"
                    onClick={onFinish}
                >
                    Завершить урок
                </button>
            </div>
        </header>
    );
}