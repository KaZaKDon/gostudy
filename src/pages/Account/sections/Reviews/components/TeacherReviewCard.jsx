import {
    formatReviewDate,
    getStars,
} from '../utils.js';

export function TeacherReviewCard({ review, onOpenReview }) {
    return (
        <button
            type="button"
            className="review-card"
            onClick={() => onOpenReview(review)}
        >
            <span className="review-card__rating">
                {getStars(review.rating)}
            </span>

            <span className="review-card__body">
                <strong>{review.student_name}</strong>

                <small>
                    {review.subject_name}
                    {' · '}
                    {formatReviewDate(review.published_at)}
                </small>

                <em>{review.text}</em>

                {review.reply_status === 'pending' && (
                    <span className="review-card__status">
                        Ответ находится на модерации
                    </span>
                )}

                {review.reply_status === 'rejected' && (
                    <span className="review-card__status review-card__status--error">
                        Ответ отклонён — его можно исправить
                    </span>
                )}
            </span>
        </button>
    );
}
