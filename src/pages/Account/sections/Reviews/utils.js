export function getStars(rating) {
    if (!rating) return 'Отзыв не оставлен';

    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

export function getAverageRating(reviews) {
    const ratedReviews = reviews.filter((review) => review.rating);

    if (!ratedReviews.length) return '—';

    const total = ratedReviews.reduce(
        (sum, review) => sum + review.rating,
        0,
    );

    return (total / ratedReviews.length).toFixed(1);
}