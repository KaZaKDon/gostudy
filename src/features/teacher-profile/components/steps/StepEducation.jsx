export function StepEducation({
    profile,
    onChange,
}) {
    function handleChange(event) {
        const { name, value } = event.target;

        onChange({
            [name]: value,
        });
    }

    return (
        <div className="teacher-profile-step">
            <div className="teacher-profile-step__head">
                <h2>Образование</h2>
                <p>
                    Укажите образование и профессиональную подготовку.
                    Документы будут проверяться отдельно, а ученики увидят только подтверждённые сведения.
                </p>
            </div>

            <label className="teacher-profile-field">
                <span>Учебное заведение</span>
                <input
                    type="text"
                    name="education_institution"
                    value={profile.education_institution}
                    placeholder="Например: Южный федеральный университет"
                    onChange={handleChange}
                />
            </label>

            <div className="teacher-profile-form-grid">
                <label className="teacher-profile-field">
                    <span>Специальность</span>
                    <input
                        type="text"
                        name="education_speciality"
                        value={profile.education_speciality}
                        placeholder="Например: Математика"
                        onChange={handleChange}
                    />
                </label>

                <label className="teacher-profile-field">
                    <span>Квалификация</span>
                    <input
                        type="text"
                        name="education_qualification"
                        value={profile.education_qualification}
                        placeholder="Например: Учитель математики"
                        onChange={handleChange}
                    />
                </label>
            </div>

            <label className="teacher-profile-field">
                <span>Год окончания</span>
                <input
                    type="number"
                    name="education_graduation_year"
                    value={profile.education_graduation_year}
                    placeholder="Например: 2018"
                    min="1950"
                    max="2100"
                    onChange={handleChange}
                />
            </label>

            <label className="teacher-profile-field">
                <span>Курсы, сертификаты, повышение квалификации</span>
                <textarea
                    name="certificates"
                    rows="5"
                    value={profile.certificates}
                    placeholder="Например: Подготовка экспертов ЕГЭ, курсы повышения квалификации, профессиональные сертификаты."
                    onChange={handleChange}
                />
            </label>
        </div>
    );
}