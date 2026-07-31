export const LESSON_STATUS_LABELS = {
    scheduled: 'Запланирован',
    active: 'Идёт сейчас',
    completed: 'Завершён',
    cancelled: 'Отменён',
    rescheduled: 'Перенесён',
};

const DAY_NAMES = [
    'Воскресенье',
    'Понедельник',
    'Вторник',
    'Среда',
    'Четверг',
    'Пятница',
    'Суббота',
];

export function getStartOfWeek(date = new Date()) {
    const result = new Date(date);
    const day = result.getDay();
    const diff = day === 0 ? -6 : 1 - day;

    result.setDate(result.getDate() + diff);
    result.setHours(0, 0, 0, 0);

    return result;
}

export function getLocalDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

export function getCurrentWeekRange(date = new Date()) {
    const from = getStartOfWeek(date);
    const to = new Date(from);

    to.setDate(from.getDate() + 6);

    return {
        from: getLocalDateKey(from),
        to: getLocalDateKey(to),
    };
}

export function shiftScheduleWeek(date, direction) {
    const shiftedDate = new Date(date);

    shiftedDate.setDate(
        shiftedDate.getDate() + (direction * 7),
    );

    return shiftedDate;
}

export function getScheduleWeekLabel(date = new Date()) {
    const from = getStartOfWeek(date);
    const to = new Date(from);

    to.setDate(from.getDate() + 6);

    const formatter = new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'long',
    });

    return `${formatter.format(from)} — ${formatter.format(to)}`;
}

export function isCurrentScheduleWeek(date) {
    return getLocalDateKey(getStartOfWeek(date))
        === getLocalDateKey(getStartOfWeek());
}

export function parseLessonDate(dateValue) {
    if (!dateValue) {
        return null;
    }

    const date = new Date(String(dateValue).replace(' ', 'T'));

    return Number.isNaN(date.getTime())
        ? null
        : date;
}

