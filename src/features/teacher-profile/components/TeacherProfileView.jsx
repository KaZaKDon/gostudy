function getFullName(profile) {
    const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();

    return fullName || 'Имя преподавателя';
}

function hasValue(value) {
    return Boolean(String(value || '').trim());
}

function hasEducation(profile) {
    return hasValue(profile.education_institution)
        || hasValue(profile.education_speciality)
        || hasValue(profile.education_qualification)
        || hasValue(profile.education_graduation_year);
}

function hasPricing(profile) {
    return hasValue(profile.price_45)
        || hasValue(profile.price_60)
        || hasValue(profile.price_90)
        || profile.trial_lesson_enabled
        || hasValue(profile.pricing_comment);
}

function formatPrice(value) {
    if (!hasValue(value)) {
        return '—';
    }

    return `${Number(value).toLocaleString('ru-RU')} ₽`;
}

function getStartPrice(profile) {
    const prices = [
        profile.price_45,
        profile.price_60,
        profile.price_90,
    ]
        .map((value) => Number(value))
        .filter((value) => value > 0);

    if (prices.length === 0) {
        return '';
    }

    return `от ${Math.min(...prices).toLocaleString('ru-RU')} ₽`;
}

export function TeacherProfileView({
    profile,
}) {
    const startPrice = getStartPrice(profile);

    return (
        <article className="teacher-profile-view">
            <div className="teacher-profile-view__hero">
                <div className="teacher-profile-view__photo">
                    {profile.photo_url ? (
                        <img src={profile.photo_url} alt={getFullName(profile)} />
                    ) : (
                        <span>Фото</span>
                    )}
                </div>

                <div className="teacher-profile-view__main">
                    <h2>{getFullName(profile)}</h2>

                    <p className="teacher-profile-view__headline">
                        {profile.headline || 'Короткий заголовок профиля'}
                    </p>

                    <div className="teacher-profile-view__meta">
                        <span>★★★★★ 0.0</span>
                        <span title="Профиль подтверждён">🟢</span>
                        <span title="Образование подтверждено">🎓</span>
                        <span title="Участвует в программе «Доступное образование GoStudy»">🌱</span>
                    </div>

                    {(profile.city || startPrice) && (
                        <div className="teacher-profile-view__hero-details">
                            {profile.city && <span>{profile.city}</span>}
                            {startPrice && <span>{startPrice}</span>}
                        </div>
                    )}
                </div>
            </div>

            {hasValue(profile.about) && (
                <section className="teacher-profile-view__section">
                    <h3>О преподавателе</h3>
                    <p>{profile.about}</p>
                </section>
            )}

            {(hasValue(profile.subjects) || hasValue(profile.student_levels) || hasValue(profile.lesson_goals)) && (
                <section className="teacher-profile-view__section">
                    <h3>Преподавание</h3>

                    <div className="teacher-profile-view__info-grid">
                        {hasValue(profile.subjects) && (
                            <div>
                                <span>Предметы</span>
                                <strong>{profile.subjects}</strong>
                            </div>
                        )}

                        {hasValue(profile.student_levels) && (
                            <div>
                                <span>Для кого</span>
                                <strong>{profile.student_levels}</strong>
                            </div>
                        )}

                        {hasValue(profile.lesson_goals) && (
                            <div>
                                <span>Цели</span>
                                <strong>{profile.lesson_goals}</strong>
                            </div>
                        )}

                        {hasValue(profile.lesson_format) && (
                            <div>
                                <span>Формат</span>
                                <strong>{profile.lesson_format}</strong>
                            </div>
                        )}

                        {hasValue(profile.experience_years) && (
                            <div>
                                <span>Опыт</span>
                                <strong>{profile.experience_years}</strong>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {hasValue(profile.teaching_method) && (
                <section className="teacher-profile-view__section">
                    <h3>Как проходят занятия</h3>
                    <p>{profile.teaching_method}</p>
                </section>
            )}

            {hasValue(profile.first_lesson_description) && (
                <section className="teacher-profile-view__section">
                    <h3>Первое занятие</h3>
                    <p>{profile.first_lesson_description}</p>
                </section>
            )}

            {hasValue(profile.student_gets) && (
                <section className="teacher-profile-view__section">
                    <h3>Что получает ученик</h3>
                    <p>{profile.student_gets}</p>
                </section>
            )}

            {hasEducation(profile) && (
                <section className="teacher-profile-view__section">
                    <h3>Образование</h3>

                    <div className="teacher-profile-view__education">
                        {hasValue(profile.education_institution) && (
                            <strong>{profile.education_institution}</strong>
                        )}

                        {hasValue(profile.education_speciality) && (
                            <p>
                                Специальность: {profile.education_speciality}
                            </p>
                        )}

                        {hasValue(profile.education_qualification) && (
                            <p>
                                Квалификация: {profile.education_qualification}
                            </p>
                        )}

                        {hasValue(profile.education_graduation_year) && (
                            <p>
                                Год окончания: {profile.education_graduation_year}
                            </p>
                        )}

                        <span>
                            🎓 Образование будет подтверждено GoStudy после проверки документов
                        </span>
                    </div>
                </section>
            )}

            {hasValue(profile.certificates) && (
                <section className="teacher-profile-view__section">
                    <h3>Курсы и сертификаты</h3>
                    <p>{profile.certificates}</p>
                </section>
            )}

            {hasPricing(profile) && (
                <section className="teacher-profile-view__section">
                    <h3>Стоимость</h3>

                    <div className="teacher-profile-view__prices">
                        {hasValue(profile.price_45) && (
                            <div>
                                <span>45 минут</span>
                                <strong>{formatPrice(profile.price_45)}</strong>
                            </div>
                        )}

                        {hasValue(profile.price_60) && (
                            <div>
                                <span>60 минут</span>
                                <strong>{formatPrice(profile.price_60)}</strong>
                            </div>
                        )}

                        {hasValue(profile.price_90) && (
                            <div>
                                <span>90 минут</span>
                                <strong>{formatPrice(profile.price_90)}</strong>
                            </div>
                        )}
                    </div>

                    {profile.trial_lesson_enabled && (
                        <p className="teacher-profile-view__notice">
                            Бесплатное ознакомительное занятие
                        </p>
                    )}

                    {hasValue(profile.pricing_comment) && (
                        <p>{profile.pricing_comment}</p>
                    )}
                </section>
            )}

            {hasValue(profile.schedule_description) && (
                <section className="teacher-profile-view__section">
                    <h3>Расписание</h3>
                    <p>{profile.schedule_description}</p>
                </section>
            )}
        </article>
    );
}