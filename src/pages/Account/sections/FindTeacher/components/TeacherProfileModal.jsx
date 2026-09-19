import {
    useEffect,
    useMemo,
    useState,
} from 'react';

import { API } from '../../../../../api/api.js';
import { apiRequest } from '../../../../../api/apiRequest.js';
import { TeacherBadgeList } from './TeacherBadgeList.jsx';

const ACCESSIBILITY_TYPE_LABELS = {
    free: 'Бесплатное обучение',
    discount: 'Обучение со скидкой',
    individual: 'Индивидуальные условия',
};

const APPLICATION_STATUS_LABELS = {
    pending: 'Ожидает ответа преподавателя',
    accepted: 'Ожидает вашего подтверждения',
    rejected: 'Отклонена',
    confirmed: 'Условия подтверждены',
    expired: 'Срок подтверждения истёк',
};

function formatEducation(item) {
    return [
        item.institution,
        item.speciality,
        item.qualification,
        item.graduation_year,
    ]
        .filter(Boolean)
        .join(' · ');
}

function formatDocument(document) {
    return [
        document.document_title,
        document.institution,
        document.document_year,
    ]
        .filter(Boolean)
        .join(' · ');
}

function formatFreePlaces(count) {
    const value = Number(count) || 0;
    const lastTwo = value % 100;
    const last = value % 10;
    const word = lastTwo >= 11 && lastTwo <= 14
        ? 'свободных мест'
        : last === 1
            ? 'свободное место'
            : last >= 2 && last <= 4
                ? 'свободных места'
                : 'свободных мест';
    return `${value} ${word}`;
}

