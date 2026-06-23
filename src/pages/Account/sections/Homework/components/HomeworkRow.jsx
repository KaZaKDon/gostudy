export function HomeworkRow({
    homework,
    onOpen,
}) {
    return (
        <button
            type="button"
            className="homework-row"
            onClick={() => onOpen(homework)}
        >
            <span className="homework-row__student">
                {homework.studentName}
            </span>

            <span className="homework-row__title">
                {homework.title}
            </span>

            <span className="homework-row__deadline">
                {homework.deadline}
            </span>
        </button>
    );
}