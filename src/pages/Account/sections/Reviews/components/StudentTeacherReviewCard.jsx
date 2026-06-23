import { getStars } from '../utils.js';

function getTeacherStatusText(teacher, activeStatus) {
    if (activeStatus === 'requests') {
        return teacher.requestStatus ?? 'Ожидает ответа преподавателя';
    }

    if (activeStatus === 'archive') {
        return teacher.archiveText ?? 'Обучение завершено';
    }

    if (teacher.rating) {
        return teacher.reviewText;
    }

    return 'Кликните, чтобы открыть карточку преподавателя';
}

function getTeacherActionText(teacher, activeStatus) {
    if (activeStatus === 'requests') {
        return 'Заявка отправлена';
    }

    if (activeStatus === 'archive') {
        return 'Возобновить обучение';
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
    return (
        <button
            type="button"
            className="review-card"
            onClick={() => onOpenReview(teacher)}
        >
            <span className="review-card__rating">
                {getTeacherActionText(teacher, activeStatus)}
            </span>

            <span className="review-card__body">
                <strong>{teacher.teacherName}</strong>
                <small>{teacher.subject}</small>

                <em>{getTeacherStatusText(teacher, activeStatus)}</em>
            </span>
        </button>
    );
}