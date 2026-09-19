import { formatFileSize } from '../../../../api/upload.js';

export function StepBasic({
    profile,
    pendingMedia,
    onChange,
    photoMaxBytes,
    isUploadingPhoto,
    photoProgress,
    onPhotoSelect,
    onDeletePhoto,
    onOpenPendingMedia,
    onDeletePendingMedia,
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

            <section className="teacher-profile-upload-card">
                <div className="teacher-profile-upload-card__head">
                    <div>
                        <h3>Фото профиля</h3>
                        <p>
                            JPG, PNG или WebP, до {formatFileSize(photoMaxBytes || 5 * 1024 * 1024)}.
                            Минимум 300 × 300 пикселей.
                        </p>
                    </div>

                    {profile.photo_url && (
                        <img
                            className="teacher-profile-upload-card__photo"
                            src={profile.photo_url}
                            alt="Предпросмотр фото профиля"
                        />
                    )}
                </div>

                <div className="teacher-profile-upload-card__actions">
                    <label className="teacher-profile-upload-button">
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            disabled={isUploadingPhoto}
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                event.target.value = '';

                                if (file) {
                                    onPhotoSelect(file);
                                }
                            }}
                        />
                        <span>
                            {isUploadingPhoto
                                ? `Загрузка ${photoProgress}%`
                                : profile.photo_url
                                    ? 'Заменить фото'
                                    : 'Загрузить фото'}
                        </span>
                    </label>

                    {profile.photo_url && (
                        <button
                            type="button"
                            className="teacher-profile-upload-remove"
                            disabled={isUploadingPhoto}
                            onClick={onDeletePhoto}
                        >
                            Удалить
                        </button>
                    )}
                </div>

                {pendingMedia && (
                    <div className={`teacher-profile-media-review teacher-profile-media-review--${pendingMedia.status}`}>
                        <div>
                            <strong>
                                {pendingMedia.status === 'rejected'
                                    ? 'Фотография отклонена'
                                    : 'Новая фотография на проверке'}
                            </strong>
                            <span>{pendingMedia.original_name}</span>
                            {pendingMedia.reject_reason && (
                                <p>{pendingMedia.reject_reason}</p>
                            )}
                        </div>
                        <div className="teacher-profile-media-review__actions">
                            <button
                                type="button"
                                className="teacher-profile-upload-open"
                                onClick={() => onOpenPendingMedia(pendingMedia.id)}
                            >
                                Открыть
                            </button>
                            <button
                                type="button"
                                className="teacher-profile-upload-remove"
                                disabled={isUploadingPhoto}
                                onClick={() => onDeletePendingMedia(
                                    pendingMedia.id,
                                    'photo',
                                )}
                            >
                                Удалить
                            </button>
                        </div>
                    </div>
                )}

                {isUploadingPhoto && (
                    <div className="teacher-profile-upload-progress">
                        <span style={{ width: `${photoProgress}%` }} />
                    </div>
                )}
            </section>

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
