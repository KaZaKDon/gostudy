import { StudentTeacherReviewCard } from './StudentTeacherReviewCard.jsx';

function getReviewsTitle(activeStatus) {
    return activeStatus === 'archived'
        ? 'Завершённое обучение'
        : 'Текущие преподаватели';
}

export function StudentReviews({
    relations,
    activeStatus,
    onOpenReview,
    onFindTeacher,
}) {
    const isActive = activeStatus === 'active';

    if (!relations.length) {
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
                {relations.map((relation) => (
                    <StudentTeacherReviewCard
                        key={relation.relation_id}
                        relation={relation}
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
