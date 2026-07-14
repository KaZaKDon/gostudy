import {
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    useNavigate,
    useSearchParams,
} from 'react-router-dom';

import {
    API,
    getAuthHeaders,
} from '../../api/api.js';

const CURRENT_YEAR = new Date().getFullYear();

const INITIAL_STUDENT_PROFILE = {
    firstName: '',
    lastName: '',
    city: '',
    timezone: 'Europe/Moscow',
    age: '',
    classLevel: '',
    subjects: '',
    learningGoal: '',
    levelDescription: '',
    lessonFormat: '',
    parentName: '',
    parentPhone: '',
    phone: '',
    parentEmail: '',
    messenger: '',
    contactPreference: '',
    preferredTime: '',
    scheduleComment: '',
    about: '',
};

const STEPS = [
    {
        id: 'basic',
        title: 'Основная информация',
    },
    {
        id: 'learning',
        title: 'Обучение',
    },
    {
        id: 'contacts',
        title: 'Контакты',
    },
    {
        id: 'schedule',
        title: 'Расписание',
    },
    {
        id: 'preview',
        title: 'Предпросмотр',
    },
];

function mapProfileFromApi(apiProfile) {
    if (!apiProfile) {
        return INITIAL_STUDENT_PROFILE;
    }

    const birthYear = Number(apiProfile.birth_year);

    return {
        firstName: apiProfile.first_name || '',
        lastName: apiProfile.last_name || '',
        city: apiProfile.city || '',
        timezone: apiProfile.timezone || 'Europe/Moscow',
        age: birthYear
            ? String(CURRENT_YEAR - birthYear)
            : '',
        classLevel: apiProfile.class_level || '',
        subjects: apiProfile.subjects || '',
        learningGoal:
            apiProfile.learning_goals ||
            apiProfile.goal ||
            '',
        levelDescription: apiProfile.level_description || '',
        lessonFormat: apiProfile.lesson_format || '',
        parentName: apiProfile.parent_name || '',
        parentPhone: apiProfile.parent_phone || '',
        phone: apiProfile.phone || '',
        parentEmail: apiProfile.parent_email || '',
        messenger: apiProfile.messenger || '',
        contactPreference: apiProfile.contact_preference || '',
        preferredTime: apiProfile.preferred_time || '',
        scheduleComment: apiProfile.schedule_comment || '',
        about: apiProfile.about || '',
    };
}