export function TeacherProfileModal({
    teacher,
    role,
    onRequestSent,
    onClose,
}) {
    const [profile, setProfile] = useState(null);
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [message, setMessage] = useState('');
    const [requestStatus, setRequestStatus] = useState('loading');
    const [submitStatus, setSubmitStatus] = useState('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [children, setChildren] = useState([]);
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [applications, setApplications] = useState([]);
    const [selectedOfferId, setSelectedOfferId] = useState('');
    const [accessibilitySubjectId, setAccessibilitySubjectId] = useState('');
    const [accessibilityMessage, setAccessibilityMessage] = useState('');
    const [accessibilityStatus, setAccessibilityStatus] = useState('idle');

    useEffect(() => {
        if (!teacher) {
            return undefined;
        }

        const controller = new AbortController();

        async function loadProfile() {
            setRequestStatus('loading');
            setErrorMessage('');

            try {
                const params = new URLSearchParams({
                    teacher_id: String(teacher.teacherId),
                });
                if (role === 'parent' && selectedStudentId) {
                    params.set('student_id', selectedStudentId);
                }

                const result = await apiRequest(
                    `${API.studentTeacher}?${params.toString()}`,
                    { signal: controller.signal },
                );

                const loadedProfile = result.teacher || null;
                const subjects = Array.isArray(loadedProfile?.subjects)
                    ? loadedProfile.subjects
                    : [];

                setProfile(loadedProfile);
                setSelectedSubjectId(
                    subjects[0]?.id
                        ? String(subjects[0].id)
                        : '',
                );
                setRequestStatus('success');
            } catch (error) {
                if (
                    error instanceof DOMException &&
                    error.name === 'AbortError'
                ) {
                    return;
                }

                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : 'Не удалось загрузить анкету преподавателя',
                );
                setRequestStatus('error');
            }
        }

        loadProfile();

        return () => controller.abort();
    }, [teacher, role, selectedStudentId]);

    useEffect(() => {
        if (!teacher || !['student', 'parent'].includes(role)) return undefined;
        const controller = new AbortController();

        async function loadApplicantData() {
            try {
                const requests = [apiRequest(
                    `${API.accessibilityApplications}/mine`,
                    { signal: controller.signal },
                )];
                if (role === 'parent') {
                    requests.push(apiRequest(API.parentChildren, {
                        signal: controller.signal,
                    }));
                }
                const [applicationResult, childrenResult] = await Promise.all(requests);
                setApplications(applicationResult.applications || []);
                if (childrenResult) {
                    const eligible = (childrenResult.children || []).filter(
                        (child) => child.verification_status === 'verified'
                            && child.student_id,
                    );
                    setChildren(eligible);
                    setSelectedStudentId(eligible[0]?.student_id
                        ? String(eligible[0].student_id)
                        : '');
                }
            } catch (error) {
                if (error.name !== 'AbortError') {
                    setErrorMessage(error.message || 'Не удалось загрузить заявки');
                }
            }
        }

        loadApplicantData();
        return () => controller.abort();
    }, [role, teacher]);

    const selectedSubject = useMemo(
        () => profile?.subjects?.find(
            (subject) => String(subject.id) === selectedSubjectId,
        ) ?? null,
        [profile, selectedSubjectId],
    );

    if (!teacher) return null;

    const pendingSubjectIds = Array.isArray(profile?.pending_subject_ids)
        ? profile.pending_subject_ids
        : [];

    const activeSubjectIds = Array.isArray(profile?.active_subject_ids)
        ? profile.active_subject_ids
        : [];

    const numericSubjectId = Number(selectedSubjectId);
    const hasPendingRequest = pendingSubjectIds.includes(numericSubjectId);
    const hasActiveTeacher = activeSubjectIds.includes(numericSubjectId);

    const displayTeacher = profile || {
        name: teacher.name,
        headline: teacher.headline,
        experience_years: null,
        rating: teacher.rating,
        reviews_count: teacher.reviewsCount,
        photo_url: teacher.photoUrl,
        rank: teacher.rank,
        completed_lessons_count: teacher.completedLessonsCount,
        badges: teacher.badges,
    };

    const initials = displayTeacher.name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2);

    const handleSendRequest = async () => {
        if (!selectedSubject || submitStatus === 'loading') {
            return;
        }

        setSubmitStatus('loading');
        setErrorMessage('');

        try {
            const result = await apiRequest(API.sendTeacherRequest, {
                method: 'POST',
                body: {
                    teacher_id: teacher.teacherId,
                    subject_id: selectedSubject.id,
                    ...(role === 'parent'
                        ? { student_id: Number(selectedStudentId) }
                        : {}),
                    message: message.trim(),
                },
            });

            setProfile((currentProfile) => {
                if (!currentProfile) return currentProfile;

                const pendingIds = Array.isArray(
                    currentProfile.pending_subject_ids,
                )
                    ? currentProfile.pending_subject_ids
                    : [];

                return {
                    ...currentProfile,
                    pending_subject_ids: [
                        ...new Set([
                            ...pendingIds,
                            selectedSubject.id,
                        ]),
                    ],
                };
            });
            setSubmitStatus('success');
            onRequestSent?.(result.request);
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'Не удалось отправить заявку',
            );
            setSubmitStatus('error');
        }
    };

    const formats = Array.isArray(profile?.formats)
        ? profile.formats
        : [];

    const education = Array.isArray(profile?.education)
        ? profile.education
        : [];

    const documents = Array.isArray(profile?.documents)
        ? profile.documents
        : [];

    const reviews = Array.isArray(profile?.reviews)
        ? profile.reviews
        : [];

    const ageGroups = Array.isArray(profile?.age_groups)
        ? profile.age_groups
        : [];

    const preparations = Array.from(new Map(
        (profile?.subjects || []).flatMap((subject) => (
            (subject.preparations || []).map((preparation) => [
                preparation.id,
                preparation,
            ])
        )),
    ).values());

    const accessibilityOffers = Array.isArray(profile?.accessibility_offers)
        ? profile.accessibility_offers
        : [];
    const selectedOffer = accessibilityOffers.find(
        (offer) => String(offer.id) === selectedOfferId,
    ) || null;
    const teacherApplications = applications.filter(
        (application) => application.teacher_id === teacher.teacherId,
    );

    async function sendAccessibilityApplication() {
        if (!selectedOffer || !accessibilitySubjectId) return;
        if (role === 'parent' && !selectedStudentId) {
            setErrorMessage('Выберите подтверждённого и привязанного ребёнка');
            return;
        }
        setAccessibilityStatus('loading');
        setErrorMessage('');
        try {
            const result = await apiRequest(API.accessibilityApplications, {
                method: 'POST',
                body: {
                    offer_id: selectedOffer.id,
                    subject_id: Number(accessibilitySubjectId),
                    ...(role === 'parent'
                        ? { student_id: Number(selectedStudentId) }
                        : {}),
                    message: accessibilityMessage.trim(),
                },
            });
            setApplications((current) => [result.application, ...current]);
            setAccessibilityStatus('success');
            setSelectedOfferId('');
            setAccessibilityMessage('');
        } catch (error) {
            setErrorMessage(error.message || 'Не удалось отправить заявку');
            setAccessibilityStatus('error');
        }
    }

    async function confirmAccessibilityApplication(applicationId) {
        setAccessibilityStatus('loading');
        setErrorMessage('');
        try {
            await apiRequest(
                `${API.accessibilityApplications}/${applicationId}/confirm`,
                { method: 'PATCH' },
            );
            setApplications((current) => current.map((application) => (
                application.id === applicationId
                    ? { ...application, status: 'confirmed' }
                    : application
            )));
            setAccessibilityStatus('success');
        } catch (error) {
            setErrorMessage(error.message || 'Не удалось подтвердить условия');
            setAccessibilityStatus('error');
        }
    }

    return (
        <div className="teacher-profile-modal">
            <button
                type="button"
                className="teacher-profile-modal__overlay"
                aria-label="Закрыть анкету преподавателя"
                onClick={onClose}
            />

            <section
                className="teacher-profile-modal__panel"
                role="dialog"
                aria-modal="true"
            >
                <header className="teacher-profile-modal__header">
                    <div className="teacher-profile-modal__avatar">
                        {displayTeacher.photo_url ? (
                            <img
                                src={displayTeacher.photo_url}
                                alt={displayTeacher.name}
                            />
                        ) : initials}
                    </div>

                    <div className="teacher-profile-modal__title">
                        <span>Публичная анкета</span>

                        <h2>{displayTeacher.name}</h2>

                        <p>
                            {displayTeacher.headline || teacher.subject}
                        </p>

                        <strong>
                            {(displayTeacher.rank ?? teacher.rank)
                                ? `№ ${displayTeacher.rank ?? teacher.rank}`
                                : 'Новый преподаватель'}
                            {' · '}
                            {(displayTeacher.reviews_count ?? teacher.reviewsCount) > 0
                                ? `★ ${Number(displayTeacher.rating || 0).toFixed(1)} · ${displayTeacher.reviews_count ?? teacher.reviewsCount} отзывов`
                                : 'пока без отзывов'}
                            {' · '}
                            {displayTeacher.completed_lessons_count
                                ?? teacher.completedLessonsCount
                                ?? 0}
                            {' уроков'}
                        </strong>

                        {(displayTeacher.city || displayTeacher.experience_years) && (
                            <p className="teacher-profile-modal__meta">
                                {[
                                    displayTeacher.city,
                                    displayTeacher.experience_years !== null
                                    && displayTeacher.experience_years !== undefined
                                        ? `Опыт ${displayTeacher.experience_years} лет`
                                        : null,
                                ].filter(Boolean).join(' · ')}
                            </p>
                        )}

                        <TeacherBadgeList
                            badgeKeys={displayTeacher.badges ?? teacher.badges}
                        />
                    </div>

                    <button
                        type="button"
                        className="teacher-profile-modal__close"
                        aria-label="Закрыть"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </header>

                <div className="teacher-profile-modal__content">
                    {requestStatus === 'loading' ? (
                        <section>
                            <p>Загружаем анкету преподавателя...</p>
                        </section>
                    ) : requestStatus === 'error' ? (
                        <section className="teacher-profile-modal__notice">
                            <h3>Не удалось открыть анкету</h3>
                            <p>{errorMessage}</p>
                        </section>
                    ) : profile ? (
                        <>
                            {errorMessage && (
                                <section className="teacher-profile-modal__notice">
                                    <p>{errorMessage}</p>
                                </section>
                            )}

                            <section>
                                <h3>О преподавателе</h3>
                                <p>{profile.about || 'Описание пока не добавлено.'}</p>
                            </section>

                            {profile.teaching_method && (
                                <section>
                                    <h3>Методика преподавания</h3>
                                    <p>{profile.teaching_method}</p>
                                </section>
                            )}

                            {profile.first_lesson_description && (
                                <section>
                                    <h3>Первое занятие</h3>
                                    <p>{profile.first_lesson_description}</p>
                                </section>
                            )}

                            {profile.student_gets && (
                                <section>
                                    <h3>Что получает ученик</h3>
                                    <p>{profile.student_gets}</p>
                                </section>
                            )}

                            <section>
                                <h3>Предметы и направления</h3>
                                <div className="teacher-profile-modal__chips">
                                    {profile.subjects.map((subject) => (
                                        <span key={subject.id}>
                                            {subject.name}
                                        </span>
                                    ))}
                                </div>
                            </section>

                            {(ageGroups.length > 0 || preparations.length > 0) && (
                                <section>
                                    <h3>Кому и с чем помогает</h3>
                                    {ageGroups.length > 0 && (
                                        <div className="teacher-profile-modal__chips">
                                            {ageGroups.map((ageGroup) => (
                                                <span key={ageGroup.id}>{ageGroup.name}</span>
                                            ))}
                                        </div>
                                    )}
                                    {preparations.length > 0 && (
                                        <div className="teacher-profile-modal__chips teacher-profile-modal__chips--secondary">
                                            {preparations.map((preparation) => (
                                                <span key={preparation.id}>{preparation.name}</span>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            )}

                            {accessibilityOffers.length > 0 && (
                                <section className="teacher-profile-modal__accessibility">
                                    <div>
                                        <h3>Доступное образование</h3>
                                        <p>Одобренные GoStudy условия преподавателя.</p>
                                    </div>

                                    <div className="teacher-accessibility-offers">
                                        {accessibilityOffers.map((offer) => {
                                            const alreadyStudies = role === 'student'
                                                && offer.subjects.some(
                                                    (subject) => activeSubjectIds.includes(subject.id),
                                                );
                                            return (
                                            <article key={offer.id}>
                                                <div>
                                                    <strong>{ACCESSIBILITY_TYPE_LABELS[offer.offer_type]}</strong>
                                                    <span>{formatFreePlaces(offer.slots_available)}</span>
                                                </div>
                                                {offer.discount_percent && (
                                                    <b>Скидка {offer.discount_percent}%</b>
                                                )}
                                                <p>{offer.comment || 'Дополнительное описание не указано.'}</p>
                                                <small>
                                                    {offer.subjects.map((subject) => subject.name).join(', ')}
                                                    {' · '}
                                                    {offer.default_duration_months
                                                        ? `${offer.default_duration_months} мес.`
                                                        : 'без ограничения срока'}
                                                </small>
                                                <button
                                                    type="button"
                                                    disabled={alreadyStudies}
                                                    onClick={() => {
                                                        setSelectedOfferId(String(offer.id));
                                                        setAccessibilitySubjectId(
                                                            String(offer.subjects[0]?.id || ''),
                                                        );
                                                        setErrorMessage('');
                                                    }}
                                                >
                                                    {alreadyStudies
                                                        ? 'Вы уже занимаетесь по этому предмету'
                                                        : 'Подать заявку'}
                                                </button>
                                            </article>
                                            );
                                        })}
                                    </div>

                                    {selectedOffer && (
                                        <div className="teacher-accessibility-form">
                                            <h4>{ACCESSIBILITY_TYPE_LABELS[selectedOffer.offer_type]}</h4>
                                            {role === 'parent' && (
                                                <label>
                                                    <span>Ребёнок</span>
                                                    <select
                                                        value={selectedStudentId}
                                                        onChange={(event) => setSelectedStudentId(event.target.value)}
                                                    >
                                                        <option value="">Выберите ребёнка</option>
                                                        {children.map((child) => (
                                                            <option key={child.id} value={child.student_id}>
                                                                {child.full_name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </label>
                                            )}
                                            <label>
                                                <span>Предмет</span>
                                                <select
                                                    value={accessibilitySubjectId}
                                                    onChange={(event) => setAccessibilitySubjectId(event.target.value)}
                                                >
                                                    {selectedOffer.subjects.map((subject) => (
                                                        <option key={subject.id} value={subject.id}>{subject.name}</option>
                                                    ))}
                                                </select>
                                            </label>
                                            <label>
                                                <span>Коротко объясните, почему вам подходят эти условия</span>
                                                <textarea
                                                    maxLength="1000"
                                                    value={accessibilityMessage}
                                                    onChange={(event) => setAccessibilityMessage(event.target.value)}
                                                />
                                            </label>
                                            <div>
                                                <button type="button" onClick={() => setSelectedOfferId('')}>Отмена</button>
                                                <button
                                                    type="button"
                                                    disabled={accessibilityStatus === 'loading'}
                                                    onClick={sendAccessibilityApplication}
                                                >
                                                    {accessibilityStatus === 'loading' ? 'Отправляем...' : 'Отправить преподавателю'}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {teacherApplications.length > 0 && (
                                        <div className="teacher-accessibility-applications">
                                            <h4>Ваши заявки этому преподавателю</h4>
                                            {teacherApplications.map((application) => (
                                                <article key={application.id}>
                                                    <div>
                                                        <strong>{application.subject_name}</strong>
                                                        <span>{APPLICATION_STATUS_LABELS[application.status] || application.status}</span>
                                                    </div>
                                                    {application.teacher_comment && <p>{application.teacher_comment}</p>}
                                                    {application.status === 'accepted' && (
                                                        <button
                                                            type="button"
                                                            disabled={accessibilityStatus === 'loading'}
                                                            onClick={() => confirmAccessibilityApplication(application.id)}
                                                        >
                                                            Подтвердить условия
                                                        </button>
                                                    )}
                                                </article>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            )}

                            {(formats.length > 0
                                || profile.trial_lesson_enabled
                                || profile.pricing_comment) && (
                                <section>
                                    <h3>Форматы занятий</h3>
                                    {formats.length > 0 && (
                                        <div className="teacher-profile-modal__chips">
                                            {formats.map((format) => (
                                                <span key={format.duration}>
                                                    {format.duration} минут
                                                    {' — '}
                                                    {format.price} ₽
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    {profile.trial_lesson_enabled && (
                                        <p className="teacher-profile-modal__highlight">
                                            Доступно ознакомительное занятие
                                        </p>
                                    )}
                                    {profile.pricing_comment && (
                                        <p>{profile.pricing_comment}</p>
                                    )}
                                </section>
                            )}

                            {profile.schedule_description && (
                                <section>
                                    <h3>Расписание</h3>
                                    <p>{profile.schedule_description}</p>
                                </section>
                            )}

                            {profile.intro_video_url && (
                                <section>
                                    <h3>Видеовизитка</h3>
                                    <video
                                        className="teacher-profile-modal__video"
                                        src={profile.intro_video_url}
                                        controls
                                        preload="metadata"
                                    >
                                        Ваш браузер не поддерживает видео.
                                    </video>
                                </section>
                            )}

                            {education.length > 0 && (
                                <section>
                                    <h3>Образование</h3>
                                    <ul>
                                        {education.map((item, index) => (
                                            <li key={`${item.institution}-${index}`}>
                                                {formatEducation(item)}
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            )}

                            {documents.length > 0 && (
                                <section>
                                    <h3>Подтверждённые документы</h3>
                                    <ul>
                                        {documents.map((document, index) => (
                                            <li key={`${document.document_title}-${index}`}>
                                                {formatDocument(document)}
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            )}

                            {reviews.length > 0 && (
                                <section>
                                    <h3>Отзывы</h3>
                                    <ul>
                                        {reviews.map((review, index) => (
                                            <li key={`${review.created_at}-${index}`}>
                                                <strong>
                                                    {review.rating} из 5
                                                    {review.student_name
                                                        ? ` · ${review.student_name}`
                                                        : ''}
                                                </strong>

                                                <p>{review.text}</p>

                                                {review.teacher_reply && (
                                                    <div className="teacher-profile-modal__review-reply">
                                                        <strong>
                                                            Ответ преподавателя
                                                        </strong>
                                                        <p>
                                                            {review.teacher_reply}
                                                        </p>
                                                    </div>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            )}

                            <section className="teacher-profile-modal__request">
                                <h3>Заявка на обучение</h3>

                                {role === 'parent' && (
                                    <label>
                                        <span>Ребёнок</span>
                                        <select
                                            value={selectedStudentId}
                                            onChange={(event) => {
                                                setSelectedStudentId(event.target.value);
                                                setSubmitStatus('idle');
                                                setErrorMessage('');
                                            }}
                                        >
                                            <option value="">Выберите ребёнка</option>
                                            {children.map((child) => (
                                                <option key={child.id} value={child.student_id}>
                                                    {child.full_name}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                )}

                                <label>
                                    <span>Предмет</span>
                                    <select
                                        value={selectedSubjectId}
                                        onChange={(event) => {
                                            setSelectedSubjectId(event.target.value);
                                            setSubmitStatus('idle');
                                            setErrorMessage('');
                                        }}
                                    >
                                        {profile.subjects.map((subject) => (
                                            <option key={subject.id} value={subject.id}>
                                                {subject.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label>
                                    <span>Сообщение преподавателю</span>
                                    <textarea
                                        value={message}
                                        maxLength={1000}
                                        placeholder="Коротко расскажите о цели обучения"
                                        onChange={(event) => setMessage(event.target.value)}
                                    />
                                </label>

                                {hasPendingRequest && (
                                    <p>Заявка по этому предмету уже ожидает ответа.</p>
                                )}

                                {hasActiveTeacher && (
                                    <p>Вы уже занимаетесь с этим преподавателем.</p>
                                )}
                            </section>
                        </>
                    ) : null}
                </div>

                <footer className="teacher-profile-modal__actions">
                    <button
                        type="button"
                        onClick={onClose}
                    >
                        Закрыть
                    </button>

                    <button
                        type="button"
                        className="teacher-profile-modal__primary"
                        disabled={
                            requestStatus !== 'success' ||
                            !selectedSubject ||
                            (role === 'parent' && !selectedStudentId) ||
                            hasPendingRequest ||
                            hasActiveTeacher ||
                            submitStatus === 'loading' ||
                            submitStatus === 'success'
                        }
                        onClick={handleSendRequest}
                    >
                        {hasActiveTeacher
                            ? 'Преподаватель уже выбран'
                            : hasPendingRequest
                                ? 'Заявка уже отправлена'
                                : submitStatus === 'loading'
                                    ? 'Отправляем...'
                                    : submitStatus === 'success'
                            ? 'Заявка отправлена'
                            : 'Подать заявку на обучение'}
                    </button>
                </footer>
            </section>
        </div>
    );
}
