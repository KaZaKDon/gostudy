import {
    getDefaultLessonDateValue,
    getMinimumLessonDateValue,
} from './lessonForm.js';

export const LESSON_CHANGE_TYPES = {
    reschedule: 'reschedule',
    cancel: 'cancel',
};

export function getLessonChangeTypeLabel(type) {
    return type === LESSON_CHANGE_TYPES.reschedule
        ? 'Перенос урока'
        : 'Отмена урока';
}

export function getLessonChangeDefaultDate(lesson) {
    const currentDate = new Date(
        String(lesson?.lessonDate || '').replace(' ', 'T'),
    );

    if (Number.isNaN(currentDate.getTime())) {
        return getDefaultLessonDateValue();
    }

    currentDate.setHours(currentDate.getHours() + 1);

    if (currentDate <= new Date()) {
        return getDefaultLessonDateValue();
    }

    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const hours = String(currentDate.getHours()).padStart(2, '0');
    const minutes = String(currentDate.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function createLessonChangeForm(lesson, type) {
    return {
        proposedLessonDate:
            type === LESSON_CHANGE_TYPES.reschedule
                ? getLessonChangeDefaultDate(lesson)
                : '',
        comment: '',
        decision: '',
        responseComment: '',
    };
}

export function validateLessonChangeRequest(form, type) {
    if (type === LESSON_CHANGE_TYPES.reschedule) {
        if (!form.proposedLessonDate) {
            return 'Укажите новые дату и время.';
        }

        const proposedDate = new Date(form.proposedLessonDate);

        if (
            Number.isNaN(proposedDate.getTime())
            || proposedDate <= new Date()
        ) {
            return 'Новое время должно быть в будущем.';
        }
    }

    if (!form.comment.trim()) {
        return 'Объясните причину предложения.';
    }

    if (form.comment.trim().length > 2000) {
        return 'Комментарий не должен превышать 2000 символов.';
    }

    return '';
}

export function validateLessonChangeResponse(form) {
    if (!['approve', 'reject'].includes(form.decision)) {
        return 'Выберите решение.';
    }

    if (
        form.decision === 'reject'
        && !form.responseComment.trim()
    ) {
        return 'Объясните причину отказа.';
    }

    if (form.responseComment.trim().length > 2000) {
        return 'Комментарий не должен превышать 2000 символов.';
    }

    return '';
}

export function getMinimumLessonChangeDate() {
    return getMinimumLessonDateValue();
}
