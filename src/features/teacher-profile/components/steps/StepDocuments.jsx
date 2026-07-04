export function StepDocuments({
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
                <h2>Документы</h2>
                <p>
                    Загрузите документы для проверки образования и квалификации.
                    Ученики не увидят сами файлы — только подтверждённые сведения.
                </p>
            </div>

            <div className="teacher-profile-info-box">
                <h3>Что увидят ученики?</h3>

                <p>
                    После проверки в профиле появится отметка:
                    «Образование подтверждено GoStudy».
                </p>

                <p>
                    Сами документы используются только для модерации и не публикуются.
                </p>
            </div>

            <label className="teacher-profile-field">
                <span>Диплом или документ об образовании</span>
                <input
                    type="text"
                    name="diploma_file"
                    value={profile.diploma_file}
                    placeholder="Пока можно вставить ссылку на файл"
                    onChange={handleChange}
                />
            </label>

            <label className="teacher-profile-field">
                <span>Сертификаты / повышение квалификации</span>
                <textarea
                    name="certificate_files"
                    rows="4"
                    value={profile.certificate_files}
                    placeholder="Пока можно указать ссылки или названия документов"
                    onChange={handleChange}
                />
            </label>

            <label className="teacher-profile-field">
                <span>Видеовизитка</span>
                <input
                    type="text"
                    name="intro_video_url"
                    value={profile.intro_video_url}
                    placeholder="Ссылка на видео, если есть"
                    onChange={handleChange}
                />
            </label>
        </div>
    );
}