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

export function formatReviewDate(dateValue) {
    if (!dateValue) {
        return '';
    }

    const date = new Date(String(dateValue).replace(' ', 'T'));

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(date);
}

export function getReviewStatusText(review) {
    if (!review) {
        return 'Можно оставить отзыв о преподавателе';
    }

    if (review.status === 'pending') {
        return review.published_at
            ? 'Изменения отправлены на модерацию'
            : 'Отзыв находится на модерации';
    }

    if (review.status === 'rejected') {
        return 'Отзыв нужно исправить';
    }

    return 'Отзыв опубликован';
}
