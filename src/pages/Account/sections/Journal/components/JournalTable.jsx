import { JournalRow } from './JournalRow.jsx';

export function JournalTable({
    course,
    lessons,
    status,
    hasMore,
    onLoadMore,
    onOpenLesson,
}) {
    if (!course) {
        return (
            <div className="journal-table__empty">
                Ученик не выбран.
            </div>
        );
    }

    return (
        <div className="journal-table">
            <header className="journal-table__header">
                <div>
                    <span>Журнал ученика</span>
                    <h2>{course.studentName}</h2>
                    <p>
                        {course.subjectName}
                        {course.classLevel ? ` · ${course.classLevel}` : ''}
                    </p>
                </div>
            </header>

            <div className="journal-table__head">
                <span>Дата</span>
                <span>Тема</span>
                <span>Посещение</span>
                <span>ДЗ</span>
                <span>Оценка</span>
                <span>Запись</span>
            </div>

            <div className="journal-table__body">
                {status === 'loading' ? (
                    <div className="journal-table__loading">
                        Загружаем занятия...
                    </div>
                ) : lessons.length ? (
                    lessons.map((lesson) => (
                        <JournalRow
                            key={lesson.id}
                            lesson={lesson}
                            onOpenLesson={onOpenLesson}
                        />
                    ))
                ) : (
                    <div className="journal-table__loading">
                        Прошедших занятий по предмету пока нет.
                    </div>
                )}
            </div>

            {hasMore && (
                <button
                    type="button"
                    className="journal-table__more"
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
