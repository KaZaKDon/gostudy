import { useNavigate } from 'react-router-dom';

export function ClassroomTodaySection({ role, lessons }) {
    const navigate = useNavigate();
    const isTeacher = role === 'teacher';

    return (
        <section className="account-section">
            <header className="account-section__header">
                <div>
                    <h2>Класс</h2>
                    <p>Сегодня у вас {lessons.length} урока</p>
                </div>
            </header>

            <div className="account-table-wrap">
                <table className="account-table">
                    <thead>
                        <tr>
                            <th>Время</th>
                            <th>{isTeacher ? 'Ученик' : 'Преподаватель'}</th>
                            <th>Предмет</th>
                            <th>Тема</th>
                            <th>Статус</th>
                            <th>Действие</th>
                        </tr>
                    </thead>

                    <tbody>
                        {lessons.map((lesson) => (
                            <tr key={lesson.id}>
                                <td data-label="Время">{lesson.time}</td>

                                <td data-label={isTeacher ? 'Ученик' : 'Преподаватель'}>
                                    {isTeacher ? lesson.student : lesson.teacher}
                                </td>

                                <td data-label="Предмет">{lesson.subject}</td>
                                <td data-label="Тема">{lesson.topic}</td>

                                <td data-label="Статус">
                                    <span className="account-table__status">
                                        {lesson.status}
                                    </span>
                                </td>

                                <td data-label="Действие">
                                    <button
                                        type="button"
                                        className="account-table__action"
                                        onClick={() =>
                                            navigate(`/classroom/${lesson.id}`, {
                                                state: {
                                                    role,
                                                    lesson,
                                                },
                                            })
                                        }
                                    >
                                        Войти в класс
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}