export const studentDemoProfile = {
    firstName: 'Артём',
    lastName: 'Казаков',
    roleTitle: 'Ученик · 8 класс',
};

export const teacherDemoProfile = {
    firstName: 'Марина',
    lastName: 'Орлова',
    roleTitle: 'Преподаватель математики',
};

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

export const studentTodayLessons = [{
        id: 1,
        time: '10:00',
        subject: 'Математика',
        teacher: 'Марина Орлова',
        topic: 'Квадратные уравнения',
        status: 'Сегодня',
    },
    {
        id: 2,
        time: '17:30',
        subject: 'Английский язык',
        teacher: 'Илья Смирнов',
        topic: 'Past Simple / Past Continuous',
        status: 'Сегодня',
    },
];

export const teacherTodayLessons = [{
        id: 1,
        time: '09:00',
        subject: 'Математика',
        student: 'Артём Казаков',
        topic: 'Квадратные уравнения',
        status: 'Сегодня',
    },
    {
        id: 2,
        time: '11:00',
        subject: 'Математика',
        student: 'София Лебедева',
        topic: 'Подготовка к контрольной',
        status: 'Сегодня',
    },
    {
        id: 3,
        time: '15:30',
        subject: 'Математика',
        student: 'Марк Волков',
        topic: 'Проценты и пропорции',
        status: 'Сегодня',
    },
];

