export const teacherStatusLabels = {
    active: 'Активен',
    blocked: 'Заблокирован',
    archived: 'Архив',
    deleted: 'Удалён',
};

export const teacherStatusVariants = {
    active: 'success',
    blocked: 'danger',
    archived: 'info',
    deleted: 'info',
};

export const verificationLabels = {
    pending: 'На проверке',
    verified: 'Подтверждён',
    rejected: 'На доработку',
};

export const verificationVariants = {
    pending: 'warning',
    verified: 'success',
    rejected: 'danger',
};

export function formatAdminDate(value) {
    return value ? new Date(value).toLocaleString('ru-RU') : '—';
}

export function renderAdminValue(value) {
    return value === null || value === undefined || value === ''
        ? '—'
        : value;
}

export function formatAdminPrice(value) {
    if (value === null || value === undefined || value === '') {
        return '—';
    }

    return `${Number(value).toLocaleString('ru-RU')} ₽`;
}
