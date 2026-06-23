import { getHomeworkLabel } from '../utils.js';

export function JournalRow({
    lesson,
    onOpenLesson,
}) {
    return (
        <button
            type="button"
            className="journal-row"
            onClick={() => onOpenLesson(lesson)}
        >
            <span className="journal-row__date">
                {lesson.date}
            </span>

            <span className="journal-row__topic">
                {lesson.topic}
            </span>

            <span className="journal-row__homework">
                {getHomeworkLabel(
                    lesson.hasHomework,
                )}
            </span>

            <span className="journal-row__grade">
                {lesson.grade}
            </span>
        </button>
    );
}