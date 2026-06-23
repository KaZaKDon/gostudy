export const STUDENT_SETTINGS_TABS = [{
        id: 'profile',
        label: 'Профиль'
    },
    {
        id: 'contacts',
        label: 'Контакты'
    },
    {
        id: 'security',
        label: 'Безопасность'
    },
    {
        id: 'notifications',
        label: 'Уведомления'
    },
];

export const TEACHER_SETTINGS_TABS = [{
        id: 'profile',
        label: 'Профиль'
    },
    {
        id: 'contacts',
        label: 'Контакты'
    },
    {
        id: 'security',
        label: 'Безопасность'
    },
    {
        id: 'notifications',
        label: 'Уведомления'
    },
    {
        id: 'documents',
        label: 'Документы'
    },
    {
        id: 'payouts',
        label: 'Платёжные данные'
    },
    {
        id: 'publicProfile',
        label: 'Публичная анкета'
    },
];

export const SETTINGS_CONTENT = {
    profile: {
        title: 'Профиль',
        fields: [{
                label: 'Фамилия',
                value: 'Иванов'
            },
            {
                label: 'Имя',
                value: 'Иван'
            },
            {
                label: 'Отчество',
                value: 'Сергеевич'
            },
            {
                label: 'Дата рождения',
                value: '12.04.2010'
            },
            {
                label: 'Часовой пояс',
                value: 'Москва UTC+3'
            },
        ],
    },

    contacts: {
        title: 'Контакты',
        fields: [{
                label: 'Телефон',
                value: '+7 900 000-00-00'
            },
            {
                label: 'Email',
                value: 'user@gostudy.ru'
            },
            {
                label: 'Мессенджер',
                value: 'Telegram'
            },
        ],
    },

    security: {
        title: 'Безопасность',
        fields: [{
                label: 'Пароль',
                value: '********'
            },
            {
                label: 'Активные устройства',
                value: '1 устройство'
            },
        ],
    },

    notifications: {
        title: 'Уведомления',
        fields: [{
                label: 'Уроки',
                value: 'Включены'
            },
            {
                label: 'Домашние задания',
                value: 'Включены'
            },
            {
                label: 'Сообщения',
                value: 'Включены'
            },
            {
                label: 'Email',
                value: 'Включен'
            },
        ],
    },

    documents: {
        title: 'Документы',
        type: 'documents',

        diploma: {
            fileName: null,
        },

        certificates: [{
                id: 1,
                name: 'Сертификат Cambridge.pdf',
            },
            {
                id: 2,
                name: 'Сертификат Фоксфорд.pdf',
            },
        ],

        verificationStatus: 'Ожидает проверки',
    },

    payouts: {
        title: 'Платёжные данные',
        type: 'payouts',

        payoutMethod: 'Банковская карта',

        methods: [
            'Банковская карта',
            'Расчётный счёт',
            'Самозанятый',
        ],

        verificationStatus: 'Не подтверждено',

        lastPayout: {
            date: '15 сентября',
            amount: '8 000 ₽',
        },

        payoutsHistory: [{
                id: 1,
                date: '15 сентября',
                amount: '8 000 ₽',
                status: 'Выплачено',
            },
            {
                id: 2,
                date: '1 сентября',
                amount: '6 400 ₽',
                status: 'Выплачено',
            },
        ],
    },

    publicProfile: {
        title: 'Публичная анкета',
        fields: [{
                label: 'Профиль показывается',
                value: 'Да'
            },
            {
                label: 'Предметы',
                value: 'Математика'
            },
            {
                label: 'Опыт',
                value: '8 лет'
            },
            {
                label: 'О себе',
                value: 'Краткое описание преподавателя'
            },
        ],
    },
};