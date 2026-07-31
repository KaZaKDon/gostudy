import { useMemo, useState } from 'react';

import {
    Badge,
    Button,
    Input,
    Modal,
    Select,
} from '../../components/ui/index.js';

const statusLabels = {
    none: 'Нет ответа',
    pending: 'На модерации',
    approved: 'Одобрено',
    rejected: 'Отклонено',
};

const statusVariants = {
    none: 'default',
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
};

function getDefaultTarget(review) {
    if (review?.status === 'pending') {
        return 'review';
    }

    if (review?.reply_status === 'pending') {
        return 'reply';
    }

    return 'review';
}

export function ReviewModerationModal({
    review,
    isModerating,
    error,
    onClose,
    onModerate,
}) {
    const [target, setTarget] = useState(
        getDefaultTarget(review),
    );
    const [comment, setComment] = useState('');
    const [validationError, setValidationError] = useState('');

    const targetOptions = useMemo(() => {
        const options = [];

        if (review?.status === 'pending') {
            options.push({
                value: 'review',
                label: 'Отзыв ученика',
            });
        }

        if (review?.reply_status === 'pending') {
            options.push({
                value: 'reply',
                label: 'Ответ преподавателя',
            });
        }

        return options;
    }, [review]);

    if (!review) {
        return null;
    }

    async function handleDecision(decision) {
        const reason = comment.trim();

        if (decision === 'rejected' && !reason) {
            setValidationError('Укажите причину отклонения');
            return;
        }

        setValidationError('');

        await onModerate({
            target,
            decision,
            comment: reason,
        });
    }

    const footer = targetOptions.length ? (
        <>
            <Button
                variant="danger"
                loading={isModerating}
                onClick={() => handleDecision('rejected')}
            >
                Отклонить
            </Button>

            <Button
                variant="primary"
                loading={isModerating}
                onClick={() => handleDecision('approved')}
            >
                Одобрить
            </Button>
        </>
    ) : null;

    return (
        <Modal
            isOpen
            title={`Отзыв №${review.id}`}
            description={`${review.student_name} → ${review.teacher_name}`}
            footer={footer}
            onClose={onClose}
        >
            <div className="review-moderation">
                <section className="review-moderation__meta">
                    <div>
                        <span>Предмет</span>
                        <strong>{review.subject_name || '—'}</strong>
                    </div>

                    <div>
                        <span>Статус отзыва</span>
                        <Badge
                            variant={
                                statusVariants[review.status]
                                || 'default'
                            }
                        >
                            {statusLabels[review.status]
                                || review.status}
                        </Badge>
                    </div>

                    <div>
                        <span>Статус ответа</span>
                        <Badge
                            variant={
                                statusVariants[review.reply_status]
                                || 'default'
                            }
                        >
                            {statusLabels[review.reply_status]
                                || review.reply_status}
                        </Badge>
                    </div>
                </section>

                {review.status === 'pending' && (
                    <section className="review-moderation__section">
                        <h3>Редакция на модерации</h3>
                        <strong className="review-moderation__rating">
                            Оценка: {review.rating} из 5
                        </strong>
                        <p>{review.text}</p>
                    </section>
                )}

                {review.published_at && (
                    <section className="review-moderation__section">
                        <h3>Опубликованный отзыв</h3>
                        <strong className="review-moderation__rating">
                            Оценка: {review.published_rating} из 5
                        </strong>
                        <p>{review.published_text}</p>
                    </section>
                )}

                {review.reply_status === 'pending' && (
                    <section className="review-moderation__section">
                        <h3>Ответ на модерации</h3>
                        <p>{review.pending_teacher_reply}</p>
                    </section>
                )}

                {review.teacher_reply && (
                    <section className="review-moderation__section">
                        <h3>Опубликованный ответ преподавателя</h3>
                        <p>{review.teacher_reply}</p>
                    </section>
                )}

                {targetOptions.length ? (
                    <section className="review-moderation__form">
                        {targetOptions.length > 1 && (
                            <Select
                                label="Что проверить"
                                value={target}
                                options={targetOptions}
                                onChange={(event) =>
                                    setTarget(event.target.value)
                                }
                            />
                        )}

                        <Input
                            multiline
                            rows={4}
                            label="Комментарий модератора"
                            value={comment}
                            maxLength="3000"
                            helperText="Для отклонения причина обязательна."
                            onChange={(event) =>
                                setComment(event.target.value)
                            }
                        />
                    </section>
                ) : (
                    <p className="review-moderation__muted">
                        В этой записи сейчас нет публикаций,
                        ожидающих модерации.
                    </p>
                )}

                {(validationError || error) && (
                    <div className="admin-alert">
                        {validationError || error}
                    </div>
                )}
            </div>
        </Modal>
    );
}
