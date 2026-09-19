import { TeacherBadgeList } from '../FindTeacher/components/TeacherBadgeList.jsx';

import './TeacherRatingDashboard.css';

function RankValue({ rank, total }) {
    if (!rank) return <strong>—</strong>;

    return (
        <strong>
            № {rank}
            {total > 0 && <small> из {total}</small>}
        </strong>
    );
}

export function TeacherRatingDashboard({ controller }) {
    const {
        summary,
        status,
        errorMessage,
        refresh,
    } = controller;

    if (status === 'loading' || status === 'idle') {
        return (
            <section className="teacher-rating teacher-rating--state">
                <span>Мой рейтинг</span>
                <p>Загружаем место и награды...</p>
            </section>
        );
    }

    if (status === 'error' || !summary) {
        return (
            <section className="teacher-rating teacher-rating--state">
                <span>Мой рейтинг</span>
                <p className="teacher-rating__error">
                    {errorMessage || 'Не удалось загрузить рейтинг'}
                </p>
                <button type="button" onClick={refresh}>Повторить</button>
            </section>
        );
    }

    return (
        <section className="teacher-rating">
            <header className="teacher-rating__header">
                <div>
                    <span>Мой рейтинг</span>
                    <h2>Позиция и достижения</h2>
                </div>

                {!summary.ranking_available && (
                    <p className="teacher-rating__notice">
                        {summary.ranking_unavailable_reason}
                    </p>
                )}
            </header>

            <div className="teacher-rating__summary">
                <article>
                    <span>Общее место</span>
                    <RankValue
                        rank={summary.overall_rank}
                        total={summary.teachers_count}
                    />
                </article>

                <article>
                    <span>Оценка</span>
                    <strong>
                        {summary.average_rating === null
                            ? '—'
                            : `★ ${Number(summary.average_rating).toFixed(1)}`}
                    </strong>
                    <small>
                        {summary.reviews_count > 0
                            ? `${summary.reviews_count} отзывов`
                            : 'Пока нет отзывов'}
                    </small>
                </article>

                <article>
                    <span>Проведено</span>
                    <strong>{summary.completed_lessons_count}</strong>
                    <small>уроков на GoStudy</small>
                </article>
            </div>

            <div className="teacher-rating__grid">
                <article className="teacher-rating__card">
                    <h3>Место по предметам</h3>

                    {summary.subject_ranks.length > 0 ? (
                        <ul className="teacher-rating__subjects">
                            {summary.subject_ranks.map((subject) => (
                                <li key={subject.subject_id}>
                                    <span>{subject.subject_name}</span>
                                    <RankValue
                                        rank={subject.rank}
                                        total={subject.teachers_count}
                                    />
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="teacher-rating__empty">
                            Добавьте предметы в анкету преподавателя.
                        </p>
                    )}
                </article>

                <article className="teacher-rating__card">
                    <h3>До следующей награды</h3>

                    {summary.next_achievements.length > 0 ? (
                        <div className="teacher-rating__progress-list">
                            {summary.next_achievements.map((achievement) => {
                                const progress = Math.min(
                                    100,
                                    (achievement.current / achievement.target) * 100,
                                );

                                return (
                                    <div key={achievement.key}>
                                        <span>
                                            <b>{achievement.title}</b>
                                            <small>
                                                Ещё {achievement.remaining} до {achievement.target}
                                            </small>
                                        </span>
                                        <div
                                            className="teacher-rating__progress"
                                            role="progressbar"
                                            aria-valuemin="0"
                                            aria-valuemax={achievement.target}
                                            aria-valuenow={achievement.current}
                                            aria-label={achievement.title}
                                        >
                                            <i style={{ width: `${progress}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="teacher-rating__empty">
                            Все основные ступени уже достигнуты.
                        </p>
                    )}
                </article>
            </div>

            <article className="teacher-rating__card teacher-rating__awards">
                <div>
                    <h3>Полученные награды</h3>
                    <p>Наведите или нажмите на значок, чтобы увидеть описание.</p>
                </div>

                {summary.badges.length > 0 ? (
                    <TeacherBadgeList badgeKeys={summary.badges} />
                ) : (
                    <p className="teacher-rating__empty">
                        Награды появятся по мере развития профиля.
                    </p>
                )}
            </article>
        </section>
    );
}
