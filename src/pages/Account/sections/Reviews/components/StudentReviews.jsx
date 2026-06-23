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
}) {
    if (!teachers.length) {
        return (
            <div className="reviews-view">
                <div className="reviews-list__empty">
                    В этом разделе пока нет преподавателей.
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
        </div>
    );
}