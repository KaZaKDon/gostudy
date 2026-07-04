export function StepAccessibility({
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
                <h2>Доступное образование GoStudy</h2>

                <p>
                    Участие в программе полностью добровольное. Вы можете помогать
                    ученикам, для которых стоимость занятий может стать препятствием
                    к получению качественного образования.
                </p>
            </div>

            <div className="teacher-profile-info-box">
                <h3>Что означает участие?</h3>

                <p>
                    Вы самостоятельно определяете, кому готовы помочь, в каком формате,
                    сколько учеников готовы принять и на каких условиях.
                </p>

                <p>
                    <strong>
                        За занятия, проведённые в рамках программы «Доступное образование GoStudy»,
                        платформа не удерживает комиссию.
                    </strong>
                </p>

                <p>
                    Ученики увидят только значок участия в программе. Подробные условия
                    не публикуются и используются для подбора обращений.
                </p>
            </div>

            <label className="teacher-profile-checkbox">
                <input
                    type="checkbox"
                    name="accessibility_enabled"
                    checked={profile.accessibility_enabled}
                    onChange={handleChange}
                />

                <span>Участвовать в программе «Доступное образование GoStudy»</span>
            </label>

            {profile.accessibility_enabled && (
                <div className="teacher-profile-accessibility-panel">
                    <label className="teacher-profile-checkbox">
                        <input
                            type="checkbox"
                            name="accessibility_free_lessons"
                            checked={profile.accessibility_free_lessons}
                            onChange={handleChange}
                        />

                        <span>Готов проводить бесплатные занятия</span>
                    </label>

                    <label className="teacher-profile-checkbox">
                        <input
                            type="checkbox"
                            name="accessibility_discount"
                            checked={profile.accessibility_discount}
                            onChange={handleChange}
                        />

                        <span>Готов предоставлять скидку</span>
                    </label>

                    <label className="teacher-profile-checkbox">
                        <input
                            type="checkbox"
                            name="accessibility_individual"
                            checked={profile.accessibility_individual}
                            onChange={handleChange}
                        />

                        <span>Готов рассматривать обращения индивидуально</span>
                    </label>

                    <label className="teacher-profile-field">
                        <span>Сколько учеников готовы принять</span>
                        <input
                            type="number"
                            name="accessibility_slots"
                            value={profile.accessibility_slots}
                            min="1"
                            max="10"
                            placeholder="Например: 2"
                            onChange={handleChange}
                        />
                    </label>

                    <label className="teacher-profile-field">
                        <span>Комментарий</span>
                        <textarea
                            name="accessibility_comment"
                            rows="4"
                            value={profile.accessibility_comment}
                            placeholder="Например: готов рассмотреть индивидуальные условия для мотивированных учеников."
                            onChange={handleChange}
                        />
                    </label>
                </div>
            )}
        </div>
    );
}