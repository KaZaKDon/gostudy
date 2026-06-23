export function JournalLessonModal({
    lesson,
    onClose,
}) {
    if (!lesson) return null;

    return (
        <div className="journal-modal">
            <button
                type="button"
                className="journal-modal__overlay"
                aria-label="Закрыть подробности урока"
                onClick={onClose}
            />

            <section
                className="journal-modal__panel"
                role="dialog"
                aria-modal="true"
            >
                <header className="journal-modal__header">
                    <div>
                        <span>Подробности урока</span>
                        <h2>{lesson.topic}</h2>
                    </div>

                    <button
                        type="button"
                        className="journal-modal__close"
                        aria-label="Закрыть"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </header>

                <div className="journal-modal__meta">
                    <span>Дата: {lesson.date}</span>
                    <span>Раздел: {lesson.textbookSection}</span>
                    <span>ДЗ: {lesson.hasHomework ? 'Да' : 'Нет'}</span>
                    <span>Оценка: {lesson.grade}</span>
                </div>

                <div className="journal-modal__content">
                    <section>
                        <h3>План урока</h3>
                        <p>{lesson.lessonPlan}</p>
                    </section>

                    <section>
                        <h3>Домашнее задание</h3>
                        <p>
                            {lesson.homeworkTitle ||
                                'Домашнее задание не выдавалось.'}
                        </p>
                    </section>

                    <section>
                        <h3>Комментарий для ученика</h3>
                        <p>{lesson.studentComment}</p>
                    </section>

                    <section>
                        <h3>Внутренняя заметка преподавателя</h3>
                        <p>{lesson.teacherNote}</p>
                    </section>
                </div>

                <footer className="journal-modal__actions">
                    <button type="button" onClick={onClose}>
                        Закрыть
                    </button>
                </footer>
            </section>
        </div>
    );
}