import { DiaryRow } from './DiaryRow.jsx';

export function DiaryTable({
    subject,
    lessons,
    status,
    hasMore,
    onLoadMore,
    onOpenLesson,
}) {
    if (!subject) {
        return <div className="diary-table__empty">Предмет не выбран.</div>;
    }

    return (
        <div className="diary-table">
            <header className="diary-table__header">
                <div>
                    <span>Дневник обучения</span>
                    <h2>{subject.name}</h2>
                    <p>
                        {subject.averageGrade
                            ? `Средний балл: ${subject.averageGrade}`
                            : 'Оценок пока нет'}
                    </p>
                </div>
            </header>

            <div className="diary-table__head">
                <span>Дата</span>
                <span>Тема</span>
                <span>Посещение</span>
                <span>Оценка</span>
            </div>

            <div className="diary-table__body">
                {status === 'loading' ? (
                    <div className="diary-table__loading">
                        Загружаем занятия...
                    </div>
                ) : lessons.length ? (
                    lessons.map((lesson) => (
                        <DiaryRow
                            key={lesson.id}
                            lesson={lesson}
                            onOpenLesson={onOpenLesson}
                        />
                    ))
                ) : (
                    <div className="diary-table__loading">
                        По этому предмету записей пока нет.
                    </div>
                )}
            </div>

            {hasMore && (
                <button
                    type="button"
                    className="diary-table__more"
                    disabled={status === 'loading-more'}
                    onClick={onLoadMore}
                >
                    {status === 'loading-more'
                        ? 'Загружаем...'
                        : 'Показать ещё'}
                </button>
            )}
        </div>
    );
}
