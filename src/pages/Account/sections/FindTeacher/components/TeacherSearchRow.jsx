export function TeacherSearchRow({
    teacher,
    onOpenTeacher,
}) {
    return (
        <button
            type="button"
            className="teacher-search-row"
            onClick={() => onOpenTeacher(teacher)}
        >
            <span className="teacher-search-row__rating">
                ★ {teacher.rating}
            </span>

            <span className="teacher-search-row__name">
                {teacher.name}

                {teacher.isVerified && (
                    <small>Проверен GoStudy</small>
                )}
            </span>

            <span className="teacher-search-row__subject">
                {teacher.subject}
            </span>

            <span className="teacher-search-row__experience">
                {teacher.experience}
            </span>

            <span className="teacher-search-row__price">
                {teacher.price}
            </span>

            <span className="teacher-search-row__action">
                Подробнее
            </span>
        </button>
    );
}