export function StudentHomeworkRow({
    homework,
}) {
    return (
        <article className="homework-row">
            <div className="homework-row__main">
                <h3 className="homework-row__title">
                    {homework.title}
                </h3>

                <p className="homework-row__description">
                    {homework.description || 'Описание отсутствует'}
                </p>
            </div>

            <div className="homework-row__info">
                <span>
                    <strong>Предмет:</strong>{' '}
                    {homework.subject_name || 'Не указан'}
                </span>

                <span>
                    <strong>Преподаватель:</strong>{' '}
                    {homework.teacher_name}
                </span>

                <span>
                    <strong>Сдать до:</strong>{' '}
                    {homework.due_date || 'Без срока'}
                </span>

                <span className="homework-row__status">
                    {homework.status}
                </span>
            </div>
        </article>
    );
}