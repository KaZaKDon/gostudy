import { getStars } from '../utils.js';

function getTeacherStatusText(teacher, activeStatus) {
    if (activeStatus === 'requests') {
        return (
            teacher.requestStatus ||
            'Ожидает ответа преподавателя'
        );
    }

    if (activeStatus === 'archive') {
        return (
            teacher.archiveText ||
            'Обучение завершено'
        );
    }

    if (teacher.rating) {
        return (
            teacher.reviewText ||
            'Отзыв оставлен'
        );
    }

    return 'Можно оставить отзыв о преподавателе';
}

function getTeacherActionText(teacher, activeStatus) {
    if (activeStatus === 'requests') {
        return 'Заявка отправлена';
    }

    if (activeStatus === 'archive') {
        return 'В архиве';
    }

    if (teacher.rating) {
        return getStars(teacher.rating);
    }

    return 'Оставить отзыв';
}

export function StudentTeacherReviewCard({
    teacher,
    activeStatus,
    onOpenReview,
}) {
    const canOpenReview = activeStatus === 'active';

    return (
        <button
            type="button"
            className="review-card"
            disabled={!canOpenReview}
            onClick={() => {
                if (canOpenReview) {
                    onOpenReview(teacher);
                }
            }}
        >
            <span className="review-card__rating">
                {getTeacherActionText(
                    teacher,
                    activeStatus,
                )}
            </span>

            <span className="review-card__body">
                <strong>
                    {teacher.teacherName}
                </strong>

                <small>
                    {teacher.subject}
                </small>

                <em>
                    {getTeacherStatusText(
                        teacher,
                        activeStatus,
                    )}
                </em>
            </span>
        </button>
    );
}