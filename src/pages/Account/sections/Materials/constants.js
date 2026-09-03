export const MATERIAL_TABS = [
    {
        id: 'textbook',
        label: 'Учебники',
    },
    {
        id: 'trainer',
        label: 'Тренажёры',
    },
    {
        id: 'extra',
        label: 'Дополнительные материалы',
    },
];

export const ALL_SUBJECTS_ID = 'all';

export const MATERIAL_VIEWS = {
    teacher: [
        { id: 'mine', label: 'Моя библиотека' },
        { id: 'catalog', label: 'Общий каталог' },
    ],
    student: [
        { id: 'assigned', label: 'Назначено мне' },
        { id: 'catalog', label: 'Общий каталог' },
    ],
};

export const PUBLICATION_LABELS = {
    private: 'Личный',
    pending: 'На модерации',
    approved: 'Опубликован',
    rejected: 'Отклонён',
    hidden: 'Скрыт',
};
