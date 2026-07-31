import {
    formatLearningDate,
    getAttendanceLabel,
    getGradeLabel,
    getHomeworkStatusLabel,
} from '../../LearningResults/learningResults.js';

export function DiaryLessonModal({
    lesson,
    onOpenHomework,
    onClose,
}) {
    if (!lesson) {
        return null;
    }

    return (
        <div className="diary-modal">
            <button
                type="button"
                className="diary-modal__overlay"
                aria-label="Закрыть урок"
                onClick={onClose}
            />

            <section
                className="diary-modal__panel"
                role="dialog"
                aria-modal="true"
            >
                <header className="diary-modal__header">
                    <div>
                        <span>Результат занятия</span>
                        <h2>{lesson.topic}</h2>
                    </div>
                    <button
                        type="button"
                        className="diary-modal__close"
                        aria-label="Закрыть"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </header>

                <div className="diary-modal__meta">
                    <span>{formatLearningDate(lesson.lessonDate)}</span>
                    <span>{lesson.teacherName}</span>
                    <span>{getAttendanceLabel(lesson.attendance)}</span>
                    <span>Оценка: {getGradeLabel(lesson.grade)}</span>
                </div>

                <div className="diary-modal__content">
                    <section>
                        <h3>Результат занятия</h3>
                        <p>
                            {lesson.lessonResult
                                || 'Результат не указан.'}
                        </p>
                    </section>

                    <section>
                        <h3>Комментарий преподавателя</h3>
                        <p>
                            {lesson.teacherComment
                                || 'Комментарий отсутствует.'}
                        </p>
                    </section>

                    <section>
                        <h3>Домашняя работа</h3>
                        <p>
                            {lesson.homeworkCount > 0
                                ? `${lesson.latestHomeworkTitle || 'Задание выдано'} · ${getHomeworkStatusLabel(
                                    lesson.latestHomeworkStatus,
                                )}`
                                : 'Домашняя работа не назначалась.'}
                        </p>
                    </section>
                </div>

                <footer className="diary-modal__actions">
                    {lesson.homeworkCount > 0 && (
                        <button
                            type="button"
                            onClick={() => onOpenHomework?.(
                                lesson.latestHomeworkId,
                            )}
                        >
                            Открыть домашние работы
                        </button>
                    )}
                    <button type="button" onClick={onClose}>
                        Закрыть
                    </button>
                </footer>
            </section>
        </div>
    );
}
