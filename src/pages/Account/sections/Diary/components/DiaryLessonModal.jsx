export function DiaryLessonModal({
    lesson,
    onClose,
}) {
    if (!lesson) return null;

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
                        <span>
                            Подробности занятия
                        </span>

                        <h2>
                            {lesson.topic}
                        </h2>
                    </div>

                    <button
                        type="button"
                        className="diary-modal__close"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </header>

                <div className="diary-modal__meta">
                    <span>
                        Дата: {lesson.date}
                    </span>

                    <span>
                        Оценка:{' '}
                        {lesson.grade}
                    </span>
                </div>

                <div className="diary-modal__content">
                    <section>
                        <h3>
                            Раздел учебника
                        </h3>

                        <p>
                            {
                                lesson.textbookSection
                            }
                        </p>
                    </section>

                    <section>
                        <h3>
                            План занятия
                        </h3>

                        <p>
                            {lesson.lessonPlan}
                        </p>
                    </section>

                    <section>
                        <h3>
                            Домашнее задание
                        </h3>

                        <p>
                            {
                                lesson.homeworkTitle
                            }
                        </p>
                    </section>

                    <section>
                        <h3>
                            Комментарий преподавателя
                        </h3>

                        <p>
                            {
                                lesson.teacherComment
                            }
                        </p>
                    </section>
                </div>

                <footer className="diary-modal__actions">
                    <button
                        type="button"
                        onClick={onClose}
                    >
                        Закрыть
                    </button>
                </footer>
            </section>
        </div>
    );
}