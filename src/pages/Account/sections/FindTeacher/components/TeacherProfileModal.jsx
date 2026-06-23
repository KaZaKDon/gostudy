import { useState } from 'react';

export function TeacherProfileModal({
    teacher,
    onSendTeacherRequest,
    onClose,
}) {
    const [isRequestSent, setIsRequestSent] = useState(false);
    const [isContactStarted, setIsContactStarted] = useState(false);

    if (!teacher) return null;

    const handleContact = () => {
        setIsContactStarted(true);
    };

    const handleSendRequest = () => {
        onSendTeacherRequest?.(teacher);
        setIsRequestSent(true);
    };

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
                        {teacher.name
                            .split(' ')
                            .map((part) => part[0])
                            .join('')
                            .slice(0, 2)}
                    </div>

                    <div className="teacher-profile-modal__title">
                        <span>Публичная анкета</span>

                        <h2>{teacher.name}</h2>

                        <p>
                            {teacher.subject}
                            {' · '}
                            {teacher.experience}
                            {' · '}
                            {teacher.price}
                        </p>

                        <strong>
                            ★ {teacher.rating} · {teacher.reviewsCount} отзывов
                        </strong>

                        {teacher.isPromoted && (
                            <em>Рекомендуемый преподаватель</em>
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
                    {(isContactStarted || isRequestSent) && (
                        <section className="teacher-profile-modal__notice">
                            {isRequestSent ? (
                                <>
                                    <h3>Заявка отправлена</h3>
                                    <p>
                                        Заявка появится в разделе
                                        «Мои преподаватели» во вкладке
                                        «Заявки». Преподаватель сможет принять
                                        или отклонить её после общения.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <h3>Диалог создан</h3>
                                    <p>
                                        В реальной версии здесь откроется
                                        переписка с преподавателем. После
                                        общения ученик сможет подать заявку
                                        на обучение.
                                    </p>
                                </>
                            )}
                        </section>
                    )}

                    <section>
                        <h3>О преподавателе</h3>
                        <p>{teacher.about}</p>
                    </section>

                    <section>
                        <h3>Форматы занятий</h3>

                        <div className="teacher-profile-modal__chips">
                            {teacher.formats.map((format) => (
                                <span key={format}>{format}</span>
                            ))}
                        </div>
                    </section>

                    <section>
                        <h3>Документы</h3>

                        <ul>
                            {teacher.documents.map((document) => (
                                <li key={document}>{document}</li>
                            ))}
                        </ul>
                    </section>

                    <section>
                        <h3>Сертификаты</h3>

                        <ul>
                            {teacher.certificates.map((certificate) => (
                                <li key={certificate}>{certificate}</li>
                            ))}
                        </ul>
                    </section>

                    <section>
                        <h3>Отзывы</h3>

                        <ul>
                            {teacher.reviews.map((review) => (
                                <li key={review}>{review}</li>
                            ))}
                        </ul>
                    </section>
                </div>

                <footer className="teacher-profile-modal__actions">
                    <button
                        type="button"
                        onClick={handleContact}
                    >
                        {isContactStarted ? 'Диалог создан' : 'Связаться'}
                    </button>

                    <button
                        type="button"
                        className="teacher-profile-modal__primary"
                        disabled={isRequestSent}
                        onClick={handleSendRequest}
                    >
                        {isRequestSent
                            ? 'Заявка отправлена'
                            : 'Подать заявку на обучение'}
                    </button>
                </footer>
            </section>
        </div>
    );
}