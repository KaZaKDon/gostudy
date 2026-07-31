export const studentDemoStats = [{
        label: 'уроков в месяце',
        value: '12'
    },
    {
        label: 'домашних заданий',
        value: '4'
    },
    {
        label: 'средний прогресс',
        value: '78%'
    },
];

export const teacherDemoStats = [{
        label: 'учеников',
        value: '18'
    },
    {
        label: 'уроков сегодня',
        value: '5'
    },
    {
        label: 'средний прогресс',
        value: '82%'
    },
];

export const accountMaterials = {
    textbooks: [{
            id: 'algebra-6-makarychev',
            title: 'Алгебра 6 класс',
            subject: 'Математика',
            author: 'Макарычев',
            items: [{
                    id: 'algebra-6-book',
                    title: 'Учебник',
                    format: 'PDF',
                    access: 'Бесплатно',
                },
                {
                    id: 'algebra-6-workbook',
                    title: 'Рабочая тетрадь',
                    format: 'PDF',
                    access: 'Бесплатно',
                },
                {
                    id: 'algebra-6-teacher-book',
                    title: 'Книга для учителя',
                    format: 'PDF',
                    access: 'Бесплатно',
                },
                {
                    id: 'algebra-6-tests',
                    title: 'Контрольные работы',
                    format: 'PDF',
                    access: 'Бесплатно',
                },
            ],
        },
        {
            id: 'geometry-7-atanasyan',
            title: 'Геометрия 7 класс',
            subject: 'Математика',
            author: 'Атанасян',
            items: [{
                    id: 'geometry-7-book',
                    title: 'Учебник',
                    format: 'PDF',
                    access: 'Бесплатно',
                },
                {
                    id: 'geometry-7-tasks',
                    title: 'Сборник задач',
                    format: 'PDF',
                    access: 'Бесплатно',
                },
            ],
        },
        {
            id: 'english-5-spotlight',
            title: 'Английский 5 класс',
            subject: 'Английский язык',
            author: 'Spotlight',
            items: [{
                    id: 'english-5-book',
                    title: 'Student Book',
                    format: 'PDF',
                    access: 'Бесплатно',
                },
                {
                    id: 'english-5-workbook',
                    title: 'Workbook',
                    format: 'PDF',
                    access: 'Бесплатно',
                },
                {
                    id: 'english-5-audio',
                    title: 'Аудиоприложение',
                    format: 'Ссылка',
                    access: 'Бесплатно',
                },
            ],
        },
    ],

    trainers: [{
            id: 'quadratic-equations',
            title: 'Квадратные уравнения',
            subject: 'Математика',
            author: 'GoStudy',
            description: 'Тренажёр по решению квадратных уравнений через дискриминант.',
            items: [{
                    id: 'quadratic-base',
                    title: 'Базовый уровень',
                    format: '15 заданий',
                    access: 'Бесплатно',
                },
                {
                    id: 'quadratic-exam',
                    title: 'Подготовка к ОГЭ',
                    format: '20 заданий',
                    access: 'Бесплатно',
                },
            ],
        },
        {
            id: 'present-simple',
            title: 'Present Simple',
            subject: 'Английский язык',
            author: 'GoStudy',
            description: 'Тренажёр по построению утвердительных, отрицательных и вопросительных предложений.',
            items: [{
                id: 'present-simple-base',
                title: 'Базовая грамматика',
                format: '12 заданий',
                access: 'Бесплатно',
            }, ],
        },
    ],

    extra: [{
            id: 'oge-equations',
            title: 'ОГЭ. Уравнения',
            subject: 'Математика',
            author: 'Марина Орлова',
            description: 'Авторская подборка заданий по уравнениям для подготовки к ОГЭ.',
            access: 'Платно',
            price: '300 ₽',
            isVisible: true,
            items: [{
                    id: 'oge-equations-method',
                    title: 'Методичка',
                    format: 'PDF',
                    access: 'Платно',
                },
                {
                    id: 'oge-equations-practice',
                    title: 'Практика',
                    format: 'PDF',
                    access: 'Платно',
                },
            ],
        },
        {
            id: 'english-speaking-cards',
            title: 'Разговорные карточки',
            subject: 'Английский язык',
            author: 'Марина Орлова',
            description: 'Карточки для разговорной практики на уроках английского языка.',
            access: 'Бесплатно',
            price: '0 ₽',
            isVisible: true,
            items: [{
                    id: 'speaking-cards-a1',
                    title: 'A1 Beginner',
                    format: 'PDF',
                    access: 'Бесплатно',
                },
                {
                    id: 'speaking-cards-a2',
                    title: 'A2 Elementary',
                    format: 'PDF',
                    access: 'Бесплатно',
                },
            ],
        },
    ],
};

export const teacherPayments = {
    summary: {
        received: 18400,
        pendingConfirmation: 2400,
        awaitingPayout: 6000,
        unpaid: 1200,
    },

    payments: [{
            id: 'payment-1',

            studentName: 'Иванов Иван',
            subject: 'Математика',

            lessonsCount: 4,

            amount: 2400,

            status: 'paid',

            history: [{
                    id: 'history-1',
                    date: '15 сентября',
                    title: 'Урок',
                    amount: 600,
                    status: 'paid',
                },
                {
                    id: 'history-2',
                    date: '22 сентября',
                    title: 'Урок',
                    amount: 600,
                    status: 'paid',
                },
                {
                    id: 'history-3',
                    date: '29 сентября',
                    title: 'Урок',
                    amount: 600,
                    status: 'confirmed',
                },
                {
                    id: 'history-4',
                    date: '6 октября',
                    title: 'Урок',
                    amount: 600,
                    status: 'pending',
                },
            ],
        },

        {
            id: 'payment-2',

            studentName: 'Петров Пётр',
            subject: 'Математика',

            lessonsCount: 1,

            amount: 600,

            status: 'unpaid',

            history: [{
                id: 'history-5',
                date: '18 сентября',
                title: 'Урок',
                amount: 600,
                status: 'unpaid',
            }, ],
        },

        {
            id: 'payment-3',

            studentName: 'Сидоров Сергей',
            subject: 'Подготовка к ОГЭ',

            lessonsCount: 12,

            amount: 8000,

            status: 'paid',

            history: [{
                id: 'history-6',
                date: '1 сентября',
                title: 'Курс',
                amount: 8000,
                status: 'paid',
            }, ],
        },
    ],
};

export const studentPayments = {
    summary: {
        toPay: 1200,
        paid: 18000,
        materials: 2,
    },

    payments: [{
            id: 'student-payment-1',

            title: 'Математика',
            teacher: 'Орлова Марина',

            amount: 600,

            status: 'pending',

            date: '15 сентября',

            type: 'lesson',
        },

        {
            id: 'student-payment-2',

            title: 'Алгебра ОГЭ',
            teacher: 'Методическое пособие',

            amount: 300,

            status: 'pending',

            date: '20 сентября',

            type: 'material',
        },

        {
            id: 'student-payment-3',

            title: 'Английский язык',
            teacher: 'Петрова Елена',

            amount: 5000,

            status: 'paid',

            date: '1 сентября',

            type: 'course',
        },
    ],
};