export function StudentProfileForm() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const isEditMode = searchParams.get('mode') === 'edit';

    const [activeStepIndex, setActiveStepIndex] = useState(0);
    const [profile, setProfile] = useState(INITIAL_STUDENT_PROFILE);

    const [isLoading, setIsLoading] = useState(isEditMode);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const activeStep = STEPS[activeStepIndex];
    const isFirstStep = activeStepIndex === 0;
    const isLastStep = activeStepIndex === STEPS.length - 1;

    const progress = useMemo(
        () =>
            Math.round(
                ((activeStepIndex + 1) / STEPS.length) * 100,
            ),
        [activeStepIndex],
    );

    useEffect(() => {
        if (!isEditMode) {
            return;
        }

        let isMounted = true;

        async function loadStudentProfile() {
            setIsLoading(true);
            setErrorMessage('');

            try {
                const response = await fetch(API.studentProfile, {
                    method: 'GET',
                    headers: getAuthHeaders(),
                });

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message ||
                        'Не удалось загрузить анкету',
                    );
                }

                if (!isMounted) {
                    return;
                }

                setProfile(mapProfileFromApi(result.profile));
            } catch (error) {
                if (!isMounted) {
                    return;
                }

                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : 'Не удалось загрузить анкету',
                );
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        loadStudentProfile();

        return () => {
            isMounted = false;
        };
    }, [isEditMode]);

    const updateField = (field, value) => {
        setProfile((currentProfile) => ({
            ...currentProfile,
            [field]: value,
        }));

        setErrorMessage('');
    };

    const handleNext = () => {
        if (!isLastStep) {
            setActiveStepIndex(
                (currentStep) => currentStep + 1,
            );
        }
    };

    const handleBack = () => {
        if (!isFirstStep) {
            setActiveStepIndex(
                (currentStep) => currentStep - 1,
            );
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        setErrorMessage('');

        if (!profile.firstName.trim()) {
            setErrorMessage('Укажите имя ученика.');
            setActiveStepIndex(0);
            return;
        }

        if (!profile.lastName.trim()) {
            setErrorMessage('Укажите фамилию ученика.');
            setActiveStepIndex(0);
            return;
        }

        const age =
            profile.age === ''
                ? null
                : Number(profile.age);

        if (
            age !== null &&
            (!Number.isInteger(age) || age < 5 || age > 100)
        ) {
            setErrorMessage('Укажите корректный возраст.');
            setActiveStepIndex(0);
            return;
        }

        const birthYear =
            age !== null
                ? CURRENT_YEAR - age
                : null;

        setIsSaving(true);

        try {
            const response = await fetch(API.updateStudent, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    first_name: profile.firstName.trim(),
                    last_name: profile.lastName.trim(),
                    city: profile.city.trim(),
                    timezone: profile.timezone.trim(),
                    birth_year: birthYear,
                    class_level: profile.classLevel.trim(),
                    subjects: profile.subjects.trim(),
                    goal: profile.learningGoal.trim(),
                    learning_goals: profile.learningGoal.trim(),
                    level_description:
                        profile.levelDescription.trim(),
                    lesson_format: profile.lessonFormat.trim(),
                    parent_name: profile.parentName.trim(),
                    parent_phone: profile.parentPhone.trim(),
                    phone: profile.phone.trim(),
                    parent_email: profile.parentEmail.trim(),
                    messenger: profile.messenger.trim(),
                    contact_preference:
                        profile.contactPreference.trim(),
                    preferred_time: profile.preferredTime.trim(),
                    schedule_comment:
                        profile.scheduleComment.trim(),
                    about: profile.about.trim(),
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message ||
                    'Не удалось сохранить анкету',
                );
            }

            sessionStorage.setItem(
                'gostudy_user',
                JSON.stringify(result.user),
            );

            navigate('/account', {
                replace: true,
            });
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'Не удалось сохранить анкету',
            );
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="profile-form__loading">
                Загружаем анкету...
            </div>
        );
    }

    return (
        <form
            className="profile-form"
            onSubmit={handleSubmit}
        >
            <div className="profile-form__progress">
                <div className="profile-form__progress-head">
                    <span>
                        Шаг {activeStepIndex + 1} из {STEPS.length}
                    </span>

                    <strong>{progress}%</strong>
                </div>

                <div className="profile-form__progress-line">
                    <span
                        style={{
                            width: `${progress}%`,
                        }}
                    />
                </div>
            </div>

            <div className="profile-form__steps">
                {STEPS.map((step, index) => (
                    <button
                        key={step.id}
                        type="button"
                        className={
                            index === activeStepIndex
                                ? 'profile-form__step profile-form__step--active'
                                : 'profile-form__step'
                        }
                        disabled={isSaving}
                        onClick={() =>
                            setActiveStepIndex(index)
                        }
                    >
                        {step.title}
                    </button>
                ))}
            </div>

            <section className="profile-form__section">
                <h2>{activeStep.title}</h2>

                {activeStep.id === 'basic' && (
                    <>
                        <div className="profile-form__grid">
                            <label>
                                <span>Имя</span>

                                <input
                                    type="text"
                                    value={profile.firstName}
                                    onChange={(event) =>
                                        updateField(
                                            'firstName',
                                            event.target.value,
                                        )
                                    }
                                    required
                                />
                            </label>

                            <label>
                                <span>Фамилия</span>

                                <input
                                    type="text"
                                    value={profile.lastName}
                                    onChange={(event) =>
                                        updateField(
                                            'lastName',
                                            event.target.value,
                                        )
                                    }
                                    required
                                />
                            </label>
                        </div>

                        <div className="profile-form__grid">
                            <label>
                                <span>Город</span>

                                <input
                                    type="text"
                                    value={profile.city}
                                    onChange={(event) =>
                                        updateField(
                                            'city',
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>

                            <label>
                                <span>Часовой пояс</span>

                                <input
                                    type="text"
                                    value={profile.timezone}
                                    onChange={(event) =>
                                        updateField(
                                            'timezone',
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>
                        </div>

                        <div className="profile-form__grid">
                            <label>
                                <span>Возраст</span>

                                <input
                                    type="number"
                                    min="5"
                                    max="100"
                                    value={profile.age}
                                    onChange={(event) =>
                                        updateField(
                                            'age',
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>

                            <label>
                                <span>Класс / уровень</span>

                                <input
                                    type="text"
                                    placeholder="8 класс, взрослый ученик"
                                    value={profile.classLevel}
                                    onChange={(event) =>
                                        updateField(
                                            'classLevel',
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>
                        </div>
                    </>
                )}

                {activeStep.id === 'learning' && (
                    <>
                        <label>
                            <span>Предметы для изучения</span>

                            <input
                                type="text"
                                placeholder="Математика, английский язык"
                                value={profile.subjects}
                                onChange={(event) =>
                                    updateField(
                                        'subjects',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>

                        <label>
                            <span>Цель обучения</span>

                            <textarea
                                rows="4"
                                placeholder="Подготовка к ОГЭ, ЕГЭ, повышение успеваемости"
                                value={profile.learningGoal}
                                onChange={(event) =>
                                    updateField(
                                        'learningGoal',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>

                        <label>
                            <span>Текущий уровень</span>

                            <textarea
                                rows="4"
                                placeholder="Что получается и где возникают сложности"
                                value={profile.levelDescription}
                                onChange={(event) =>
                                    updateField(
                                        'levelDescription',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>

                        <label>
                            <span>Желаемый формат занятий</span>

                            <input
                                type="text"
                                placeholder="Индивидуально, онлайн, два раза в неделю"
                                value={profile.lessonFormat}
                                onChange={(event) =>
                                    updateField(
                                        'lessonFormat',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                    </>
                )}

                {activeStep.id === 'contacts' && (
                    <>
                        <div className="profile-form__grid">
                            <label>
                                <span>Имя родителя</span>

                                <input
                                    type="text"
                                    value={profile.parentName}
                                    onChange={(event) =>
                                        updateField(
                                            'parentName',
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>

                            <label>
                                <span>Телефон родителя</span>

                                <input
                                    type="tel"
                                    value={profile.parentPhone}
                                    onChange={(event) =>
                                        updateField(
                                            'parentPhone',
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>
                        </div>

                        <div className="profile-form__grid">
                            <label>
                                <span>Телефон ученика</span>

                                <input
                                    type="tel"
                                    placeholder="+7 (999) 123-45-67"
                                    value={profile.phone}
                                    onChange={(event) =>
                                        updateField(
                                            'phone',
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>

                            <label>
                                <span>Email родителя</span>

                                <input
                                    type="email"
                                    value={profile.parentEmail}
                                    onChange={(event) =>
                                        updateField(
                                            'parentEmail',
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>
                        </div>

                        <div className="profile-form__grid">
                            <label>
                                <span>Мессенджер</span>

                                <input
                                    type="text"
                                    placeholder="Telegram, WhatsApp"
                                    value={profile.messenger}
                                    onChange={(event) =>
                                        updateField(
                                            'messenger',
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>

                            <label>
                                <span>Как удобнее связываться</span>

                                <input
                                    type="text"
                                    placeholder="Писать в Telegram"
                                    value={profile.contactPreference}
                                    onChange={(event) =>
                                        updateField(
                                            'contactPreference',
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>
                        </div>
                    </>
                )}

                {activeStep.id === 'schedule' && (
                    <>
                        <label>
                            <span>
                                Предпочтительное время занятий
                            </span>

                            <input
                                type="text"
                                placeholder="Понедельник и среда после 17:00"
                                value={profile.preferredTime}
                                onChange={(event) =>
                                    updateField(
                                        'preferredTime',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>

                        <label>
                            <span>Комментарий к расписанию</span>

                            <textarea
                                rows="4"
                                value={profile.scheduleComment}
                                onChange={(event) =>
                                    updateField(
                                        'scheduleComment',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>

                        <label>
                            <span>О себе</span>

                            <textarea
                                rows="5"
                                value={profile.about}
                                onChange={(event) =>
                                    updateField(
                                        'about',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                    </>
                )}

                {activeStep.id === 'preview' && (
                    <div className="profile-form__preview">
                        <h3>
                            {profile.firstName || 'Имя'}{' '}
                            {profile.lastName || 'Фамилия'}
                        </h3>

                        <p>
                            <strong>Телефон:</strong>{' '}
                            {profile.phone || 'не указан'}
                        </p>

                        <p>
                            <strong>Город:</strong>{' '}
                            {profile.city || 'не указан'}
                        </p>

                        <p>
                            <strong>Класс / уровень:</strong>{' '}
                            {profile.classLevel || 'не указан'}
                        </p>

                        <p>
                            <strong>Предметы:</strong>{' '}
                            {profile.subjects || 'не указаны'}
                        </p>

                        <p>
                            <strong>Цель обучения:</strong>{' '}
                            {profile.learningGoal || 'не указана'}
                        </p>

                        <p>
                            <strong>Формат:</strong>{' '}
                            {profile.lessonFormat || 'не указан'}
                        </p>

                        <p>
                            <strong>Время занятий:</strong>{' '}
                            {profile.preferredTime || 'не указано'}
                        </p>

                        <p>
                            <strong>О себе:</strong>{' '}
                            {profile.about || 'не заполнено'}
                        </p>
                    </div>
                )}
            </section>

            {errorMessage && (
                <p className="auth-card__error">
                    {errorMessage}
                </p>
            )}

            <div className="profile-form__actions">
                <button
                    type="button"
                    disabled={isFirstStep || isSaving}
                    onClick={handleBack}
                >
                    Назад
                </button>

                {!isLastStep ? (
                    <button
                        type="button"
                        className="profile-form__submit"
                        disabled={isSaving}
                        onClick={handleNext}
                    >
                        Далее
                    </button>
                ) : (
                    <button
                        type="submit"
                        className="profile-form__submit"
                        disabled={isSaving}
                    >
                        {isSaving
                            ? 'Сохраняем...'
                            : isEditMode
                                ? 'Сохранить изменения'
                                : 'Сохранить анкету'}
                    </button>
                )}
            </div>
        </form>
    );
}