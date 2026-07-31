import {
    getReviewStatusText,
    getStars,
} from '../utils.js';

function getTeacherStatusText(relation) {
    if (!relation.can_review) {
        return 'Отзыв станет доступен после первого проведённого урока';
    }

    return getReviewStatusText(relation.review);
}

function getTeacherActionText(relation) {
    const review = relation.review;

    if (!relation.can_review) {
        return 'После урока';
    }

    if (!review) {
        return 'Оставить отзыв';
    }

    if (review.status === 'rejected') {
        return 'Исправить отзыв';
    }

    return getStars(
        review.published_rating
        || review.rating,
    );
}

export function StudentTeacherReviewCard({
    relation,
    onOpenReview,
}) {
    const canOpenReview = relation.can_review;

    return (
        <button
            type="button"
            className="review-card"
            disabled={!canOpenReview}
            onClick={() => {
                if (canOpenReview) {
                    onOpenReview(relation);
                }
            }}
        >
            <span className="review-card__rating">
                {getTeacherActionText(relation)}
            </span>

            <span className="review-card__body">
                <strong>
                    {relation.teacher_name}
                </strong>

                <small>
                    {relation.subject_name}
                    {' · '}
                    {relation.completed_lessons_count}
                    {' проведённых уроков'}
                </small>

                <em>
                    {getTeacherStatusText(relation)}
                </em>
            </span>
        </button>
    );
}
