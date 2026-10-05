function teacherInitials(name) {
    return String(name || 'Преподаватель')
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .slice(0, 2);
}

export function PromotedTeacherCard({
    teacher,
    onOpenTeacher,
}) {
    return (
        <button
            type="button"
            className="promoted-teacher-card"
            aria-label={`Открыть анкету преподавателя ${teacher.name}`}
            onClick={() => onOpenTeacher(teacher)}
        >
            <span className="promoted-teacher-card__photo">
                {teacher.photoUrl ? (
                    <img src={teacher.photoUrl} alt="" />
                ) : teacherInitials(teacher.name)}
            </span>

            <span className="promoted-teacher-card__content">
                <strong>{teacher.name}</strong>
                <small>{teacher.subject}</small>
                <span className="promoted-teacher-card__rating">
                    <b>
                        {teacher.reviewsCount > 0
                            ? `★ ${teacher.rating}`
                            : 'Без оценки'}
                    </b>
                    <small>
                        {teacher.reviewsCount > 0
                            ? `${teacher.reviewsCount} отзывов`
                            : 'Пока нет отзывов'}
                    </small>
                </span>
            </span>
        </button>
    );
}
