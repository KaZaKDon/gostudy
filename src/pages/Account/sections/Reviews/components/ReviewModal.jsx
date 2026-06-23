import { useState } from 'react';

import { getStars } from '../utils.js';

export function ReviewModal({
    role,
    review,
    onClose,
}) {
    const [rating, setRating] = useState(
        review?.rating ?? 5,
    );
    const [text, setText] = useState(
        review?.reviewText ?? review?.text ?? '',
    );
    const [reply, setReply] = useState(
        review?.teacherReply ?? '',
    );

    if (!review) return null;

    const isTeacher = role === 'teacher';

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
                                ? review.authorName
                                : review.teacherName}
                        </h2>

                        <p>{review.subject}</p>
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

                        <section>
                            <h3>Ответ преподавателя</h3>

                            <textarea
                                value={reply}
                                rows="5"
                                placeholder="Напишите ответ на отзыв"
                                onChange={(event) =>
                                    setReply(event.target.value)
                                }
                            />
                        </section>
                    </div>
                ) : (
                    <div className="review-modal__content">
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
                                placeholder="Напишите, что понравилось в занятиях"
                                onChange={(event) =>
                                    setText(event.target.value)
                                }
                            />
                        </section>
                    </div>
                )}

                <footer className="review-modal__actions">
                    <button
                        type="button"
                        className="review-modal__primary"
                        onClick={onClose}
                    >
                        {isTeacher ? 'Сохранить ответ' : 'Отправить отзыв'}
                    </button>

                    <button type="button" onClick={onClose}>
                        Закрыть
                    </button>
                </footer>
            </section>
        </div>
    );
}