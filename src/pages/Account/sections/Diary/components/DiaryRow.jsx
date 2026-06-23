export function DiaryRow({
    lesson,
    onOpenLesson,
}) {
    return (
        <button
            type="button"
            className="diary-row"
            onClick={() =>
                onOpenLesson(lesson)
            }
        >
            <span className="diary-row__date">
                {lesson.date}
            </span>

            <span className="diary-row__topic">
                {lesson.topic}
            </span>

            <span className="diary-row__grade">
                {lesson.grade}
            </span>
        </button>
    );
}