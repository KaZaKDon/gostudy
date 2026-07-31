export function HomeworkRow({
    homework,
    role,
    onOpen,
}) {
    return (
        <button
            type="button"
            className="homework-row"
            onClick={() => onOpen(homework)}
        >
            <span className="homework-row__student">
                {role === 'teacher'
                    ? homework.student_name
                    : homework.teacher_name}
            </span>

            <span className="homework-row__title">
                <strong>{homework.title}</strong>
                <small>{homework.subject_name}</small>
            </span>

            <span className={`homework-row__state homework-row__state--${homework.display_status}`}>
                {homework.display_status_label}
            </span>

            <span className="homework-row__deadline">
                {homework.due_date_label}
            </span>
        </button>
    );
}
