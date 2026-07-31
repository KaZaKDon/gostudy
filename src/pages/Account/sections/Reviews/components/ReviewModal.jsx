import { useState } from 'react';

import {
    getReviewStatusText,
    getStars,
} from '../utils.js';

export function ReviewModal({
    role,
    review,
    isSaving,
    errorMessage,
    onClose,
    onSubmit,
}) {
    const studentReview = review?.review;
    const [rating, setRating] = useState(
        studentReview?.rating ?? 5,
    );
    const [text, setText] = useState(
        studentReview?.text ?? '',
    );
    const [reply, setReply] = useState(
        review?.pending_teacher_reply
        ?? review?.teacher_reply
        ?? '',
    );
    const [validationError, setValidationError] = useState('');

    if (!review) {
        return null;
    }

    const isTeacher = role === 'teacher';

    async function handleSubmit() {
        const value = (isTeacher ? reply : text).trim();

        if (!isTeacher && value.length < 20) {
            setValidationError(
                'Напишите отзыв длиной не менее 20 символов',
            );
            return;
        }

        if (isTeacher && value.length < 2) {
            setValidationError('Напишите ответ на отзыв');
            return;
        }

        setValidationError('');

        await onSubmit(
            isTeacher
                ? {
                    reviewId: review.id,
                    text: value,
                }
                : {
                    relationId: review.relation_id,
                    rating,
                    text: value,
                },
        );
    }

    return (
        <div className="review-modal">
            <button
                type="button"
                className="review-modal__overlay"
                aria-label="Закрыть отзыв"
                onClick={onClose}
            />

            <section
                className="review-modal__panel"
                role="dialog"
                aria-modal="true"
            >
                <header className="review-modal__header">
                    <div>
                        <span>
                            {isTeacher
                                ? 'Отзыв ученика'
                                : 'Отзыв преподавателю'}
                        </span>

                        <h2>
                            {isTeacher
                                ? review.student_name
                                : review.teacher_name}
                        </h2>

                        <p>{review.subject_name}</p>
                    </div>

                    <button
                        type="button"
                        className="review-modal__close"
                        onClick={onClose}
                        aria-label="Закрыть"
                    >
                        ×
                    </button>
                </header>

                {isTeacher ? (
                    <div className="review-modal__content">
                        <section>
                            <h3>Оценка</h3>
                            <p className="review-modal__stars">
                                {getStars(review.rating)}
                            </p>
                        </section>

                        <section>
                            <h3>Текст отзыва</h3>
                            <p>{review.text}</p>
                        </section>

                        {review.teacher_reply && (
                            <section>
                                <h3>Опубликованный ответ</h3>
                                <p>{review.teacher_reply}</p>
                            </section>
                        )}

                        {review.reply_status === 'rejected' && (
                            <section className="review-modal__notice review-modal__notice--error">
                                <h3>Ответ отклонён</h3>
                                <p>
                                    {review.reply_rejection_reason
                                        || 'Исправьте ответ и отправьте повторно.'}
                                </p>
                            </section>
                        )}

                        <section>
                            <h3>
                                {review.teacher_reply
                                    ? 'Изменить ответ'
                                    : 'Ответ преподавателя'}
                            </h3>

                            <textarea
                                value={reply}
                                rows="5"
                                placeholder="Напишите ответ на отзыв"
                                maxLength="2000"
                                onChange={(event) =>
                                    setReply(event.target.value)
                                }
                            />

                            <small>{reply.length} / 2000</small>
                        </section>
                    </div>
                ) : (
                    <div className="review-modal__content">
                        {studentReview && (
                            <section className="review-modal__notice">
                                <h3>Статус</h3>
                                <p>
                                    {getReviewStatusText(studentReview)}
                                </p>

                                {studentReview.rejection_reason && (
                                    <p className="review-modal__error-text">
                                        Причина: {studentReview.rejection_reason}
                                    </p>
                                )}
                            </section>
                        )}

                        {studentReview?.published_at && (
                            <section>
                                <h3>Сейчас опубликовано</h3>
                                <p className="review-modal__stars">
                                    {getStars(
                                        studentReview.published_rating,
                                    )}
                                </p>
                                <p>{studentReview.published_text}</p>
                            </section>
                        )}

                        <section>
                            <h3>Оценка</h3>

                            <div className="review-modal__rating-buttons">
                                {[1, 2, 3, 4, 5].map((value) => (
                                    <button
                                        key={value}
                                        type="button"
                                        className={
                                            rating === value
                                                ? 'review-modal__rating review-modal__rating--active'
                                                : 'review-modal__rating'
                                        }
                                        onClick={() => setRating(value)}
                                    >
                                        {value}
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section>
                            <h3>Текст отзыва</h3>

                            <textarea
                                value={text}
                                rows="6"
                                placeholder="Расскажите о занятиях с преподавателем"
                                minLength="20"
                                maxLength="3000"
                                onChange={(event) =>
                                    setText(event.target.value)
                                }
                            />

                            <small>{text.length} / 3000</small>
                        </section>
                    </div>
                )}

                {(validationError || errorMessage) && (
                    <div className="review-modal__form-error">
                        {validationError || errorMessage}
                    </div>
                )}

                <footer className="review-modal__actions">
                    <button
                        type="button"
                        className="review-modal__primary"
                        disabled={isSaving}
                        onClick={handleSubmit}
                    >
                        {isSaving
                            ? 'Сохраняем...'
                            : isTeacher
                                ? 'Отправить ответ'
                                : 'Отправить отзыв'}
                    </button>

                    <button
                        type="button"
                        disabled={isSaving}
                        onClick={onClose}
                    >
                        Закрыть
                    </button>
                </footer>
            </section>
        </div>
    );
}