export function formatLessonTime(dateValue) {
    const date = parseLessonDate(dateValue);

    if (!date) {
        return '';
    }

    return new Intl.DateTimeFormat('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

export function formatLessonDateTime(dateValue) {
    const date = parseLessonDate(dateValue);

    if (!date) {
        return '';
    }

    return new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

export function getLessonCountLabel(count) {
    if (count === 0) {
        return 'Выходной';
    }

    if (count === 1) {
        return '1 урок';
    }

    if (count >= 2 && count <= 4) {
        return `${count} урока`;
    }

    return `${count} уроков`;
}

export function normalizeScheduleLesson(lesson) {
    const durationMinutes = Number(lesson?.duration_minutes || 0);
    const status = String(lesson?.status || 'scheduled');
    const classroomStatus = lesson?.classroom_status || null;
    const viewerNow = parseLessonDate(lesson?._viewer_now);
    const viewerClockOffsetMilliseconds = viewerNow
        && Number(lesson?._received_at)
        ? viewerNow.getTime() - Number(lesson._received_at)
        : 0;
    const rawChangeRequest = lesson?.change_request;
    const normalizeChange = (change) => change
        ? {
            id: Number(change.id),
            lessonId: Number(change.lesson_id),
            requestedBy: Number(change.requested_by),
            requestedRole: change.requested_role,
            requesterName:
                change.requester_name
                || 'Участник урока',
            type: change.request_type,
            status: change.status,
            originalLessonDate:
                change.original_lesson_date || null,
            proposedLessonDate:
                change.proposed_lesson_date || null,
            proposedDateTimeLabel: formatLessonDateTime(
                change.proposed_lesson_date,
            ),
            comment: change.request_comment || '',
            responseComment:
                change.response_comment || '',
            canRespond: Boolean(change.can_respond),
            canWithdraw: Boolean(change.can_withdraw),
        }
        : null;
    const changeRequest = normalizeChange(rawChangeRequest);
    const lastChange = normalizeChange(lesson?.last_change);

    return {
        id: lesson?.id,
        time: formatLessonTime(lesson?.lesson_date),
        teacher: lesson?.teacher_name || 'Преподаватель',
        teacherName: lesson?.teacher_name || 'Преподаватель',
        student: lesson?.student_name || 'Ученик',
        studentName: lesson?.student_name || 'Ученик',
        subject:
            lesson?.subject_name ||
            lesson?.title ||
            'Предмет не указан',
        topic:
            lesson?.lesson_topic ||
            lesson?.title ||
            'Тема не указана',
        durationMinutes,
        duration: durationMinutes > 0
            ? `${durationMinutes} минут`
            : 'Не указано',
        status,
        statusLabel:
            classroomStatus === 'active'
                ? 'Идёт сейчас'
                : classroomStatus === 'ended'
                    ? 'Завершён'
                    : LESSON_STATUS_LABELS[status] ||
                        status ||
                        'Не указан',
        classroomStatus,
        classroomStartedAt: lesson?.classroom_started_at || null,
        classroomEndedAt: lesson?.classroom_ended_at || null,
        viewerClockOffsetMilliseconds,
        lessonDate: lesson?.lesson_date || null,
        dateTimeLabel: formatLessonDateTime(lesson?.lesson_date),
        changeRequest,
        lastChange,
        rawData: lesson,
    };
}

export function createScheduleWeek(
    schedule,
    displayedDate = new Date(),
) {
    const startOfWeek = getStartOfWeek(displayedDate);
    const normalizedLessons = (Array.isArray(schedule) ? schedule : [])
        .map(normalizeScheduleLesson);

    return Array.from({ length: 7 }, (_, index) => {
        const currentDate = new Date(startOfWeek);

        currentDate.setDate(startOfWeek.getDate() + index);

        const dateKey = getLocalDateKey(currentDate);

        const lessons = normalizedLessons.filter((lesson) =>
            String(lesson.lessonDate || '').startsWith(dateKey),
        );

        return {
            id: dateKey,
            dayName: DAY_NAMES[currentDate.getDay()],
            date: new Intl.DateTimeFormat('ru-RU', {
                day: 'numeric',
                month: 'long',
            }).format(currentDate),
            startTime: lessons[0]?.time || null,
            lessons,
        };
    });
}

export function getTodayLessons(schedule, date = new Date()) {
    const viewerNow = parseLessonDate(
        Array.isArray(schedule) ? schedule[0]?._viewer_now : null,
    );
    const todayKey = getLocalDateKey(viewerNow || date);

    return (Array.isArray(schedule) ? schedule : [])
        .filter((lesson) =>
            String(lesson?.lesson_date || '').startsWith(todayKey),
        )
        .map(normalizeScheduleLesson);
}

export function canEnterLesson(lesson, currentTime = new Date()) {
    if (!lesson) {
        return false;
    }

    if (lesson.classroomStatus === 'active') {
        return true;
    }

    if (
        lesson.classroomStatus === 'ended'
        || !['scheduled', 'rescheduled'].includes(lesson.status)
    ) {
        return false;
    }

    const lessonDate = parseLessonDate(lesson.lessonDate);

    if (!lessonDate) {
        return false;
    }

    const viewerCurrentTime = new Date(
        currentTime.getTime()
        + Number(lesson.viewerClockOffsetMilliseconds || 0),
    );
    const availableAt = new Date(
        lessonDate.getTime() - (15 * 60 * 1000),
    );
    const deadlineAt = new Date(
        lessonDate.getTime()
        + ((lesson.durationMinutes + 30) * 60 * 1000),
    );

    return viewerCurrentTime >= availableAt && viewerCurrentTime <= deadlineAt;
}

export function canRequestLessonChange(lesson) {
    if (!lesson || lesson.changeRequest) {
        return false;
    }

    if (['active', 'ended'].includes(lesson.classroomStatus)) {
        return false;
    }

    if (!['scheduled', 'rescheduled'].includes(lesson.status)) {
        return false;
    }

    const lessonDate = parseLessonDate(lesson.lessonDate);
    const viewerCurrentTime = new Date(
        Date.now()
        + Number(lesson.viewerClockOffsetMilliseconds || 0),
    );

    return Boolean(lessonDate && lessonDate > viewerCurrentTime);
}

export function getClassButtonLabel(
    lesson,
    role,
    currentTime = new Date(),
) {
    if (lesson.classroomStatus === 'active') {
        return 'Вернуться в класс';
    }

    if (lesson.classroomStatus === 'ended' || lesson.status === 'completed') {
        return 'Урок завершён';
    }

    if (lesson.status === 'cancelled') {
        return 'Урок отменён';
    }

    if (!canEnterLesson(lesson, currentTime)) {
        const lessonDate = parseLessonDate(lesson.lessonDate);
        const viewerCurrentTime = new Date(
            currentTime.getTime()
            + Number(lesson.viewerClockOffsetMilliseconds || 0),
        );

        if (lessonDate && viewerCurrentTime < lessonDate) {
            return 'Доступ за 15 минут';
        }

        return 'Время входа прошло';
    }

    return role === 'teacher'
        ? 'В класс'
        : 'Войти в класс';
}
