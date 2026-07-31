function padDatePart(value) {
    return String(value).padStart(2, '0');
}

function formatDateTimeLocal(date) {
    return [
        date.getFullYear(),
        '-',
        padDatePart(date.getMonth() + 1),
        '-',
        padDatePart(date.getDate()),
        'T',
        padDatePart(date.getHours()),
        ':',
        padDatePart(date.getMinutes()),
    ].join('');
}

export function getMinimumLessonDateValue(date = new Date()) {
    const minimumDate = new Date(date);

    minimumDate.setMinutes(minimumDate.getMinutes() + 1, 0, 0);

    return formatDateTimeLocal(minimumDate);
}

export function getDefaultLessonDateValue(date = new Date()) {
    const lessonDate = new Date(date);

    lessonDate.setHours(lessonDate.getHours() + 1);
    lessonDate.setSeconds(0, 0);

    const roundedMinutes = Math.ceil(
        lessonDate.getMinutes() / 15,
    ) * 15;

    lessonDate.setMinutes(roundedMinutes);

    return formatDateTimeLocal(lessonDate);
}

export function createLessonFormState() {
    return {
        relationId: '',
        lessonDate: getDefaultLessonDateValue(),
        durationMinutes: '',
        lessonTopic: '',
        lessonNotes: '',
    };
}

export function validateLessonForm(form) {
    if (!Number(form.relationId)) {
        return 'Выберите ученика и предмет.';
    }

    if (!form.lessonDate) {
        return 'Укажите дату и время урока.';
    }

    const lessonDate = new Date(form.lessonDate);

    if (
        Number.isNaN(lessonDate.getTime())
        || lessonDate <= new Date()
    ) {
        return 'Урок можно назначить только на будущее время.';
    }

    if (!Number(form.durationMinutes)) {
        return 'Выберите продолжительность урока.';
    }

    if (!form.lessonTopic.trim()) {
        return 'Укажите тему урока.';
    }

    return '';
}