export const teacherStudents = [{
        id: 1,
        name: 'Артём Казаков',
        grade: '8 класс',
        subject: 'Математика',
        status: 'active',
        nextLesson: 'Сегодня, 09:00',
        progress: 78,
        balance: '4 занятия оплачены',
        parent: {
            name: 'Елена Казакова',
            phone: '+7 900 000-00-00',
            email: 'parent@example.com',
        },
        summary: {
            goal: 'Подтянуть алгебру и подготовиться к итоговой контрольной.',
            format: '2 занятия в неделю по 60 минут',
            startedAt: '12 марта 2026',
            level: 'Средний',
        },
        lessons: [{
                id: 1,
                date: '20 июня',
                topic: 'Квадратные уравнения',
                result: 'Разобрали дискриминант и типовые ошибки.',
                homework: 'Решить № 214, 215, 217',
            },
            {
                id: 2,
                date: '17 июня',
                topic: 'Формулы сокращённого умножения',
                result: 'Ученик уверенно применяет формулы в простых примерах.',
                homework: 'Повторить преобразование выражений',
            },
        ],
        homework: [{
                id: 1,
                title: 'Квадратные уравнения',
                deadline: 'до 23 июня',
                status: 'В работе',
            },
            {
                id: 2,
                title: 'Формулы сокращённого умножения',
                deadline: 'сдано 18 июня',
                status: 'Проверено',
            },
        ],
        program: [
            'Линейные уравнения',
            'Формулы сокращённого умножения',
            'Квадратные уравнения',
            'Текстовые задачи',
        ],
        materials: [
            'Конспект: квадратные уравнения.pdf',
            'Тренажёр: дискриминант',
            'Разбор ошибок контрольной',
        ],
        payments: [{
                id: 1,
                date: '15 июня',
                title: 'Пакет из 4 занятий',
                amount: '4 800 ₽',
                status: 'Оплачено',
            },
            {
                id: 2,
                date: '01 июня',
                title: 'Пробное занятие',
                amount: '0 ₽',
                status: 'Проведено',
            },
        ],
        notes: [
            'Лучше воспринимает материал через пошаговые схемы.',
            'Нужно больше самостоятельной практики после урока.',
        ],
        feedback: [{
            id: 1,
            author: 'Елена Казакова',
            text: 'Артём стал увереннее решать задачи и меньше боится контрольных.',
        }, ],
    },
    {
        id: 2,
        name: 'София Лебедева',
        grade: '7 класс',
        subject: 'Математика',
        status: 'active',
        nextLesson: 'Сегодня, 11:00',
        progress: 84,
        balance: '2 занятия оплачены',
        parent: {
            name: 'Ольга Лебедева',
            phone: '+7 900 111-00-00',
            email: 'sofia-parent@example.com',
        },
        summary: {
            goal: 'Закрепить школьную программу и повысить оценку за четверть.',
            format: '1 занятие в неделю по 60 минут',
            startedAt: '2 апреля 2026',
            level: 'Выше среднего',
        },
        lessons: [{
            id: 1,
            date: '19 июня',
            topic: 'Подготовка к контрольной',
            result: 'Повторили дроби, пропорции и задачи на проценты.',
            homework: 'Карточка № 6',
        }, ],
        homework: [{
            id: 1,
            title: 'Карточка № 6',
            deadline: 'до 24 июня',
            status: 'Назначено',
        }, ],
        program: [
            'Дроби',
            'Пропорции',
            'Проценты',
            'Контрольные работы',
        ],
        materials: [
            'Таблица перевода дробей',
            'Практика: проценты',
        ],
        payments: [{
            id: 1,
            date: '10 июня',
            title: 'Пакет из 4 занятий',
            amount: '4 800 ₽',
            status: 'Оплачено',
        }, ],
        notes: [
            'Хорошо работает в спокойном темпе.',
        ],
        feedback: [],
    },
    {
        id: 3,
        name: 'Марк Волков',
        grade: '6 класс',
        subject: 'Математика',
        status: 'archive',
        nextLesson: '25 июня, 15:30',
        progress: 61,
        balance: 'нужна оплата',
        parent: {
            name: 'Анна Волкова',
            phone: '+7 900 222-00-00',
            email: 'mark-parent@example.com',
        },
        summary: {
            goal: 'Закрыть пробелы по задачам на проценты и пропорции.',
            format: '2 занятия в неделю по 45 минут',
            startedAt: '18 мая 2026',
            level: 'Базовый',
        },
        lessons: [{
            id: 1,
            date: '14 июня',
            topic: 'Проценты и пропорции',
            result: 'Появилось понимание базовых пропорций.',
            homework: 'Решить 10 задач из карточки',
        }, ],
        homework: [{
            id: 1,
            title: 'Карточка: проценты',
            deadline: 'просрочено',
            status: 'Не сдано',
        }, ],
        program: [
            'Пропорции',
            'Проценты',
            'Текстовые задачи',
        ],
        materials: [
            'Памятка: как решать задачи на проценты',
        ],
        payments: [{
            id: 1,
            date: '28 мая',
            title: 'Разовое занятие',
            amount: '1 200 ₽',
            status: 'Оплачено',
        }, ],
        notes: [
            'Нужно чаще возвращаться к простым примерам.',
            'После паузы начать с повторения.',
        ],
        feedback: [],
    },
    {
        id: 4,
        name: 'Даниил Фёдоров',
        grade: '9 класс',
        subject: 'Математика',
        status: 'requests',
        nextLesson: 'Не назначен',
        progress: 0,
        balance: 'оплата не начата',
        parent: {
            name: 'Ирина Фёдорова',
            phone: '+7 900 333-00-00',
            email: 'fedorov-parent@example.com',
        },
        summary: {
            goal: 'Подготовка к ОГЭ по математике.',
            format: 'Планирует 2 занятия в неделю по 90 минут',
            startedAt: 'Заявка от 23 июня 2026',
            level: 'Нужно определить',
        },
        lessons: [],
        homework: [],
        program: [
            'Диагностика уровня',
            'План подготовки к ОГЭ',
        ],
        materials: [],
        payments: [],
        notes: [
            'Заявка от ученика. Нужно обсудить расписание и формат занятий.',
        ],
        feedback: [],
    },
];

