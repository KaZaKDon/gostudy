import { useState } from 'react';

import {
    createLessonFormState,
    getMinimumLessonDateValue,
    validateLessonForm,
} from './lessonForm.js';
import { useLessonCreation } from './useLessonCreation.js';

import './CreateLessonModal.css';

function getRelationLabel(relation) {
    return [
        relation.student_name || 'Ученик',
        relation.subject_name || 'Предмет',
    ].join(' · ');
}

export function CreateLessonModal({
    initialRelationId,
    onClose,
    onCreated,
}) {
    const {
        options,
        requestStatus,
        submitStatus,
        errorMessage,
        setErrorMessage,
        createLesson,
    } = useLessonCreation();

    const [form, setForm] = useState(createLessonFormState);
    const minimumLessonDate = getMinimumLessonDateValue();

    const requestedRelationId = Number(initialRelationId);
    const relationId = options.relations.some(
        (relation) =>
            Number(relation.relation_id)
            === Number(form.relationId),
    )
        ? form.relationId
        : String(
            options.relations.find(
                (relation) =>
                    Number(relation.relation_id)
                    === requestedRelationId,
            )?.relation_id
            ?? options.relations[0]?.relation_id
            ?? '',
        );
    const durationMinutes = options.durations.some(
        (duration) =>
            Number(duration.minutes)
            === Number(form.durationMinutes),
    )
        ? form.durationMinutes
        : String(options.durations[0]?.minutes ?? '');

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

        const preparedForm = {
            ...form,
            relationId,
            durationMinutes,
        };
        const validationMessage = validateLessonForm(preparedForm);

        if (validationMessage) {
            setErrorMessage(validationMessage);
            return;
        }

        try {
            const lesson = await createLesson(preparedForm);

            onCreated(lesson);
        } catch {
            // Ошибка уже показана внутри формы.
        }
    };

    const isSubmitting = submitStatus === 'loading';
    const hasRelations = options.relations.length > 0;
    const hasDurations = options.durations.length > 0;

    return (
        <div className="create-lesson-modal">
            <button
                type="button"
                className="create-lesson-modal__overlay"
                aria-label="Закрыть форму назначения урока"
                disabled={isSubmitting}
                onClick={onClose}
            />

            <section
                className="create-lesson-modal__panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-lesson-title"
            >
                <header className="create-lesson-modal__header">
                    <div>
                        <span>Расписание</span>
                        <h2 id="create-lesson-title">
                            Назначить урок
                        </h2>
                        <p>
                            Урок сразу появится у преподавателя
                            и ученика.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="create-lesson-modal__close"
                        aria-label="Закрыть"
                        disabled={isSubmitting}
                        onClick={onClose}
                    >
                        ×
                    </button>
                </header>

                {requestStatus === 'loading' ? (
                    <div className="create-lesson-modal__state">
                        Загружаем данные...
                    </div>
                ) : requestStatus === 'error' ? (
                    <div className="create-lesson-modal__state create-lesson-modal__state--error">
                        {errorMessage}
                    </div>
                ) : !hasRelations ? (
                    <div className="create-lesson-modal__state">
                        <h3>Нет активных учеников</h3>
                        <p>
                            Сначала примите заявку ученика на обучение.
                        </p>
                    </div>
                ) : !hasDurations ? (
                    <div className="create-lesson-modal__state">
                        <h3>Не настроена продолжительность</h3>
                        <p>
                            Укажите стоимость занятия хотя бы для одной
                            продолжительности в анкете преподавателя.
                        </p>
                    </div>
                ) : (
                    <form
                        className="create-lesson-modal__form"
                        onSubmit={handleSubmit}
                    >
                        <div className="create-lesson-modal__fields">
                            <label className="create-lesson-modal__field create-lesson-modal__field--wide">
                                <span>Ученик и предмет</span>
                                <select
                                    name="relationId"
                                    value={relationId}
                                    disabled={isSubmitting}
                                    onChange={handleChange}
                                >
                                    {options.relations.map((relation) => (
                                        <option
                                            key={relation.relation_id}
                                            value={relation.relation_id}
                                        >
                                            {getRelationLabel(relation)}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="create-lesson-modal__field">
                                <span>Дата и время</span>
                                <input
                                    type="datetime-local"
                                    name="lessonDate"
                                    min={minimumLessonDate}
                                    value={form.lessonDate}
                                    disabled={isSubmitting}
                                    onChange={handleChange}
                                />
                                {options.timezone && (
                                    <small>
                                        Часовой пояс: {options.timezone}
                                    </small>
                                )}
                            </label>

                            <label className="create-lesson-modal__field">
                                <span>Продолжительность</span>
                                <select
                                    name="durationMinutes"
                                    value={durationMinutes}
                                    disabled={isSubmitting}
                                    onChange={handleChange}
                                >
                                    {options.durations.map((duration) => (
                                        <option
                                            key={duration.minutes}
                                            value={duration.minutes}
                                        >
                                            {duration.minutes} минут
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="create-lesson-modal__field create-lesson-modal__field--wide">
                                <span>Тема урока</span>
                                <input
                                    type="text"
                                    name="lessonTopic"
                                    maxLength="255"
                                    placeholder="Например: Знакомство и определение уровня"
                                    value={form.lessonTopic}
                                    disabled={isSubmitting}
                                    onChange={handleChange}
                                />
                            </label>

                            <label className="create-lesson-modal__field create-lesson-modal__field--wide">
                                <span>Комментарий</span>
                                <textarea
                                    name="lessonNotes"
                                    rows="4"
                                    maxLength="10000"
                                    placeholder="Что подготовить к уроку — необязательно"
                                    value={form.lessonNotes}
                                    disabled={isSubmitting}
                                    onChange={handleChange}
                                />
                            </label>
                        </div>

                        {errorMessage && (
                            <p className="create-lesson-modal__error">
                                {errorMessage}
                            </p>
                        )}

                        <footer className="create-lesson-modal__actions">
                            <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={onClose}
                            >
                                Отмена
                            </button>

                            <button
                                type="submit"
                                className="create-lesson-modal__submit"
                                disabled={isSubmitting}
                            >
                                {isSubmitting
                                    ? 'Назначаем...'
                                    : 'Назначить урок'}
                            </button>
                        </footer>
                    </form>
                )}
            </section>
        </div>
    );
}
