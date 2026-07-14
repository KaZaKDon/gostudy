function createEducationItem() {
    return {
        id: crypto.randomUUID(),
        institution: '',
        faculty: '',
        speciality: '',
        qualification: '',
        graduation_year: '',
        description: '',
        is_primary: false,
    };
}

export function StepEducation({
    profile,
    onChange,
}) {
    const education = Array.isArray(profile.education)
        ? profile.education
        : [];

    function updateEducationItem(itemId, patch) {
        onChange({
            education: education.map((item) =>
                item.id === itemId
                    ? {
                        ...item,
                        ...patch,
                    }
                    : item,
            ),
        });
    }

    function handleFieldChange(itemId, event) {
        const {
            name,
            value,
        } = event.target;

        updateEducationItem(itemId, {
            [name]: value,
        });
    }

    function handlePrimaryChange(itemId) {
        onChange({
            education: education.map((item) => ({
                ...item,
                is_primary: item.id === itemId,
            })),
        });
    }

    function handleAddEducation() {
        onChange({
            education: [
                ...education,
                createEducationItem(),
            ],
        });
    }

    function handleRemoveEducation(itemId) {
        if (education.length <= 1) {
            return;
        }

        const nextEducation = education.filter(
            (item) => item.id !== itemId,
        );

        const removedItem = education.find(
            (item) => item.id === itemId,
        );

        if (
            removedItem?.is_primary &&
            nextEducation.length > 0
        ) {
            nextEducation[0] = {
                ...nextEducation[0],
                is_primary: true,
            };
        }

        onChange({
            education: nextEducation,
        });
    }

    function handleMoveEducation(itemIndex, direction) {
        const nextIndex = itemIndex + direction;

        if (
            nextIndex < 0 ||
            nextIndex >= education.length
        ) {
            return;
        }

        const nextEducation = [...education];

        [
            nextEducation[itemIndex],
            nextEducation[nextIndex],
        ] = [
            nextEducation[nextIndex],
            nextEducation[itemIndex],
        ];

        onChange({
            education: nextEducation,
        });
    }

    return (
        <div className="teacher-profile-step">
            <div className="teacher-profile-step__head">
                <h2>Образование</h2>

                <p>
                    Добавьте сведения об образовании и профессиональной
                    подготовке. Ученики увидят только подтверждённые данные,
                    но не загруженные документы.
                </p>
            </div>

            <div className="teacher-education-list">
                {education.map((item, index) => (
                    <section
                        key={item.id}
                        className="teacher-education-card"
                    >
                        <header className="teacher-education-card__header">
                            <div>
                                <span>
                                    Образование {index + 1}
                                </span>

                                <h3>
                                    {item.institution.trim() ||
                                        'Новое образование'}
                                </h3>
                            </div>

                            <div className="teacher-education-card__controls">
                                <button
                                    type="button"
                                    aria-label="Переместить выше"
                                    disabled={index === 0}
                                    onClick={() =>
                                        handleMoveEducation(index, -1)
                                    }
                                >
                                    ↑
                                </button>

                                <button
                                    type="button"
                                    aria-label="Переместить ниже"
                                    disabled={
                                        index === education.length - 1
                                    }
                                    onClick={() =>
                                        handleMoveEducation(index, 1)
                                    }
                                >
                                    ↓
                                </button>

                                <button
                                    type="button"
                                    className="teacher-education-card__remove"
                                    disabled={education.length === 1}
                                    onClick={() =>
                                        handleRemoveEducation(item.id)
                                    }
                                >
                                    Удалить
                                </button>
                            </div>
                        </header>

                        <label className="teacher-profile-checkbox">
                            <input
                                type="radio"
                                name="primary_education"
                                checked={item.is_primary}
                                onChange={() =>
                                    handlePrimaryChange(item.id)
                                }
                            />

                            <span>Основное образование</span>
                        </label>

                        <label className="teacher-profile-field">
                            <span>Учебное заведение</span>

                            <input
                                type="text"
                                name="institution"
                                value={item.institution}
                                placeholder="Например: Южный федеральный университет"
                                onChange={(event) =>
                                    handleFieldChange(item.id, event)
                                }
                            />
                        </label>

                        <div className="teacher-profile-form-grid">
                            <label className="teacher-profile-field">
                                <span>Факультет</span>

                                <input
                                    type="text"
                                    name="faculty"
                                    value={item.faculty}
                                    placeholder="Например: Факультет математики"
                                    onChange={(event) =>
                                        handleFieldChange(item.id, event)
                                    }
                                />
                            </label>

                            <label className="teacher-profile-field">
                                <span>Специальность</span>

                                <input
                                    type="text"
                                    name="speciality"
                                    value={item.speciality}
                                    placeholder="Например: Математика"
                                    onChange={(event) =>
                                        handleFieldChange(item.id, event)
                                    }
                                />
                            </label>
                        </div>

                        <div className="teacher-profile-form-grid">
                            <label className="teacher-profile-field">
                                <span>Квалификация</span>

                                <input
                                    type="text"
                                    name="qualification"
                                    value={item.qualification}
                                    placeholder="Например: Учитель математики"
                                    onChange={(event) =>
                                        handleFieldChange(item.id, event)
                                    }
                                />
                            </label>

                            <label className="teacher-profile-field">
                                <span>Год окончания</span>

                                <input
                                    type="number"
                                    name="graduation_year"
                                    value={item.graduation_year}
                                    placeholder="Например: 2018"
                                    min="1950"
                                    max="2100"
                                    onChange={(event) =>
                                        handleFieldChange(item.id, event)
                                    }
                                />
                            </label>
                        </div>

                        <label className="teacher-profile-field">
                            <span>Дополнительные сведения</span>

                            <textarea
                                name="description"
                                rows="4"
                                value={item.description}
                                placeholder="Форма обучения, направление подготовки, достижения или иные сведения."
                                onChange={(event) =>
                                    handleFieldChange(item.id, event)
                                }
                            />
                        </label>
                    </section>
                ))}
            </div>

            <button
                type="button"
                className="teacher-education-add"
                onClick={handleAddEducation}
            >
                Добавить ещё одно образование
            </button>

            <label className="teacher-profile-field">
                <span>
                    Курсы, сертификаты и повышение квалификации
                </span>

                <textarea
                    name="certificates"
                    rows="5"
                    value={profile.certificates}
                    placeholder="Перечислите курсы и сертификаты. Файлы загрузим на шаге «Документы»."
                    onChange={(event) =>
                        onChange({
                            certificates: event.target.value,
                        })
                    }
                />
            </label>
        </div>
    );
}