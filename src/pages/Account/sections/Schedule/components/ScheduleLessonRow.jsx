export function ScheduleLessonRow({ role, lesson }) {
    const personName =
        role === 'teacher'
            ? lesson.studentName
            : lesson.teacherName;

    const classButtonText =
        role === 'teacher'
            ? 'В класс'
            : 'Войти в класс';

    return (
        <div className="schedule-lesson">
            <span className="schedule-lesson__time">
                {lesson.time}
            </span>

            <span className="schedule-lesson__person">
                {personName}
            </span>

            <span className="schedule-lesson__info">
                {lesson.subject}
                {' · '}
                {lesson.topic}
            </span>

            <span className="schedule-lesson__duration">
                {lesson.duration}
            </span>

            <div className="schedule-lesson__actions">
                <button
                    type="button"
                    className="schedule-lesson__action schedule-lesson__action--primary"
                >
                    {classButtonText}
                </button>

                <button
                    type="button"
                    className="schedule-lesson__action"
                >
                    Перенести
                </button>

                <button
                    type="button"
                    className="schedule-lesson__action schedule-lesson__action--danger"
                >
                    Отменить
                </button>
            </div>
        </div>
    );
}