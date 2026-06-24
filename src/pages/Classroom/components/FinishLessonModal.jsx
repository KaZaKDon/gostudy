export function FinishLessonModal({ role, onClose, onSave }) {
    const isTeacher = role === 'teacher';

    return (
        <div className="finish-lesson">
            <button
                type="button"
                className="finish-lesson__overlay"
                aria-label="Закрыть окно завершения урока"
                onClick={onClose}
            />

            <section className="finish-lesson__modal">
                <header>
                    <span>Завершение урока</span>
                    <h2>Итоги занятия</h2>
                </header>

                {isTeacher ? (
                    <form className="finish-lesson__form">
                        <label>
                            <span>Домашнее задание</span>
                            <textarea
                                rows="4"
                                placeholder="Что ученик должен выполнить после урока"
                            />
                        </label>

                        <label>
                            <span>Комментарий ученику</span>
                            <textarea
                                rows="3"
                                placeholder="Что увидит ученик после завершения урока"
                            />
                        </label>

                        <label>
                            <span>Личная заметка</span>
                            <textarea
                                rows="3"
                                placeholder="Внутренняя заметка преподавателя"
                            />
                        </label>
                    </form>
                ) : (
                    <p className="finish-lesson__text">
                        Урок будет завершён. После завершения вы вернётесь в личный кабинет.
                    </p>
                )}

                <div className="finish-lesson__actions">
                    <button
                        type="button"
                        className="finish-lesson__secondary"
                        onClick={onClose}
                    >
                        Отмена
                    </button>

                    <button
                        type="button"
                        className="finish-lesson__primary"
                        onClick={onSave}
                    >
                        Сохранить и выйти
                    </button>
                </div>
            </section>
        </div>
    );
}