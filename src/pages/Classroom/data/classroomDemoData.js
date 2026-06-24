export const classroomFallbackLesson = {
    id: 'demo-lesson',
    time: '09:00',
    subject: 'Математика',
    topic: 'Квадратные уравнения',
    status: 'Сегодня',
    student: 'Артём Казаков',
    teacher: 'Иван Петров',
};

export const classroomMessages = [
    {
        id: 1,
        author: 'Преподаватель',
        text: 'Доброе утро. Сегодня разбираем квадратные уравнения.',
        time: '09:01',
        isOwn: false,
    },
    {
        id: 2,
        author: 'Ученик',
        text: 'Здравствуйте, я готов.',
        time: '09:02',
        isOwn: true,
    },
    {
        id: 3,
        author: 'Преподаватель',
        text: 'Открой материал с примерами, начнём с дискриминанта.',
        time: '09:04',
        isOwn: false,
    },
];

export const classroomMaterials = [
    {
        id: 1,
        title: 'Квадратные уравнения — теория',
        type: 'PDF',
    },
    {
        id: 2,
        title: 'Примеры для разбора на уроке',
        type: 'DOCX',
    },
    {
        id: 3,
        title: 'Домашняя тренировка',
        type: 'Задание',
    },
];

export const classroomHomework = {
    title: 'Домашнее задание после урока',
    description: 'Решить задачи № 5–15 по теме квадратных уравнений. Особое внимание уделить вычислению дискриминанта.',
    deadline: 'до 27 июня',
};