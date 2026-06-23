import { DiaryRow } from './DiaryRow.jsx';

export function DiaryTable({
    subject,
    onOpenLesson,
}) {
    if (!subject) {
        return (
            <div className="diary-table__empty">
                Предмет не выбран.
            </div>
        );
    }

    return (
        <div className="diary-table">
            <header className="diary-table__header">
                <div>
                    <span>Дневник обучения</span>

                    <h2>
                        {subject.subject}
                    </h2>

                    <p>
                        Средний балл:{' '}
                        {subject.averageGrade}
                    </p>
                </div>
            </header>

            <div className="diary-table__head">
                <span>Дата</span>
                <span>Тема</span>
                <span>Оценка</span>
            </div>

            <div className="diary-table__body">
                {subject.lessons.map(
                    (lesson) => (
                        <DiaryRow
                            key={lesson.id}
                            lesson={lesson}
                            onOpenLesson={
                                onOpenLesson
                            }
                        />
                    ),
                )}
            </div>
        </div>
    );
}