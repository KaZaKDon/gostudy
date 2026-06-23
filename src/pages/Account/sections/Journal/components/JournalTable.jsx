import { JournalRow } from './JournalRow.jsx';

export function JournalTable({
    student,
    onOpenLesson,
}) {
    if (!student) {
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

                    <h2>
                        {student.studentName}
                    </h2>

                    <p>
                        {student.subject}
                    </p>
                </div>
            </header>

            <div className="journal-table__head">
                <span>Дата</span>
                <span>Тема</span>
                <span>ДЗ</span>
                <span>Оценка</span>
            </div>

            <div className="journal-table__body">
                {student.lessons.map(
                    (lesson) => (
                        <JournalRow
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