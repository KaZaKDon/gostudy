import { getProgressLabel } from '../utils.js';

export function TeacherStudentTabContent({
    student,
    activeTab,
}) {
    if (activeTab === 'overview') {
        return (
            <div className="teacher-students__overview">
                <div className="teacher-students__summary-grid">
                    <div className="teacher-students__summary-card">
                        <span>Следующий урок</span>
                        <strong>{student.nextLesson}</strong>
                    </div>

                    <div className="teacher-students__summary-card">
                        <span>Прогресс</span>

                        <strong>
                            {student.progress}%
                        </strong>

                        <small>
                            {getProgressLabel(student.progress)}
                        </small>
                    </div>

                    <div className="teacher-students__summary-card">
                        <span>Баланс</span>

                        <strong>
                            {student.balance}
                        </strong>
                    </div>
                </div>

                <div className="teacher-students__progress">
                    <span
                        style={{
                            width: `${student.progress}%`,
                        }}
                    />
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

                        <ul>
                            {student.notes.map((note) => (
                                <li key={note}>
                                    {note}
                                </li>
                            ))}
                        </ul>
                    </section>
                </div>
            </div>
        );
    }

    if (activeTab === 'lessons') {
        return (
            <div className="teacher-students__timeline">
                {student.lessons.map((lesson) => (
                    <article key={lesson.id}>
                        <span>{lesson.date}</span>

                        <h3>{lesson.topic}</h3>

                        <p>{lesson.result}</p>

                        <small>
                            Домашка: {lesson.homework}
                        </small>
                    </article>
                ))}
            </div>
        );
    }

    if (activeTab === 'homework') {
        return (
            <div className="teacher-students__items">
                {student.homework.map((task) => (
                    <article key={task.id}>
                        <div>
                            <h3>{task.title}</h3>
                            <p>{task.deadline}</p>
                        </div>

                        <span>{task.status}</span>
                    </article>
                ))}
            </div>
        );
    }

    if (activeTab === 'program') {
        return (
            <ol className="teacher-students__program">
                {student.program.map((item) => (
                    <li key={item}>
                        {item}
                    </li>
                ))}
            </ol>
        );
    }

    if (activeTab === 'materials') {
        return (
            <div className="teacher-students__items">
                {student.materials.map((material) => (
                    <article key={material}>
                        <div>
                            <h3>{material}</h3>
                            <p>Учебный материал</p>
                        </div>

                        <button type="button">
                            Открыть
                        </button>
                    </article>
                ))}
            </div>
        );
    }

    if (activeTab === 'payments') {
        return (
            <div className="teacher-students__items">
                {student.payments.map((payment) => (
                    <article key={payment.id}>
                        <div>
                            <h3>{payment.title}</h3>
                            <p>{payment.date}</p>
                        </div>

                        <strong>
                            {payment.amount}
                        </strong>

                        <span>
                            {payment.status}
                        </span>
                    </article>
                ))}
            </div>
        );
    }

    if (activeTab === 'parents') {
        return (
            <div className="teacher-students__parent-card">
                <h3>{student.parent.name}</h3>

                <p>{student.parent.phone}</p>

                <p>{student.parent.email}</p>
            </div>
        );
    }

    if (activeTab === 'feedback') {
        return (
            <div className="teacher-students__feedback">
                {student.feedback.length > 0 ? (
                    student.feedback.map((item) => (
                        <blockquote key={item.id}>
                            <p>{item.text}</p>

                            <cite>
                                {item.author}
                            </cite>
                        </blockquote>
                    ))
                ) : (
                    <p>
                        Отзывов пока нет.
                    </p>
                )}
            </div>
        );
    }

    return null;
}