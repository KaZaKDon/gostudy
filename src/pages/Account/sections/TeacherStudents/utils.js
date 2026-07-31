export function getProgressLabel(progress) {
    if (!Number.isFinite(progress)) return 'Нет данных';
    if (progress >= 80) return 'Хорошая динамика';
    if (progress >= 60) return 'Есть прогресс';

    return 'Нужно внимание';
}

function formatDateTime(value) {
    if (!value) return 'Не назначен';

    const date = new Date(String(value).replace(' ', 'T'));

    if (Number.isNaN(date.getTime())) {
        return 'Не назначен';
    }

    return new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

function createStudentBase(student) {
    return {
        studentId: Number(student.student_id),
        name: student.student_name || 'Ученик',
        grade: student.class_level || 'Класс не указан',
        subject: student.subject_name || 'Предмет не указан',
        subjectId: Number(student.subject_id),
        progress: null,
        balance: 'Нет данных',
        parent: {
            name: student.parent_name || 'Не указано',
            phone: student.parent_phone || 'Не указано',
            email: student.parent_email || 'Не указано',
        },
        summary: {
            goal:
                student.learning_goals ||
                student.goal ||
                'Цель не указана',
            format: student.lesson_format || 'Не указан',
            level: student.level_description || 'Не указан',
            startedAt: 'Не указано',
        },
        lessons: [],
        homework: [],
        program: [],
        materials: [],
        payments: [],
        notes: student.schedule_comment
            ? [student.schedule_comment]
            : [],
        feedback: [],
    };
}

export function mapTeacherStudent(student, status) {
    const isRequest = status === 'requests';
    const base = createStudentBase(student);

    return {
        ...base,
        id: isRequest
            ? `request-${student.id}`
            : `relation-${student.id}`,
        requestId: isRequest ? Number(student.id) : null,
        relationId: isRequest ? null : Number(student.id),
        status,
        nextLesson: isRequest
            ? 'Не назначен'
            : formatDateTime(student.next_lesson_at),
        requestMessage: student.message || '',
        summary: {
            ...base.summary,
            startedAt: isRequest
                ? formatDateTime(student.created_at)
                : formatDateTime(student.started_at),
        },
    };
}

export function getStudentInitials(name) {
    return name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2);
}

export function getFilteredStudents(students, searchValue) {
    const normalizedSearch = searchValue.trim().toLowerCase();

    if (!normalizedSearch) return students;

    return students.filter((student) => {
        const searchText = [
            student.name,
            student.grade,
            student.subject,
            student.status,
        ]
            .join(' ')
            .toLowerCase();

        return searchText.includes(normalizedSearch);
    });
}
