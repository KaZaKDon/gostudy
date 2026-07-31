import { useState } from 'react';

import {
    formatLearningDate,
    getHomeworkStatusLabel,
} from '../../LearningResults/learningResults.js';

export function JournalLessonModal({
    lesson,
    isSaving,
    errorMessage,
    onSave,
    onClose,
}) {
    const [form, setForm] = useState(() => ({
        attendance: lesson?.attendance || 'present',
        grade: lesson?.grade || '',
        lesson_result: lesson?.lessonResult || '',
        teacher_comment: lesson?.teacherComment || '',
        teacher_note: lesson?.teacherNote || '',
    }));

    if (!lesson) {
        return null;
    }

    const updateField = (field, value) => {
        setForm((current) => ({
            ...current,
            [field]: value,
            ...(field === 'attendance' && value === 'absent'
                ? { grade: '' }
                : {}),
        }));
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        onSave(lesson.id, form);
    };

    return (
        <div className="journal-modal">
            <button
                type="button"
                className="journal-modal__overlay"
                aria-label="Закрыть запись журнала"
                onClick={onClose}
            />

            <form
                className="journal-modal__panel"
                role="dialog"
                aria-modal="true"
                onSubmit={handleSubmit}
            >
                <header className="journal-modal__header">
                    <div>
                        <span>
                            {lesson.isPublished
                                ? 'Редактирование записи'
                                : 'Новая запись журнала'}
                        </span>
                        <h2>{lesson.topic}</h2>
                    </div>
                    <button
                        type="button"
                        className="journal-modal__close"
                        aria-label="Закрыть"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </header>

                <div className="journal-modal__meta">
                    <span>{formatLearningDate(lesson.lessonDate)}</span>
                    <span>{lesson.studentName}</span>
                    <span>{lesson.subjectName}</span>
                    <span>
                        {lesson.homeworkCount > 0
                            ? `${lesson.homeworkCount} · ${getHomeworkStatusLabel(
                                lesson.latestHomeworkStatus,
                            )}`
                            : 'Домашнее задание не выдавалось'}
                    </span>
                </div>

                <div className="journal-modal__form">
                    <div className="journal-modal__fields-row">
                        <label>
                            <span>Посещение</span>
                            <select
                                value={form.attendance}
                                onChange={(event) => updateField(
                                    'attendance',
                                    event.target.value,
                                )}
                            >
                                <option value="present">Присутствовал</option>
                                <option value="late">Опоздал</option>
                                <option value="absent">Отсутствовал</option>
                            </select>
                        </label>

                        <label>
                            <span>Оценка</span>
                            <select
                                value={form.grade}
                                disabled={form.attendance === 'absent'}
                                onChange={(event) => updateField(
                                    'grade',
                                    event.target.value,
                                )}
                            >
                                <option value="">Без оценки</option>
                                <option value="5">5</option>
                                <option value="4">4</option>
                                <option value="3">3</option>
                                <option value="2">2</option>
                                <option value="pass">Зачёт</option>
                            </select>
                        </label>
                    </div>

                    <label>
                        <span>
                            Результат занятия
                            {form.attendance !== 'absent' ? ' *' : ''}
                        </span>
                        <textarea
                            rows="4"
                            maxLength="5000"
                            required={form.attendance !== 'absent'}
                            value={form.lesson_result}
                            placeholder="Что изучили и какого результата достиг ученик"
                            onChange={(event) => updateField(
                                'lesson_result',
                                event.target.value,
                            )}
                        />
                    </label>

                    <label>
                        <span>Комментарий ученику</span>
                        <textarea
                            rows="3"
                            maxLength="5000"
                            value={form.teacher_comment}
                            placeholder="Рекомендации, сильные стороны и то, над чем поработать"
                            onChange={(event) => updateField(
                                'teacher_comment',
                                event.target.value,
                            )}
                        />
                    </label>

                    <label>
                        <span>Личная заметка преподавателя</span>
                        <textarea
                            rows="3"
                            maxLength="5000"
                            value={form.teacher_note}
                            placeholder="Эту заметку ученик не увидит"
                            onChange={(event) => updateField(
                                'teacher_note',
                                event.target.value,
                            )}
                        />
                        <small>Видна только преподавателю.</small>
                    </label>

                    {errorMessage && (
                        <p className="journal-modal__error" role="alert">
                            {errorMessage}
                        </p>
                    )}
                </div>

                <footer className="journal-modal__actions">
                    <button type="button" onClick={onClose}>
                        Отмена
                    </button>
                    <button
                        type="submit"
                        className="journal-modal__save"
                        disabled={isSaving}
                    >
                        {isSaving
                            ? 'Сохраняем...'
                            : lesson.isPublished
                                ? 'Сохранить изменения'
                                : 'Опубликовать результат'}
                    </button>
                </footer>
            </form>
        </div>
    );
}
