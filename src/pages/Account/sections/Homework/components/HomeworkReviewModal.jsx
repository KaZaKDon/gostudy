import { HOMEWORK_GRADES } from '../constants.js';

export function HomeworkReviewModal({
    homework,
    selectedGrade,
    comment,
    onSelectGrade,
    onCommentChange,
    onClose,
}) {
    if (!homework) return null;

    return (
        <div className="homework-modal">
            <button
                type="button"
                className="homework-modal__overlay"
                aria-label="Закрыть проверку домашней работы"
                onClick={onClose}
            />

            <section
                className="homework-modal__panel"
                aria-modal="true"
                role="dialog"
            >
                <header className="homework-modal__header">
                    <div>
                        <span>Проверка домашней работы</span>
                        <h2>{homework.title}</h2>
                    </div>

                    <button
                        type="button"
                        className="homework-modal__close"
                        aria-label="Закрыть"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </header>

                <div className="homework-modal__meta">
                    <span>Ученик: {homework.studentName}</span>
                    <span>Предмет: {homework.subject}</span>
                    <span>Выдано: {homework.assignedAt}</span>
                    <span>Срок: {homework.deadline}</span>
                </div>

                <div className="homework-modal__content">
                    <section>
                        <h3>Задание</h3>
                        <p>{homework.taskText}</p>
                    </section>

                    <section>
                        <h3>Материалы</h3>

                        {homework.materials.length > 0 ? (
                            <ul>
                                {homework.materials.map((material) => (
                                    <li key={material}>{material}</li>
                                ))}
                            </ul>
                        ) : (
                            <p>Материалы не прикреплены.</p>
                        )}
                    </section>

                    <section>
                        <h3>Ответ ученика</h3>
                        <p>
                            {homework.answerText ||
                                'Ученик ещё не отправил ответ.'}
                        </p>
                    </section>

                    <section>
                        <h3>Файлы решения</h3>

                        {homework.attachments.length > 0 ? (
                            <ul>
                                {homework.attachments.map((file) => (
                                    <li key={file}>{file}</li>
                                ))}
                            </ul>
                        ) : (
                            <p>Файлы не приложены.</p>
                        )}
                    </section>

                    <section>
                        <h3>Оценка</h3>

                        <div className="homework-modal__grades">
                            {HOMEWORK_GRADES.map((grade) => (
                                <button
                                    key={grade}
                                    type="button"
                                    className={
                                        selectedGrade === grade
                                            ? 'homework-modal__grade homework-modal__grade--active'
                                            : 'homework-modal__grade'
                                    }
                                    onClick={() => onSelectGrade(grade)}
                                >
                                    {grade}
                                </button>
                            ))}
                        </div>
                    </section>

                    <section>
                        <h3>Комментарий преподавателя</h3>

                        <textarea
                            value={comment}
                            rows="5"
                            placeholder="Напишите комментарий к работе ученика"
                            onChange={(event) =>
                                onCommentChange(event.target.value)
                            }
                        />
                    </section>
                </div>

                <footer className="homework-modal__actions">
                    <button type="button" className="homework-modal__accept">
                        Принять
                    </button>

                    <button type="button" className="homework-modal__revision">
                        На доработку
                    </button>

                    <button type="button" onClick={onClose}>
                        Закрыть
                    </button>
                </footer>
            </section>
        </div>
    );
}