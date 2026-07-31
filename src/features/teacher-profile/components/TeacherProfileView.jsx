function getFullName(profile) {
    const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();

    return fullName || 'Имя преподавателя';
}

function hasValue(value) {
    return Boolean(String(value || '').trim());
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

function getTeachingSummary(profile, options) {
    const subjectIds = new Set((profile.subject_ids || []).map(Number));
    const ageGroupIds = new Set((profile.age_group_ids || []).map(Number));
    const selectedPreparations = new Map(
        (profile.subject_preparations || []).map((item) => [
            Number(item.subject_id),
            new Set((item.preparation_ids || []).map(Number)),
        ]),
    );
    const subjects = [];
    const preparations = [];

    for (const group of options?.subject_groups || []) {
        for (const subject of group.subjects || []) {
            if (!subjectIds.has(Number(subject.id))) {
                continue;
            }

            subjects.push(subject.name);

            const selectedIds = selectedPreparations.get(Number(subject.id));

            if (!selectedIds) {
                continue;
            }

            const names = (subject.preparation_groups || [])
                .flatMap((preparationGroup) => preparationGroup.preparations || [])
                .filter((preparation) => selectedIds.has(Number(preparation.id)))
                .map((preparation) => preparation.name);

            if (names.length > 0) {
                preparations.push(`${subject.name}: ${names.join(', ')}`);
            }
        }
    }

    const ageGroups = (options?.age_groups || [])
        .filter((ageGroup) => ageGroupIds.has(Number(ageGroup.id)))
        .map((ageGroup) => ageGroup.name);

    return {
        subjects,
        preparations,
        ageGroups,
    };
}

export function TeacherProfileView({
    profile,
    options,
}) {
    const startPrice = getStartPrice(profile);
    const teaching = getTeachingSummary(profile, options);
    const education = Array.isArray(profile.education)
        ? profile.education.filter((item) => hasValue(item.institution))
        : [];

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
                        {profile.accessibility_enabled && (
                            <span title="Участвует в программе «Доступное образование GoStudy»">
                                🌱
                            </span>
                        )}
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

            {(teaching.subjects.length > 0
                || teaching.ageGroups.length > 0
                || teaching.preparations.length > 0
                || hasValue(profile.experience_years)) && (
                <section className="teacher-profile-view__section">
                    <h3>Преподавание</h3>

                    <div className="teacher-profile-view__info-grid">
                        {teaching.subjects.length > 0 && (
                            <div>
                                <span>Предметы</span>
                                <strong>{teaching.subjects.join(', ')}</strong>
                            </div>
                        )}

                        {teaching.ageGroups.length > 0 && (
                            <div>
                                <span>Возраст учеников</span>
                                <strong>{teaching.ageGroups.join(', ')}</strong>
                            </div>
                        )}

                        {hasValue(profile.experience_years) && (
                            <div>
                                <span>Опыт</span>
                                <strong>{profile.experience_years} лет</strong>
                            </div>
                        )}
                    </div>

                    {teaching.preparations.length > 0 && (
                        <div className="teacher-profile-view__education">
                            <strong>Направления подготовки</strong>
                            {teaching.preparations.map((item) => (
                                <p key={item}>{item}</p>
                            ))}
                        </div>
                    )}
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

            {education.length > 0 && (
                <section className="teacher-profile-view__section">
                    <h3>Образование</h3>

                    <div className="teacher-profile-view__education-list">
                        {education.map((item, index) => (
                            <div
                                key={item.id || `${item.institution}-${index}`}
                                className="teacher-profile-view__education"
                            >
                                <strong>{item.institution}</strong>
                                {hasValue(item.faculty) && <p>{item.faculty}</p>}
                                {hasValue(item.speciality) && (
                                    <p>Специальность: {item.speciality}</p>
                                )}
                                {hasValue(item.qualification) && (
                                    <p>Квалификация: {item.qualification}</p>
                                )}
                                {hasValue(item.graduation_year) && (
                                    <p>Год окончания: {item.graduation_year}</p>
                                )}
                            </div>
                        ))}
                    </div>
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

            {hasValue(profile.intro_video_url) && (
                <section className="teacher-profile-view__section">
                    <h3>Видеовизитка</h3>
                    <video
                        className="teacher-profile-upload-card__video"
                        src={profile.intro_video_url}
                        controls
                        preload="metadata"
                    >
                        Ваш браузер не поддерживает видео.
                    </video>
                </section>
            )}
        </article>
    );
}
