function toNumber(value) {
    return Number(value);
}

export function StepTeaching({
    profile,
    options,
    onChange,
}) {
    const subjectIds = Array.isArray(profile.subject_ids)
        ? profile.subject_ids.map(toNumber)
        : [];

    const ageGroupIds = Array.isArray(profile.age_group_ids)
        ? profile.age_group_ids.map(toNumber)
        : [];

    const subjectPreparations = Array.isArray(profile.subject_preparations)
        ? profile.subject_preparations
        : [];

    const subjectGroups = options?.subject_groups || [];
    const ageGroups = options?.age_groups || [];

    function handleChange(event) {
        const {
            name,
            value,
            type,
            checked,
        } = event.target;

        onChange({
            [name]: type === 'checkbox' ? checked : value,
        });
    }

    function toggleSubject(subjectId) {
        const normalizedId = Number(subjectId);
        const isSelected = subjectIds.includes(normalizedId);

        onChange({
            subject_ids: isSelected
                ? subjectIds.filter((id) => id !== normalizedId)
                : [...subjectIds, normalizedId],
            subject_preparations: isSelected
                ? subjectPreparations.filter(
                    (item) => Number(item.subject_id) !== normalizedId,
                )
                : subjectPreparations,
        });
    }

    function togglePreparation(subjectId, preparationId) {
        const normalizedSubjectId = Number(subjectId);
        const normalizedPreparationId = Number(preparationId);
        const currentItem = subjectPreparations.find(
            (item) => Number(item.subject_id) === normalizedSubjectId,
        );
        const currentIds = Array.isArray(currentItem?.preparation_ids)
            ? currentItem.preparation_ids.map(toNumber)
            : [];
        const isSelected = currentIds.includes(normalizedPreparationId);
        const nextIds = isSelected
            ? currentIds.filter((id) => id !== normalizedPreparationId)
            : [...currentIds, normalizedPreparationId];
        const otherItems = subjectPreparations.filter(
            (item) => Number(item.subject_id) !== normalizedSubjectId,
        );

        onChange({
            subject_preparations: nextIds.length > 0
                ? [
                    ...otherItems,
                    {
                        subject_id: normalizedSubjectId,
                        preparation_ids: nextIds,
                    },
                ]
                : otherItems,
        });
    }

    function toggleAgeGroup(ageGroupId) {
        const normalizedId = Number(ageGroupId);
        const isSelected = ageGroupIds.includes(normalizedId);

        onChange({
            age_group_ids: isSelected
                ? ageGroupIds.filter((id) => id !== normalizedId)
                : [...ageGroupIds, normalizedId],
        });
    }

    const selectedSubjects = subjectGroups
        .flatMap((group) => group.subjects || [])
        .filter((subject) => subjectIds.includes(Number(subject.id)));

    return (
        <div className="teacher-profile-step">
            <div className="teacher-profile-step__head">
                <h2>Преподавание</h2>
                <p>
                    Выберите предметы, направления подготовки и возраст учеников.
                    Список формируется из справочников GoStudy.
                </p>
            </div>

            <fieldset className="teacher-profile-choice-section">
                <legend>Предметы</legend>

                <div className="teacher-profile-choice-groups">
                    {subjectGroups.map((group) => (
                        <section
                            key={group.id}
                            className="teacher-profile-choice-group"
                        >
                            <h3>{group.name}</h3>

                            <div className="teacher-profile-choice-list">
                                {(group.subjects || []).map((subject) => (
                                    <label
                                        key={subject.id}
                                        className="teacher-profile-choice"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={subjectIds.includes(Number(subject.id))}
                                            onChange={() => toggleSubject(subject.id)}
                                        />
                                        <span>{subject.name}</span>
                                    </label>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            </fieldset>

            {selectedSubjects.length > 0 && (
                <fieldset className="teacher-profile-choice-section">
                    <legend>Направления подготовки</legend>
                    <p className="teacher-profile-choice-section__hint">
                        Для каждого предмета отметьте направления, с которыми работаете.
                    </p>

                    <div className="teacher-profile-preparations">
                        {selectedSubjects.map((subject) => {
                            const selectedPreparationIds = subjectPreparations
                                .find(
                                    (item) => Number(item.subject_id) === Number(subject.id),
                                )
                                ?.preparation_ids
                                ?.map(toNumber) || [];

                            return (
                                <section
                                    key={subject.id}
                                    className="teacher-profile-preparation-card"
                                >
                                    <h3>{subject.name}</h3>

                                    {(subject.preparation_groups || []).length === 0 ? (
                                        <p>Для предмета направления пока не заданы.</p>
                                    ) : (
                                        (subject.preparation_groups || []).map((group) => (
                                            <div
                                                key={group.id}
                                                className="teacher-profile-preparation-group"
                                            >
                                                <h4>{group.name}</h4>

                                                <div className="teacher-profile-choice-list">
                                                    {(group.preparations || []).map((preparation) => (
                                                        <label
                                                            key={preparation.id}
                                                            className="teacher-profile-choice"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedPreparationIds.includes(Number(preparation.id))}
                                                                onChange={() => togglePreparation(
                                                                    subject.id,
                                                                    preparation.id,
                                                                )}
                                                            />
                                                            <span>{preparation.name}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </section>
                            );
                        })}
                    </div>
                </fieldset>
            )}

            <fieldset className="teacher-profile-choice-section">
                <legend>Возраст учеников</legend>

                <div className="teacher-profile-choice-list">
                    {ageGroups.map((ageGroup) => (
                        <label
                            key={ageGroup.id}
                            className="teacher-profile-choice"
                        >
                            <input
                                type="checkbox"
                                checked={ageGroupIds.includes(Number(ageGroup.id))}
                                onChange={() => toggleAgeGroup(ageGroup.id)}
                            />
                            <span>{ageGroup.name}</span>
                        </label>
                    ))}
                </div>
            </fieldset>

            <label className="teacher-profile-field">
                <span>Опыт преподавания, лет</span>
                <input
                    type="number"
                    name="experience_years"
                    value={profile.experience_years}
                    min="0"
                    max="80"
                    inputMode="numeric"
                    placeholder="Например: 7"
                    onChange={handleChange}
                />
            </label>

            <label className="teacher-profile-field">
                <span>Как проходят занятия</span>
                <textarea
                    name="teaching_method"
                    rows="5"
                    value={profile.teaching_method}
                    placeholder="Опишите ваш подход: объяснение темы, практика, домашние задания, обратная связь."
                    onChange={handleChange}
                />
            </label>

            <label className="teacher-profile-field">
                <span>Как проходит первое занятие</span>
                <textarea
                    name="first_lesson_description"
                    rows="4"
                    value={profile.first_lesson_description}
                    placeholder="Например: знакомимся, определяем уровень, ставим цель и составляем план."
                    onChange={handleChange}
                />
            </label>

            <label className="teacher-profile-checkbox">
                <input
                    type="checkbox"
                    name="uses_author_materials"
                    checked={profile.uses_author_materials}
                    onChange={handleChange}
                />

                <span>Использую на занятиях собственные материалы</span>
            </label>

            {profile.uses_author_materials && (
                <label className="teacher-profile-field">
                    <span>Какие материалы используете</span>
                    <textarea
                        name="author_materials_description"
                        rows="4"
                        value={profile.author_materials_description}
                        placeholder="Например: авторские конспекты, презентации, тренажёры, рабочие листы."
                        onChange={handleChange}
                    />
                </label>
            )}

            <label className="teacher-profile-checkbox">
                <input
                    type="checkbox"
                    name="sells_author_materials"
                    checked={profile.sells_author_materials}
                    onChange={handleChange}
                />

                <span>Планирую продавать авторские материалы на платформе</span>
            </label>

            <label className="teacher-profile-field">
                <span>Что получает ученик</span>
                <textarea
                    name="student_gets"
                    rows="4"
                    value={profile.student_gets}
                    placeholder="Индивидуальный план, домашние задания, материалы, проверка работ."
                    onChange={handleChange}
                />
            </label>
        </div>
    );
}