export const teacherScheduleWeek = [{
        id: 'monday',
        dayName: 'Понедельник',
        date: '15 сентября',
        startTime: '10:00',
        lessons: [{
                id: 1,
                time: '10:00',
                studentName: 'Иванов',
                subject: 'Математика',
                topic: 'Квадратные уравнения',
                duration: '45 минут',
            },
            {
                id: 2,
                time: '12:00',
                studentName: 'Петров',
                subject: 'Математика',
                topic: 'Формулы сокращённого умножения',
                duration: '60 минут',
            },
            {
                id: 3,
                time: '16:00',
                studentName: 'Сидоров',
                subject: 'Математика',
                topic: 'Подготовка к экзамену',
                duration: '90 минут',
            },
        ],
    },
    {
        id: 'tuesday',
        dayName: 'Вторник',
        date: '16 сентября',
        startTime: '12:00',
        lessons: [{
                id: 4,
                time: '12:00',
                studentName: 'София Лебедева',
                subject: 'Математика',
                topic: 'Проценты',
                duration: '45 минут',
            },
            {
                id: 5,
                time: '15:00',
                studentName: 'Марк Волков',
                subject: 'Математика',
                topic: 'Пропорции',
                duration: '60 минут',
            },
        ],
    },
    {
        id: 'wednesday',
        dayName: 'Среда',
        date: '17 сентября',
        startTime: '09:00',
        lessons: [{
                id: 6,
                time: '09:00',
                studentName: 'Анна Смирнова',
                subject: 'Математика',
                topic: 'Текстовые задачи',
                duration: '45 минут',
            },
            {
                id: 7,
                time: '10:30',
                studentName: 'Илья Морозов',
                subject: 'Математика',
                topic: 'Дроби',
                duration: '45 минут',
            },
            {
                id: 8,
                time: '12:00',
                studentName: 'Кирилл Орлов',
                subject: 'Математика',
                topic: 'Геометрия',
                duration: '60 минут',
            },
            {
                id: 9,
                time: '15:00',
                studentName: 'Ева Кузнецова',
                subject: 'Математика',
                topic: 'Контрольная работа',
                duration: '60 минут',
            },
            {
                id: 10,
                time: '18:00',
                studentName: 'Даниил Фёдоров',
                subject: 'Математика',
                topic: 'ОГЭ',
                duration: '90 минут',
            },
        ],
    },
    {
        id: 'thursday',
        dayName: 'Четверг',
        date: '18 сентября',
        startTime: '11:00',
        lessons: [{
                id: 11,
                time: '11:00',
                studentName: 'Артём Казаков',
                subject: 'Математика',
                topic: 'Алгебра',
                duration: '45 минут',
            },
            {
                id: 12,
                time: '13:00',
                studentName: 'Полина Соколова',
                subject: 'Математика',
                topic: 'Уравнения',
                duration: '60 минут',
            },
            {
                id: 13,
                time: '16:00',
                studentName: 'Роман Павлов',
                subject: 'Математика',
                topic: 'ЕГЭ профиль',
                duration: '90 минут',
            },
            {
                id: 14,
                time: '18:00',
                studentName: 'Никита Беляев',
                subject: 'Математика',
                topic: 'Повторение',
                duration: '45 минут',
            },
        ],
    },
    {
        id: 'friday',
        dayName: 'Пятница',
        date: '19 сентября',
        startTime: '10:00',
        lessons: [{
                id: 15,
                time: '10:00',
                studentName: 'Ольга Романова',
                subject: 'Математика',
                topic: 'Графики функций',
                duration: '60 минут',
            },
            {
                id: 16,
                time: '13:00',
                studentName: 'Михаил Егоров',
                subject: 'Математика',
                topic: 'Системы уравнений',
                duration: '45 минут',
            },
            {
                id: 17,
                time: '17:00',
                studentName: 'Дарья Миронова',
                subject: 'Математика',
                topic: 'Подготовка к ОГЭ',
                duration: '90 минут',
            },
        ],
    },
    {
        id: 'saturday',
        dayName: 'Суббота',
        date: '20 сентября',
        startTime: '13:00',
        lessons: [{
            id: 18,
            time: '13:00',
            studentName: 'Сергей Захаров',
            subject: 'Математика',
            topic: 'Индивидуальный план',
            duration: '60 минут',
        }, ],
    },
    {
        id: 'sunday',
        dayName: 'Воскресенье',
        date: '21 сентября',
        startTime: null,
        lessons: [],
    },
];

