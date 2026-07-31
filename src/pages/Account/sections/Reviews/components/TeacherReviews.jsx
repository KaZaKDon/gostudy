import { TeacherReviewCard } from './TeacherReviewCard.jsx';

export function TeacherReviews({
    reviews,
    summary,
    onOpenReview,
    hasMore,
    isLoadingMore,
    onLoadMore,
}) {
    if (!reviews.length) {
        return (
            <div className="reviews-list__empty">
                Опубликованных отзывов пока нет.
            </div>
        );
    }

    return (
        <div className="reviews-view">
            <div className="reviews-summary">
                <article>
                    <strong>
                        {Number(summary.rating || 0).toFixed(2)}
                    </strong>

                    <span>Средняя оценка</span>
                </article>

                <article>
                    <strong>
                        {summary.reviews_count || 0}
                    </strong>

                    <span>Всего отзывов</span>
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

            {hasMore && (
                <div className="reviews-view__footer">
                    <button
                        type="button"
                        className="reviews-view__find-button"
                        disabled={isLoadingMore}
                        onClick={onLoadMore}
                    >
                        {isLoadingMore
                            ? 'Загружаем...'
                            : 'Показать ещё'}
                    </button>
                </div>
            )}
        </div>
    );
}
