import { StudentHomeworkRow } from './StudentHomeworkRow.jsx';

export function StudentHomeworkList({
    homework = [],
}) {
    if (!homework.length) {
        return (
            <div className="homework-list__empty">
                У вас пока нет домашних заданий.
            </div>
        );
    }

    return (
        <div className="student-homework-list">
            {homework.map((item) => (
                <StudentHomeworkRow
                    key={item.id}
                    homework={item}
                />
            ))}
        </div>
    );
}