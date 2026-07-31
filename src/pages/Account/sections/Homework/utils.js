export function getHomeworkByStatus(homework = [], status) {
    return homework.filter((item) => item.display_status === status);
}

export function getHomeworkCount(homework = [], status) {
    return homework.filter((item) => item.display_status === status).length;
}

export function formatHomeworkDate(value, includeTime = true) {
    if (!value) {
        return 'Без срока';
    }

    const date = new Date(String(value).replace(' ', 'T'));

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        ...(includeTime ? {
            hour: '2-digit',
            minute: '2-digit',
        } : {}),
    }).format(date);
}
