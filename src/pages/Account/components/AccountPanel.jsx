import { ClassroomTodaySection } from '../sections/ClassroomTodaySection.jsx';

export function AccountPanel({
    title,
    stats,
    role,
    activeSection,
    todayLessons,
}) {
    return (
        <section className="account-panel">
            <header className="account-panel__header">
                <div>
                    <span className="account-panel__eyebrow">
                        Личный кабинет
                    </span>

                    <h1>{title}</h1>
                </div>

                <span className="account-panel__role">
                    {role === 'teacher' ? 'Преподаватель' : 'Ученик'}
                </span>
            </header>

            <div className="account-panel__stats">
                {stats.map((item) => (
                    <article key={item.label} className="account-stat">
                        <strong>{item.value}</strong>
                        <span>{item.label}</span>
                    </article>
                ))}
            </div>

            {activeSection === 'classroom' ? (
                <ClassroomTodaySection
                    role={role}
                    lessons={todayLessons}
                />
            ) : (
                <div className="account-panel__placeholder">
                    <h2>{title}</h2>
                    <p>
                        Раздел находится в разработке. Здесь будут отображаться
                        реальные данные пользователя.
                    </p>
                </div>
            )}
        </section>
    );
}