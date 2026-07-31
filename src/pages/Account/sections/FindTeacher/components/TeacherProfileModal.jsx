import {
    useEffect,
    useMemo,
    useState,
} from 'react';

import { API } from '../../../../../api/api.js';
import { apiRequest } from '../../../../../api/apiRequest.js';

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

export function TeacherProfileModal({
    teacher,
    onRequestSent,
    onClose,
}) {
    const [profile, setProfile] = useState(null);
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [message, setMessage] = useState('');
    const [requestStatus, setRequestStatus] = useState('loading');
    const [submitStatus, setSubmitStatus] = useState('idle');
    const [errorMessage, setErrorMessage] = useState('');

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
    }, [teacher]);

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
                    message: message.trim(),
                },
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
                            ★ {Number(displayTeacher.rating || 0).toFixed(1)}
                            {' · '}
                            {displayTeacher.reviews_count ?? teacher.reviewsCount}
                            {' отзывов'}
                        </strong>

                        {displayTeacher.is_verified && (
                            <em>Проверен GoStudy</em>
                        )}
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

                            {formats.length > 0 && (
                                <section>
                                    <h3>Форматы занятий</h3>
                                    <div className="teacher-profile-modal__chips">
                                        {formats.map((format) => (
                                            <span key={format.duration}>
                                                {format.duration} минут
                                                {' — '}
                                                {format.price} ₽
                                            </span>
                                        ))}
                                    </div>
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

                                <label>
                                    <span>Предмет</span>
                                    <select
                                        value={selectedSubjectId}
                                        onChange={(event) =>
                                            setSelectedSubjectId(event.target.value)
                                        }
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
