import { getAverageRating } from '../utils.js';

import { TeacherReviewCard } from './TeacherReviewCard.jsx';

export function TeacherReviews({
    reviews,
    onOpenReview,
}) {
    return (
        <div className="reviews-view">
            <div className="reviews-summary">
                <article>
                    <strong>
                        {getAverageRating(reviews)}
                    </strong>

                    <span>
                        Средняя оценка
                    </span>
                </article>

                <article>
                    <strong>
                        {reviews.length}
                    </strong>

                    <span>
                        Всего отзывов
                    </span>
                </article>
            </div>

            <div className="reviews-list">
                {reviews.map((review) => (
                    <TeacherReviewCard
                        key={review.id}
                        review={review}
                        onOpenReview={onOpenReview}
                    />
                ))}
            </div>
        </div>
    );
}