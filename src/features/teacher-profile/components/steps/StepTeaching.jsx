export function StepTeaching({
    profile,
    onChange,
}) {
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

    return (
        <div className="teacher-profile-step">
            <div className="teacher-profile-step__head">
                <h2>Преподавание</h2>
                <p>
                    Расскажите, кому вы помогаете, с какими целями работаете
                    и как проходят ваши занятия.
                </p>
            </div>

            <label className="teacher-profile-field">
                <span>Предметы</span>
                <input
                    type="text"
                    name="subjects"
                    value={profile.subjects}
                    placeholder="Математика, физика, английский язык"
                    onChange={handleChange}
                />
            </label>

            <label className="teacher-profile-field">
                <span>Для кого проводите занятия</span>
                <input
                    type="text"
                    name="student_levels"
                    value={profile.student_levels}
                    placeholder="Начальная школа, 5–9 класс, ЕГЭ, ОГЭ, взрослые"
                    onChange={handleChange}
                />
            </label>

            <label className="teacher-profile-field">
                <span>Цели обучения</span>
                <input
                    type="text"
                    name="lesson_goals"
                    value={profile.lesson_goals}
                    placeholder="Подготовка к экзаменам, подтянуть школьную программу, контрольные"
                    onChange={handleChange}
                />
            </label>

            <div className="teacher-profile-form-grid">
                <label className="teacher-profile-field">
                    <span>Формат уроков</span>
                    <input
                        type="text"
                        name="lesson_format"
                        value={profile.lesson_format}
                        placeholder="Онлайн, индивидуально, мини-группы"
                        onChange={handleChange}
                    />
                </label>

                <label className="teacher-profile-field">
                    <span>Опыт преподавания</span>
                    <input
                        type="text"
                        name="experience_years"
                        value={profile.experience_years}
                        placeholder="Например: 7 лет"
                        onChange={handleChange}
                    />
                </label>
            </div>

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