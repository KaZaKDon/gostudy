import { useState } from 'react';

import {
    createLessonChangeForm,
    getLessonChangeTypeLabel,
    getMinimumLessonChangeDate,
    validateLessonChangeRequest,
    validateLessonChangeResponse,
} from './lessonChange.js';
import { useLessonChanges } from './useLessonChanges.js';

import './LessonChangeModal.css';

function LessonSummary({ lesson }) {
    return (
        <div className="lesson-change-modal__summary">
            <strong>{lesson.subject}</strong>
            <span>{lesson.personName}</span>
            <span>{lesson.dateTimeLabel}</span>
            <span>{lesson.duration}</span>
        </div>
    );
}

function PendingRequestDetails({ request }) {
    return (
        <div className="lesson-change-modal__request">
            <p>
                <strong>{request.requesterName}</strong>
                {' предлагает: '}
                {getLessonChangeTypeLabel(request.type).toLowerCase()}
            </p>

            {request.proposedDateTimeLabel && (
                <p>
                    <span>Новое время:</span>
                    {' '}
                    <strong>{request.proposedDateTimeLabel}</strong>
                </p>
            )}

            <p>
                <span>Причина:</span>
                {' '}
                {request.comment}
            </p>
        </div>
    );
}

export function LessonChangeModal({
    lesson,
    action,
    onClose,
    onCompleted,
}) {
    const request = lesson.changeRequest;
    const type = action === 'reschedule' ? 'reschedule' : 'cancel';

    const [form, setForm] = useState(
        () => createLessonChangeForm(lesson, type),
    );

    const {
        submitStatus,
        errorMessage,
        setErrorMessage,
        requestChange,
        respondChange,
        withdrawChange,
    } = useLessonChanges();

    const isSubmitting = submitStatus === 'loading';
    const isReview = action === 'review';
    const isWithdraw = action === 'withdraw';

    const title = isReview
        ? 'Ответить на предложение'
        : isWithdraw
            ? 'Отозвать предложение'
            : getLessonChangeTypeLabel(type);

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((currentForm) => ({
            ...currentForm,
            [name]: value,
        }));
        setErrorMessage('');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        let validationMessage = '';

        if (isReview) {
            validationMessage = validateLessonChangeResponse(form);
        } else if (!isWithdraw) {
            validationMessage = validateLessonChangeRequest(form, type);
        }

        if (validationMessage) {
            setErrorMessage(validationMessage);
            return;
        }

        try {
            let result;

            if (isReview) {
                result = await respondChange(request.id, form);
            } else if (isWithdraw) {
                result = await withdrawChange(request.id);
            } else {
                result = await requestChange(lesson.id, type, form);
            }

            onCompleted(result.message);
        } catch {
            // Сообщение уже показано в окне.
        }
    };

    return (
        <div className="lesson-change-modal">
            <button
                type="button"
                className="lesson-change-modal__overlay"
                aria-label="Закрыть окно"
                disabled={isSubmitting}
                onClick={onClose}
            />

            <section
                className="lesson-change-modal__panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="lesson-change-title"
            >
                <header className="lesson-change-modal__header">
                    <div>
                        <span>Расписание</span>
                        <h2 id="lesson-change-title">{title}</h2>
                        <p>
                            Изменение вступит в силу только после
                            согласия второй стороны.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="lesson-change-modal__close"
                        aria-label="Закрыть"
                        disabled={isSubmitting}
                        onClick={onClose}
                    >
                        ×
                    </button>
                </header>

                <form
                    className="lesson-change-modal__form"
                    onSubmit={handleSubmit}
                >
                    <LessonSummary lesson={lesson} />

                    {(isReview || isWithdraw) && request && (
                        <PendingRequestDetails request={request} />
                    )}

                    {!isReview && !isWithdraw && (
                        <div className="lesson-change-modal__fields">
                            {type === 'reschedule' && (
                                <label className="lesson-change-modal__field">
                                    <span>Новые дата и время</span>
                                    <input
                                        type="datetime-local"
                                        name="proposedLessonDate"
                                        min={getMinimumLessonChangeDate()}
                                        value={form.proposedLessonDate}
                                        disabled={isSubmitting}
                                        onChange={handleChange}
                                    />
                                </label>
                            )}

                            <label className="lesson-change-modal__field">
                                <span>Почему вы предлагаете это изменение?</span>
                                <textarea
                                    name="comment"
                                    rows="4"
                                    maxLength="2000"
                                    placeholder="Комментарий увидит второй участник урока"
                                    value={form.comment}
                                    disabled={isSubmitting}
                                    onChange={handleChange}
                                />
                            </label>
                        </div>
                    )}

                    {isReview && (
                        <div className="lesson-change-modal__fields">
                            <fieldset className="lesson-change-modal__decision">
                                <legend>Ваше решение</legend>

                                <label>
                                    <input
                                        type="radio"
                                        name="decision"
                                        value="approve"
                                        checked={form.decision === 'approve'}
                                        disabled={isSubmitting}
                                        onChange={handleChange}
                                    />
                                    <span>Согласиться</span>
                                </label>

                                <label>
                                    <input
                                        type="radio"
                                        name="decision"
                                        value="reject"
                                        checked={form.decision === 'reject'}
                                        disabled={isSubmitting}
                                        onChange={handleChange}
                                    />
                                    <span>Отклонить</span>
                                </label>
                            </fieldset>

                            <label className="lesson-change-modal__field">
                                <span>
                                    {form.decision === 'reject'
                                        ? 'Причина отказа'
                                        : 'Ответный комментарий — необязательно'}
                                </span>
                                <textarea
                                    name="responseComment"
                                    rows="3"
                                    maxLength="2000"
                                    value={form.responseComment}
                                    disabled={isSubmitting}
                                    onChange={handleChange}
                                />
                            </label>
                        </div>
                    )}

                    {isWithdraw && (
                        <p className="lesson-change-modal__confirmation">
                            После отзыва урок останется без изменений.
                            При необходимости можно будет отправить новое
                            предложение.
                        </p>
                    )}

                    {errorMessage && (
                        <p className="lesson-change-modal__error">
                            {errorMessage}
                        </p>
                    )}

                    <footer className="lesson-change-modal__actions">
                        <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={onClose}
                        >
                            Назад
                        </button>

                        <button
                            type="submit"
                            className={
                                isWithdraw
                                    ? 'lesson-change-modal__submit lesson-change-modal__submit--danger'
                                    : 'lesson-change-modal__submit'
                            }
                            disabled={isSubmitting}
                        >
                            {isSubmitting
                                ? 'Сохраняем...'
                                : isReview
                                    ? 'Отправить ответ'
                                    : isWithdraw
                                        ? 'Отозвать'
                                        : 'Отправить предложение'}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    );
}
