export function DiaryStats({ summary }) {
    return (
        <div className="diary-stats">
            <article className="diary-stat">
                <strong>{summary.averageGrade || '—'}</strong>
                <span>Средний балл</span>
            </article>
            <article className="diary-stat">
                <strong>{summary.lessonsCount}</strong>
                <span>Записей в дневнике</span>
            </article>
            <article className="diary-stat">
                <strong>{summary.attendedCount}</strong>
                <span>Занятий посещено</span>
            </article>
        </div>
    );
}
