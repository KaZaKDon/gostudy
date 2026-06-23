import { getStars } from '../utils.js';

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
                <strong>{review.authorName}</strong>
                <small>
                    {review.subject} · {review.date}
                </small>
                <em>{review.text}</em>
            </span>
        </button>
    );
}