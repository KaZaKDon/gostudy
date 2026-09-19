import { TeacherBadgeList } from './TeacherBadgeList.jsx';

export function TeacherSearchRow({
    teacher,
    onOpenTeacher,
}) {
    return (
        <div
            className="teacher-search-row"
            role="button"
            tabIndex="0"
            onClick={() => onOpenTeacher(teacher)}
            onKeyDown={(event) => {
                if (
                    event.target === event.currentTarget
                    && (event.key === 'Enter' || event.key === ' ')
                ) {
                    event.preventDefault();
                    onOpenTeacher(teacher);
                }
            }}
        >
            <span className="teacher-search-row__rank">
                {teacher.rank ? `№ ${teacher.rank}` : 'Новый'}
            </span>

            <span className="teacher-search-row__avatar">
                {teacher.photoUrl ? <img src={teacher.photoUrl} alt="" /> : teacher.name
                    .split(' ').map((part) => part[0]).join('').slice(0, 2)}
            </span>

            <span className="teacher-search-row__identity">
                <strong>{teacher.name}</strong>
                <small>{teacher.subject}</small>
                <small className="teacher-search-row__meta">
                    {[teacher.city, teacher.experience, teacher.price]
                        .filter(Boolean)
                        .join(' · ')}
                </small>
                <TeacherBadgeList badgeKeys={teacher.badges} compact />
            </span>

            <span className="teacher-search-row__rating">
                <strong>
                    {teacher.reviewsCount > 0
                        ? `★ ${teacher.rating}`
                        : 'Без оценки'}
                </strong>
                <small>
                    {teacher.reviewsCount > 0
                        ? `${teacher.reviewsCount} отзывов`
                        : 'Пока нет отзывов'}
                </small>
            </span>

            <span className="teacher-search-row__lessons">
                <strong>{teacher.completedLessonsCount}</strong>
                <small>уроков на GoStudy</small>
            </span>

            <span className="teacher-search-row__action">
                Подробнее
            </span>
        </div>
    );
}
