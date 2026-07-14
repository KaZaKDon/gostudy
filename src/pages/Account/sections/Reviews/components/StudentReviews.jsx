import { StudentTeacherReviewCard } from './StudentTeacherReviewCard.jsx';

function getReviewsTitle(activeStatus) {
    switch (activeStatus) {
        case 'requests':
            return 'Заявки преподавателям';

        case 'archive':
            return 'Архив преподавателей';

        default:
            return 'Активные преподаватели';
    }
}

export function StudentReviews({
    teachers,
    activeStatus,
    onOpenReview,
    onFindTeacher,
}) {
    const isActive = activeStatus === 'active';

    if (!teachers.length) {
        return (
            <div className="reviews-view">
                <div className="reviews-list__empty">
                    <p>
                        {isActive
                            ? 'У вас пока нет преподавателей.'
                            : 'В этом разделе пока ничего нет.'}
                    </p>

                    {isActive && (
                        <button
                            type="button"
                            className="reviews-view__find-button"
                            onClick={onFindTeacher}
                        >
                            Найти преподавателя
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="reviews-view">
            <header className="reviews-view__header">
                <span>Мои преподаватели</span>

                <h3>{getReviewsTitle(activeStatus)}</h3>
            </header>

            <div className="reviews-list">
                {teachers.map((teacher) => (
                    <StudentTeacherReviewCard
                        key={teacher.id}
                        teacher={teacher}
                        activeStatus={activeStatus}
                        onOpenReview={onOpenReview}
                    />
                ))}
            </div>

            {isActive && (
                <div className="reviews-view__footer">
                    <button
                        type="button"
                        className="reviews-view__find-button"
                        onClick={onFindTeacher}
                    >
                        Найти ещё преподавателя
                    </button>
                </div>
            )}
        </div>
    );
}