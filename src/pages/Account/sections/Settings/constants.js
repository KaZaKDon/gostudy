export const STUDENT_SETTINGS_TABS = [
    { id: 'profile', label: 'Профиль' },
    { id: 'contacts', label: 'Контакты' },
    { id: 'security', label: 'Безопасность' },
    { id: 'notifications', label: 'Уведомления' },
];

export const TEACHER_SETTINGS_TABS = [
    { id: 'profile', label: 'Профиль' },
    { id: 'contacts', label: 'Контакты' },
    { id: 'security', label: 'Безопасность' },
    { id: 'notifications', label: 'Уведомления' },
    { id: 'documents', label: 'Документы' },
    { id: 'publicProfile', label: 'Публичная анкета' },
    { id: 'payouts', label: 'Платёжные данные' },
];

export const VERIFICATION_LABELS = {
    draft: 'Черновик',
    pending: 'Ожидает проверки',
    approved: 'Подтверждена',
    rejected: 'Нужны исправления',
};

export const DOCUMENT_STATUS_LABELS = {
    pending: 'Ожидает проверки',
    approved: 'Подтверждён',
    rejected: 'Отклонён',
};

export const DOCUMENT_TYPE_LABELS = {
    diploma: 'Диплом',
    certificate: 'Сертификат',
    qualification: 'Повышение квалификации',
    other: 'Другой документ',
};
