import { API } from '../../../../../api/api.js';
import {
    downloadAuthFile,
    formatFileSize,
} from '../../../../../api/upload.js';

const LESSON_STATUS_LABELS = {
    scheduled: 'Запланирован',
    rescheduled: 'Перенесён',
    completed: 'Завершён',
    cancelled: 'Отменён',
};

const HOMEWORK_STATUS_LABELS = {
    progress: 'В работе',
    review: 'На проверке',
    late: 'Просрочено',
    completed: 'Принято',
    cancelled: 'Отменено',
};

function formatDateTime(value, fallback = 'Не назначен') {
    if (!value) {
        return fallback;
    }

    const date = new Date(String(value).replace(' ', 'T'));

    if (Number.isNaN(date.getTime())) {
        return fallback;
    }

    return new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

function TeacherStudentTabState({
    status,
    errorMessage,
    onRetry,
}) {
    if (status === 'loading' || status === 'idle') {
        return (
            <p className="teacher-students__tab-state">
                Загружаем данные...
            </p>
        );
    }

    if (status === 'error') {
        return (
            <div className="teacher-students__tab-state">
                <p>{errorMessage}</p>
                <button type="button" onClick={onRetry}>
                    Повторить
                </button>
            </div>
        );
    }

    return null;
}

function EmptyTab({ children }) {
    return (
        <p className="teacher-students__tab-state">
            {children}
        </p>
    );
}

function OverviewTab({ student, data }) {
    const notes = Array.isArray(data.notes) ? data.notes : [];

    return (
        <div className="teacher-students__overview">
            <div className="teacher-students__summary-grid">
                <div className="teacher-students__summary-card">
                    <span>Следующий урок</span>
                    <strong>
                        {formatDateTime(data.next_lesson_at)}
                    </strong>
                </div>

                <div className="teacher-students__summary-card">
                    <span>Занятия</span>
                    <strong>{data.lessons_completed || 0}</strong>
                    <small>
                        Завершено из {data.lessons_total || 0}
                    </small>
                </div>

                <div className="teacher-students__summary-card">
                    <span>Домашние работы</span>
                    <strong>{data.homework_completed || 0}</strong>
                    <small>
                        Выполнено из {data.homework_total || 0}
                    </small>
                </div>
            </div>

            <div className="teacher-students__overview-grid">
                <section>
                    <h3>Цель обучения</h3>
                    <p>{student.summary.goal}</p>
                </section>

                <section>
                    <h3>Формат</h3>
                    <p>{student.summary.format}</p>
                </section>

                <section>
                    <h3>Старт</h3>
                    <p>{student.summary.startedAt}</p>
                </section>

                <section>
                    <h3>Уровень</h3>
                    <p>{student.summary.level}</p>
                </section>

                <section className="teacher-students__wide">
                    <h3>Заметки преподавателя</h3>

                    {notes.length > 0 ? (
                        <ul>
                            {notes.map((note, index) => (
                                <li key={`${note.lesson_date}:${index}`}>
                                    {note.text}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>Заметок пока нет.</p>
                    )}
                </section>
            </div>
        </div>
    );
}

function LessonsTab({ data }) {
    const lessons = Array.isArray(data.items) ? data.items : [];

    if (!lessons.length) {
        return <EmptyTab>Занятий с учеником пока нет.</EmptyTab>;
    }

    return (
        <div className="teacher-students__timeline">
            {lessons.map((lesson) => (
                <article key={lesson.id}>
                    <div className="teacher-students__row-heading">
                        <span>{formatDateTime(lesson.lesson_date)}</span>
                        <em>
                            {LESSON_STATUS_LABELS[lesson.status]
                                || lesson.status}
                        </em>
                    </div>

                    <h3>{lesson.topic}</h3>

                    {lesson.result && <p>{lesson.result}</p>}

                    <small>
                        {lesson.grade
                            ? `Оценка: ${lesson.grade}`
                            : 'Без оценки'}
                        {' · '}
                        {lesson.duration_minutes} минут
                    </small>

                    {lesson.homework_title && (
                        <small>
                            Домашняя работа: {lesson.homework_title}
                        </small>
                    )}
                </article>
            ))}
        </div>
    );
}

function HomeworkTab({ data }) {
    const homework = Array.isArray(data.items) ? data.items : [];

    if (!homework.length) {
        return <EmptyTab>Домашних заданий пока нет.</EmptyTab>;
    }

    return (
        <div className="teacher-students__items">
            {homework.map((task) => (
                <article key={task.id}>
                    <div>
                        <h3>{task.title}</h3>
                        <p>
                            {task.due_date
                                ? `Сдать до ${formatDateTime(task.due_date)}`
                                : 'Без срока сдачи'}
                        </p>
                    </div>

                    <span>
                        {HOMEWORK_STATUS_LABELS[task.display_status]
                            || task.display_status}
                    </span>
                </article>
            ))}
        </div>
    );
}

function ProgramTab({ data }) {
    const items = Array.isArray(data.items) ? data.items : [];

    if (!items.length) {
        return (
            <div className="teacher-students__tab-state">
                <p>{data.empty_message}</p>
                {data.learning_goals && (
                    <small>
                        Цель обучения: {data.learning_goals}
                    </small>
                )}
            </div>
        );
    }

    return (
        <ol className="teacher-students__program">
            {items.map((item) => (
                <li key={item.id}>{item.title}</li>
            ))}
        </ol>
    );
}

function MaterialsTab({ data }) {
    const materials = Array.isArray(data.items) ? data.items : [];

    if (!materials.length) {
        return (
            <EmptyTab>
                Материалы для этого ученика пока не загружались.
            </EmptyTab>
        );
    }

    const downloadMaterial = (material) => {
        const url = material.source_type === 'homework'
            ? `${API.downloadHomeworkFile}?type=assignment&id=${material.file_id}`
            : `${API.classroomDownloadFile}?file_id=${material.file_id}`;

        return downloadAuthFile(url, material.original_name);
    };

    return (
        <div className="teacher-students__items">
            {materials.map((material) => (
                <article key={material.id}>
                    <div>
                        <h3>{material.original_name}</h3>
                        <p>
                            {material.source_title}
                            {' · '}
                            {formatFileSize(material.file_size)}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => downloadMaterial(material)}
                    >
                        Скачать
                    </button>
                </article>
            ))}
        </div>
    );
}

function PaymentsTab({ data }) {
    const payments = Array.isArray(data.items) ? data.items : [];

    if (!payments.length) {
        return <EmptyTab>{data.empty_message}</EmptyTab>;
    }

    return (
        <div className="teacher-students__items">
            {payments.map((payment) => (
                <article key={payment.id}>
                    <div>
                        <h3>{payment.title}</h3>
                        <p>{formatDateTime(payment.date)}</p>
                    </div>
                    <strong>{payment.amount}</strong>
                    <span>{payment.status}</span>
                </article>
            ))}
        </div>
    );
}

function ParentsTab({ data }) {
    const hasContacts = data.name || data.phone || data.email;

    if (!hasContacts) {
        return (
            <EmptyTab>
                Родительские контакты в анкете ученика не указаны.
            </EmptyTab>
        );
    }

    return (
        <div className="teacher-students__parent-card">
            <h3>{data.name || 'Родитель'}</h3>
            <p>{data.phone || 'Телефон не указан'}</p>
            <p>{data.email || 'Email не указан'}</p>
        </div>
    );
}

function FeedbackTab({ data }) {
    const reviews = Array.isArray(data.items) ? data.items : [];

    if (!reviews.length) {
        return <EmptyTab>Опубликованных отзывов пока нет.</EmptyTab>;
    }

    return (
        <div className="teacher-students__feedback">
            {reviews.map((review) => (
                <blockquote key={review.id}>
                    <div className="teacher-students__review-meta">
                        <strong aria-label={`Оценка ${review.rating} из 5`}>
                            {'★'.repeat(review.rating)}
                            {'☆'.repeat(5 - review.rating)}
                        </strong>
                        <time dateTime={review.published_at}>
                            {formatDateTime(review.published_at)}
                        </time>
                    </div>

                    <p>{review.text}</p>
                    <cite>{review.student_name}</cite>

                    {review.teacher_reply && (
                        <div className="teacher-students__reply">
                            <strong>Ответ преподавателя</strong>
                            <p>{review.teacher_reply}</p>
                        </div>
                    )}
                </blockquote>
            ))}
        </div>
    );
}

export function TeacherStudentTabContent({
    student,
    activeTab,
    data,
    status,
    errorMessage,
    onRetry,
}) {
    const state = TeacherStudentTabState({
        status,
        errorMessage,
        onRetry,
    });

    if (state || !data) {
        return state;
    }

    if (activeTab === 'overview') {
        return <OverviewTab student={student} data={data} />;
    }

    if (activeTab === 'lessons') {
        return <LessonsTab data={data} />;
    }

    if (activeTab === 'homework') {
        return <HomeworkTab data={data} />;
    }

    if (activeTab === 'program') {
        return <ProgramTab data={data} />;
    }

    if (activeTab === 'materials') {
        return <MaterialsTab data={data} />;
    }

    if (activeTab === 'payments') {
        return <PaymentsTab data={data} />;
    }

    if (activeTab === 'parents') {
        return <ParentsTab data={data} />;
    }

    if (activeTab === 'feedback') {
        return <FeedbackTab data={data} />;
    }

    return null;
}
