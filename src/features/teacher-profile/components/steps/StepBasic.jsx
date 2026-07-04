export function StepBasic({
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
                <h2>Основная информация</h2>
                <p>
                    Эти данные формируют первое впечатление о преподавателе.
                </p>
            </div>

            <div className="teacher-profile-form-grid">
                <label className="teacher-profile-field">
                    <span>Имя</span>
                    <input
                        type="text"
                        name="first_name"
                        value={profile.first_name}
                        onChange={handleChange}
                    />
                </label>

                <label className="teacher-profile-field">
                    <span>Фамилия</span>
                    <input
                        type="text"
                        name="last_name"
                        value={profile.last_name}
                        onChange={handleChange}
                    />
                </label>
            </div>

            <label className="teacher-profile-field">
                <span>Фото профиля</span>
                <input
                    type="text"
                    name="photo_url"
                    value={profile.photo_url}
                    placeholder="Пока можно вставить ссылку на изображение"
                    onChange={handleChange}
                />
            </label>

            <div className="teacher-profile-form-grid">
                <label className="teacher-profile-field">
                    <span>Город</span>
                    <input
                        type="text"
                        name="city"
                        value={profile.city}
                        onChange={handleChange}
                    />
                </label>

                <label className="teacher-profile-field">
                    <span>Часовой пояс</span>
                    <input
                        type="text"
                        name="timezone"
                        value={profile.timezone}
                        placeholder="Например: Москва"
                        onChange={handleChange}
                    />
                </label>
            </div>

            <label className="teacher-profile-field">
                <span>Короткий заголовок</span>
                <input
                    type="text"
                    name="headline"
                    value={profile.headline}
                    placeholder="Например: Репетитор по математике для 5–11 классов"
                    onChange={handleChange}
                />
            </label>

            <label className="teacher-profile-field">
                <span>О себе</span>
                <textarea
                    name="about"
                    rows="5"
                    value={profile.about}
                    placeholder="Расскажите, кому и как вы помогаете учиться."
                    onChange={handleChange}
                />
            </label>
        </div>
    );
}