export function StepPricing({
    profile,
    onChange,
}) {
    function handleChange(event) {
        const { name, value, type, checked } = event.target;

        onChange({
            [name]: type === 'checkbox' ? checked : value,
        });
    }

    return (
        <div className="teacher-profile-step">
            <div className="teacher-profile-step__head">
                <h2>Стоимость и расписание</h2>
                <p>
                    Укажите стоимость занятий и удобное время.
                    Эти данные помогут ученику понять, подходит ли ему формат обучения.
                </p>
            </div>

            <div className="teacher-profile-form-grid teacher-profile-form-grid--three">
                <label className="teacher-profile-field">
                    <span>45 минут, ₽</span>
                    <input
                        type="number"
                        name="price_45"
                        value={profile.price_45}
                        placeholder="Например: 700"
                        min="0"
                        onChange={handleChange}
                    />
                </label>

                <label className="teacher-profile-field">
                    <span>60 минут, ₽</span>
                    <input
                        type="number"
                        name="price_60"
                        value={profile.price_60}
                        placeholder="Например: 900"
                        min="0"
                        onChange={handleChange}
                    />
                </label>

                <label className="teacher-profile-field">
                    <span>90 минут, ₽</span>
                    <input
                        type="number"
                        name="price_90"
                        value={profile.price_90}
                        placeholder="Например: 1300"
                        min="0"
                        onChange={handleChange}
                    />
                </label>
            </div>

            <label className="teacher-profile-checkbox">
                <input
                    type="checkbox"
                    name="trial_lesson_enabled"
                    checked={profile.trial_lesson_enabled}
                    onChange={handleChange}
                />

                <span>Провожу бесплатное ознакомительное занятие</span>
            </label>

            <label className="teacher-profile-field">
                <span>Дополнительные условия</span>
                <textarea
                    name="pricing_comment"
                    rows="4"
                    value={profile.pricing_comment}
                    placeholder="Например: возможна скидка при оплате нескольких занятий или индивидуальные условия."
                    onChange={handleChange}
                />
            </label>

            <label className="teacher-profile-field">
                <span>Расписание</span>
                <textarea
                    name="schedule_description"
                    rows="5"
                    value={profile.schedule_description}
                    placeholder="Например: будни после 17:00, суббота до обеда, воскресенье по договорённости."
                    onChange={handleChange}
                />
            </label>
        </div>
    );
}