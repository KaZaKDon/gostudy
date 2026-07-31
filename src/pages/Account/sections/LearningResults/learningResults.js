const ATTENDANCE_LABELS = {
    present: 'Присутствовал',
    absent: 'Отсутствовал',
    late: 'Опоздал',
};

const GRADE_LABELS = {
    2: '2',
    3: '3',
    4: '4',
    5: '5',
    pass: 'Зачёт',
};

const HOMEWORK_STATUS_LABELS = {
    active: 'Выдано',
    completed: 'Выполнено',
    expired: 'Просрочено',
};

export function formatLearningDate(value) {
    if (!value) {
        return 'Дата не указана';
    }

    const date = new Date(String(value).replace(' ', 'T'));

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

export function getAttendanceLabel(value) {
    return ATTENDANCE_LABELS[value] || 'Не заполнено';
}

export function getGradeLabel(value) {
    return GRADE_LABELS[value] || 'Без оценки';
}

export function getHomeworkStatusLabel(value) {
    return HOMEWORK_STATUS_LABELS[value] || 'Нет задания';
}

export function mapLearningLesson(lesson) {
    return {
        id: Number(lesson.id),
        teacherId: Number(lesson.teacher_id),
        studentId: Number(lesson.student_id),
        subjectId: Number(lesson.subject_id),
        studentName: lesson.student_name || 'Ученик',
        teacherName: lesson.teacher_name || 'Преподаватель',
        subjectName: lesson.subject_name || 'Предмет',
        lessonDate: lesson.lesson_date || null,
        durationMinutes: Number(lesson.duration_minutes) || 0,
        status: lesson.status || '',
        topic: lesson.topic || 'Тема не указана',
        lessonNotes: lesson.lesson_notes || '',
        attendance: lesson.attendance || null,
        grade: lesson.grade || '',
        lessonResult: lesson.lesson_result || '',
        teacherComment: lesson.teacher_comment || '',
        teacherNote: lesson.teacher_note || '',
        publishedAt: lesson.published_at || null,
        isPublished: Boolean(lesson.is_published),
        homeworkCount: Number(lesson.homework_count) || 0,
        latestHomeworkId: lesson.latest_homework_id == null
            ? null
            : Number(lesson.latest_homework_id),
        latestHomeworkTitle: lesson.latest_homework_title || '',
        latestHomeworkStatus: lesson.latest_homework_status || null,
    };
}

export function mergeLearningLessons(current, incoming) {
    const lessons = new Map(
        current.map((lesson) => [lesson.id, lesson]),
    );

    incoming.forEach((lesson) => {
        lessons.set(lesson.id, lesson);
    });

    return [...lessons.values()].sort((left, right) => {
        const dateDifference = String(right.lessonDate).localeCompare(
            String(left.lessonDate),
        );

        return dateDifference || right.id - left.id;
    });
}