export const studentScheduleWeek = [{
        id: 'monday',
        dayName: 'Понедельник',
        date: '15 сентября',
        startTime: '10:00',
        lessons: [{
            id: 1,
            time: '10:00',
            teacherName: 'Марина Орлова',
            subject: 'Математика',
            topic: 'Квадратные уравнения',
            duration: '45 минут',
        }, ],
    },
    {
        id: 'tuesday',
        dayName: 'Вторник',
        date: '16 сентября',
        startTime: null,
        lessons: [],
    },
    {
        id: 'wednesday',
        dayName: 'Среда',
        date: '17 сентября',
        startTime: '18:00',
        lessons: [{
            id: 2,
            time: '18:00',
            teacherName: 'Марина Орлова',
            subject: 'Математика',
            topic: 'Формулы сокращённого умножения',
            duration: '60 минут',
        }, ],
    },
    {
        id: 'thursday',
        dayName: 'Четверг',
        date: '18 сентября',
        startTime: null,
        lessons: [],
    },
    {
        id: 'friday',
        dayName: 'Пятница',
        date: '19 сентября',
        startTime: '17:00',
        lessons: [{
            id: 3,
            time: '17:00',
            teacherName: 'Марина Орлова',
            subject: 'Математика',
            topic: 'Подготовка к контрольной',
            duration: '45 минут',
        }, ],
    },
    {
        id: 'saturday',
        dayName: 'Суббота',
        date: '20 сентября',
        startTime: null,
        lessons: [],
    },
    {
        id: 'sunday',
        dayName: 'Воскресенье',
        date: '21 сентября',
        startTime: null,
        lessons: [],
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

export const teacherHomework = [{
        id: 'hw-1',
        status: 'review',

        studentName: 'Иванов Иван',

        subject: 'Математика',

        title: 'Квадратные уравнения',

        assignedAt: '12 сентября',
        deadline: '15 сентября',

        taskText: 'Решить задания №214, №215, №217.',

        answerText: 'Все задания выполнены. Решение приложено.',

        materials: [
            'Алгебра 8 класс',
            'Тренажёр: дискриминант',
        ],

        attachments: [
            'solution-1.jpg',
            'solution-2.jpg',
        ],
    },

    {
        id: 'hw-2',
        status: 'review',

        studentName: 'Петров Пётр',

        subject: 'Английский язык',

        title: 'Present Simple',

        assignedAt: '13 сентября',
        deadline: '15 сентября',

        taskText: 'Составить 15 предложений в Present Simple.',

        answerText: 'Предложения выполнены в документе.',

        materials: [
            'Present Simple',
        ],

        attachments: [
            'answer.docx',
        ],
    },

    {
        id: 'hw-3',
        status: 'late',

        studentName: 'Сидоров Сергей',

        subject: 'Математика',

        title: 'Проценты',

        assignedAt: '10 сентября',
        deadline: '14 сентября',

        taskText: 'Решить задачи по процентам.',

        answerText: '',

        materials: [
            'Проценты. Базовый курс',
        ],

        attachments: [],
    },
];

export const teacherJournal = [{
        id: 'ivanov',
        studentName: 'Иванов Иван',
        grade: '8 класс',
        subject: 'Математика',
        lessons: [{
                id: 'lesson-1',
                date: '15 сентября',
                topic: 'Квадратные уравнения',
                textbookSection: 'Алгебра 8 класс · §12',
                lessonPlan: 'Повторить формулу дискриминанта, разобрать типовые ошибки, решить 5 задач.',
                hasHomework: true,
                homeworkTitle: '№214, №215, №217',
                grade: '5',
                studentComment: 'Хорошо разобрался с дискриминантом. Нужно внимательнее записывать ответ.',
                teacherNote: 'На следующем уроке дать больше задач с отрицательным дискриминантом.',
            },
            {
                id: 'lesson-2',
                date: '22 сентября',
                topic: 'Теорема Виета',
                textbookSection: 'Алгебра 8 класс · §13',
                lessonPlan: 'Показать связь коэффициентов и корней. Решить примеры на подбор корней.',
                hasHomework: true,
                homeworkTitle: 'Карточка по теореме Виета',
                grade: '4',
                studentComment: 'Тему понял, но пока ошибается в знаках.',
                teacherNote: 'Повторить знаки коэффициентов перед задачами ОГЭ.',
            },
            {
                id: 'lesson-3',
                date: '29 сентября',
                topic: 'Графики функций',
                textbookSection: 'Алгебра 8 класс · §16',
                lessonPlan: 'Разобрать построение графика линейной функции и чтение графиков.',
                hasHomework: false,
                homeworkTitle: '',
                grade: 'Зачёт',
                studentComment: 'Уверенно читает простые графики.',
                teacherNote: 'Можно переходить к квадратичной функции.',
            },
        ],
    },
    {
        id: 'petrov',
        studentName: 'Петров Пётр',
        grade: '7 класс',
        subject: 'Математика',
        lessons: [{
            id: 'lesson-4',
            date: '16 сентября',
            topic: 'Проценты',
            textbookSection: 'Математика 7 класс · §8',
            lessonPlan: 'Разобрать нахождение процента от числа и числа по проценту.',
            hasHomework: true,
            homeworkTitle: '10 задач на проценты',
            grade: '3',
            studentComment: 'Тема даётся тяжело, нужно больше практики.',
            teacherNote: 'Вернуться к базовым задачам и дать визуальные схемы.',
        }, ],
    },
    {
        id: 'sidorov',
        studentName: 'Сидоров Сергей',
        grade: '9 класс',
        subject: 'Математика',
        lessons: [{
            id: 'lesson-5',
            date: '18 сентября',
            topic: 'Подготовка к ОГЭ',
            textbookSection: 'ОГЭ · Задания 1–5',
            lessonPlan: 'Разобрать первые пять заданий варианта, отработать оформление.',
            hasHomework: true,
            homeworkTitle: 'Вариант ОГЭ №3',
            grade: 'Зачёт',
            studentComment: 'Хорошо справляется с первой частью.',
            teacherNote: 'Добавить задачи на вероятность и геометрию.',
        }, ],
    },
];

export const studentDiary = [{
        id: 'math',

        subject: 'Математика',

        averageGrade: '4.7',

        lessons: [{
                id: 'math-1',

                date: '15 сентября',

                topic: 'Квадратные уравнения',

                textbookSection: 'Алгебра 8 класс · §12',

                lessonPlan: 'Повторили дискриминант и решили типовые задачи.',

                homeworkTitle: '№214, №215, №217',

                grade: '5',

                teacherComment: 'Отлично разобрался с темой.',
            },

            {
                id: 'math-2',

                date: '22 сентября',

                topic: 'Теорема Виета',

                textbookSection: 'Алгебра 8 класс · §13',

                lessonPlan: 'Разобрали связь корней и коэффициентов.',

                homeworkTitle: 'Карточка по теореме Виета',

                grade: '4',

                teacherComment: 'Нужно внимательнее работать со знаками.',
            },
        ],
    },

    {
        id: 'english',

        subject: 'Английский язык',

        averageGrade: '5.0',

        lessons: [{
            id: 'eng-1',

            date: '16 сентября',

            topic: 'Present Simple',

            textbookSection: 'Grammar Unit 3',

            lessonPlan: 'Утвердительные и отрицательные предложения.',

            homeworkTitle: '15 предложений в Present Simple',

            grade: '5',

            teacherComment: 'Работа выполнена без ошибок.',
        }, ],
    },
];

export const teacherMessages = {
    students: [{
            id: 'student-ivanov',
            name: 'Иванов Иван',
            subtitle: '8 класс · Математика',
            lastMessage: 'Хорошо, домашку отправлю сегодня.',
            time: '12:45',
            unreadCount: 2,
            messages: [{
                    id: 'msg-1',
                    authorType: 'teacher',
                    authorName: 'Марина Орлова',
                    text: 'Иван, сегодня повторим квадратные уравнения.',
                    time: '12:20',
                },
                {
                    id: 'msg-2',
                    authorType: 'student',
                    authorName: 'Иванов Иван',
                    text: 'Хорошо, домашку отправлю сегодня.',
                    time: '12:45',
                },
            ],
        },
        {
            id: 'student-petrov',
            name: 'Петров Пётр',
            subtitle: '7 класс · Математика',
            lastMessage: 'Спасибо за объяснение.',
            time: 'Вчера',
            unreadCount: 0,
            messages: [{
                    id: 'msg-3',
                    authorType: 'teacher',
                    authorName: 'Марина Орлова',
                    text: 'Пётр, посмотри ещё раз задачи на проценты.',
                    time: '18:10',
                },
                {
                    id: 'msg-4',
                    authorType: 'student',
                    authorName: 'Петров Пётр',
                    text: 'Спасибо за объяснение.',
                    time: '18:25',
                },
            ],
        },
    ],

    parents: [{
        id: 'parent-ivanova',
        name: 'Иванова Мария',
        subtitle: 'Родитель · Иванов Иван',
        lastMessage: 'Подскажите, как идёт подготовка?',
        time: '10:15',
        unreadCount: 1,
        messages: [{
                id: 'msg-5',
                authorType: 'parent',
                authorName: 'Иванова Мария',
                text: 'Подскажите, как идёт подготовка?',
                time: '10:15',
            },
            {
                id: 'msg-6',
                authorType: 'teacher',
                authorName: 'Марина Орлова',
                text: 'Иван стал увереннее решать уравнения, но нужно больше практики.',
                time: '10:20',
            },
        ],
    }, ],
};

export const studentMessages = {
    student: [{
        id: 'teacher-orlova-student',
        name: 'Орлова Марина',
        subtitle: 'Преподаватель · Математика',
        lastMessage: 'Завтра повторим теорему Виета.',
        time: '13:10',
        unreadCount: 1,
        messages: [{
                id: 'msg-7',
                authorType: 'teacher',
                authorName: 'Орлова Марина',
                text: 'Завтра повторим теорему Виета.',
                time: '13:10',
            },
            {
                id: 'msg-8',
                authorType: 'student',
                authorName: 'Иванов Иван',
                text: 'Хорошо, я подготовлю вопросы.',
                time: '13:15',
            },
        ],
    }, ],

    parent: [{
        id: 'teacher-orlova-parent',
        name: 'Орлова Марина',
        subtitle: 'Переписка родителя с преподавателем',
        lastMessage: 'Спасибо, будем контролировать домашку.',
        time: '11:30',
        unreadCount: 0,
        messages: [{
                id: 'msg-9',
                authorType: 'teacher',
                authorName: 'Орлова Марина',
                text: 'Ивану нужно повторить формулы перед следующим уроком.',
                time: '11:10',
            },
            {
                id: 'msg-10',
                authorType: 'parent',
                authorName: 'Иванова Мария',
                text: 'Спасибо, будем контролировать домашку.',
                time: '11:30',
            },
        ],
    }, ],
};

export const teacherReviews = [{
        id: 'review-1',
        authorName: 'Иванов Иван',
        subject: 'Математика',
        date: '15 сентября',
        rating: 5,
        text: 'Очень понятно объясняет материал. После занятий стало легче решать уравнения.',
        teacherReply: '',
    },
    {
        id: 'review-2',
        authorName: 'Петров Пётр',
        subject: 'Математика',
        date: '10 сентября',
        rating: 4,
        text: 'Хорошие занятия, стало понятнее с процентами. Хотелось бы больше практики.',
        teacherReply: 'Спасибо за отзыв. Добавлю больше практических заданий.',
    },
];

export const studentReviews = [{
        id: 'teacher-orlova',
        status: 'active',
        teacherName: 'Орлова Марина',
        subject: 'Математика',
        rating: 5,
        reviewText: 'Очень понятно объясняет материал.',
    },
    {
        id: 'teacher-smirnov',
        status: 'requests',
        requestStatus: 'Ожидает ответа преподавателя',
        teacherName: 'Смирнов Андрей',
        subject: 'Физика',
        rating: null,
        reviewText: '',
    },
    {
        id: 'teacher-petrova',
        status: 'archive',
        archiveText: 'Обучение завершено 15 декабря',
        teacherName: 'Петрова Елена',
        subject: 'Английский язык',
        rating: null,
        reviewText: '',
    },
];

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