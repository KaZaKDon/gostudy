export const teacherDemoProfile = {
    firstName: 'Валентина',
    lastName: 'Иванова',
    roleTitle: 'Преподаватель английского языка',
};

export const studentDemoProfile = {
    firstName: 'Иван',
    lastName: 'Петров',
    roleTitle: 'Ученик',
};

export const teacherDemoStats = [
    { label: 'Уроков сегодня', value: 3 },
    { label: 'Домашних на проверку', value: 2 },
    { label: 'Сообщений', value: 1 },
    { label: 'Ожидают оплаты', value: 2 },
];

export const studentDemoStats = [
    { label: 'Уроков сегодня', value: 1 },
    { label: 'Домашних заданий', value: 3 },
    { label: 'Сообщений', value: 1 },
    { label: 'Материалов', value: 5 },
];

export const teacherTodayLessons = [
    {
        id: 1,
        time: '10:00',
        student: 'Анна Смирнова',
        subject: 'Английский язык',
        topic: 'Present Simple',
        status: 'Через 15 минут',
    },
    {
        id: 2,
        time: '12:30',
        student: 'Максим Петров',
        subject: 'Английский язык',
        topic: 'Past Simple',
        status: 'Сегодня',
    },
    {
        id: 3,
        time: '18:00',
        student: 'Ольга Иванова',
        subject: 'Английский язык',
        topic: 'Разговорная практика',
        status: 'Сегодня',
    },
];

export const studentTodayLessons = [
    {
        id: 1,
        time: '18:00',
        teacher: 'Валентина Иванова',
        subject: 'Английский язык',
        topic: 'Present Simple',
        status: 'Сегодня',
    },
    {
        id: 2,
        time: '20:00',
        teacher: 'Сергей Петров',
        subject: 'Математика',
        topic: 'Квадратные уравнения',
        status: 'Сегодня',
    },
];