export function FinishLessonModal({
    isSaving,
    errorMessage,
    onClose,
    onFinish,
}) {
    return (
        <div className="finish-lesson">
            <button
                type="button"
                className="finish-lesson__overlay"
                aria-label="Закрыть окно завершения урока"
                onClick={onClose}
            />

            <section
                className="finish-lesson__modal"
                role="dialog"
                aria-modal="true"
            >
                <header>
                    <span>Завершение урока</span>
                    <h2>Завершить занятие?</h2>
                </header>

                <p className="finish-lesson__text">
                    Урок станет завершённым у преподавателя и ученика.
                    После этого можно заполнить существующий журнал и
                    при необходимости выдать домашнее задание.
                </p>

                {errorMessage && (
                    <p className="classroom-inline-error" role="alert">
                        {errorMessage}
                    </p>
                )}

                <div className="finish-lesson__actions">
                    <button
                        type="button"
                        className="finish-lesson__secondary"
                        disabled={isSaving}
                        onClick={onClose}
                    >
                        Продолжить урок
                    </button>

                    <button
                        type="button"
                        className="finish-lesson__primary"
                        disabled={isSaving}
                        onClick={onFinish}
                    >
                        {isSaving ? 'Завершаем...' : 'Завершить урок'}
                    </button>
                </div>
            </section>
        </div>
    );
}
