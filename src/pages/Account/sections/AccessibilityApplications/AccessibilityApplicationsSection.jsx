import { useMemo, useState } from 'react';

import { useAccessibilityApplications } from './useAccessibilityApplications.js';
import './AccessibilityApplicationsSection.css';

const STATUS_LABELS = {
    pending: 'Ожидает решения',
    accepted: 'Ждём подтверждения семьи',
    rejected: 'Отклонена',
    confirmed: 'Подтверждена',
    expired: 'Срок подтверждения истёк',
    withdrawn: 'Отозвана',
};

const TYPE_LABELS = {
    free: 'Бесплатное обучение',
    discount: 'Обучение со скидкой',
    individual: 'Индивидуальные условия',
};

const FILTERS = [
    { id: 'pending', label: 'Новые' },
    { id: 'accepted', label: 'Ожидают семью' },
    { id: 'confirmed', label: 'Подтверждённые' },
    { id: 'closed', label: 'Завершённые' },
    { id: 'all', label: 'Все' },
];

function matchesFilter(application, filter) {
    if (filter === 'all') return true;
    if (filter === 'closed') {
        return ['rejected', 'expired', 'withdrawn'].includes(application.status);
    }
    return application.status === filter;
}

function formatDate(value) {
    return value
        ? new Intl.DateTimeFormat('ru-RU', {
            dateStyle: 'short',
            timeStyle: 'short',
        }).format(new Date(value))
        : '—';
}

function ApplicationCard({ application, isSaving, onRespond }) {
    const [comment, setComment] = useState('');
    const terms = application.terms || {};

    return (
        <article className="program-application-card">
            <header>
                <div>
                    <span>Заявка №{application.id} · {formatDate(application.created_at)}</span>
                    <h3>{application.student_name}</h3>
                    <p>
                        {application.subject_name}
                        {' · '}
                        {application.submitted_by_role === 'parent'
                            ? `родитель: ${application.submitted_by_name || 'не указан'}`
                            : 'от ученика'}
                    </p>
                </div>
                <strong className={`is-${application.status}`}>
                    {STATUS_LABELS[application.status] || application.status}
                </strong>
            </header>

            <div className="program-application-card__terms">
                <div>
                    <span>Вариант</span>
                    <strong>{TYPE_LABELS[application.offer_type]}</strong>
                </div>
                <div>
                    <span>Срок</span>
                    <strong>{terms.default_duration_months ? `${terms.default_duration_months} мес.` : 'Без ограничения'}</strong>
                </div>
                {terms.discount_percent && (
                    <div>
                        <span>Скидка</span>
                        <strong>{terms.discount_percent}%</strong>
                    </div>
                )}
            </div>

            <section>
                <span>Пояснение семьи</span>
                <p>{application.message || 'Пояснение не добавлено.'}</p>
            </section>

            {application.teacher_comment && (
                <section>
                    <span>Ваш комментарий</span>
                    <p>{application.teacher_comment}</p>
                </section>
            )}

            {application.status === 'accepted' && (
                <p className="program-application-card__deadline">
                    Семья должна подтвердить условия до {formatDate(application.confirmation_expires_at)}.
                </p>
            )}

            {application.status === 'pending' && (
                <div className="program-application-card__decision">
                    <label>
                        <span>Комментарий семье</span>
                        <textarea
                            rows="3"
                            maxLength="1000"
                            value={comment}
                            placeholder="Можно пояснить решение или дальнейшие шаги"
                            onChange={(event) => setComment(event.target.value)}
                        />
                    </label>
                    <div>
                        <button
                            type="button"
                            className="is-secondary"
                            disabled={isSaving}
                            onClick={() => onRespond(application.id, 'rejected', comment.trim())}
                        >
                            Отклонить
                        </button>
                        <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => onRespond(application.id, 'accepted', comment.trim())}
                        >
                            {isSaving ? 'Сохраняем...' : 'Принять заявку'}
                        </button>
                    </div>
                </div>
            )}
        </article>
    );
}

export function AccessibilityApplicationsSection({ embedded = false }) {
    const controller = useAccessibilityApplications(true);
    const [filter, setFilter] = useState('pending');
    const displayed = useMemo(
        () => controller.applications.filter(
            (application) => matchesFilter(application, filter),
        ),
        [controller.applications, filter],
    );
    const counts = useMemo(() => Object.fromEntries(
        FILTERS.map((item) => [
            item.id,
            controller.applications.filter(
                (application) => matchesFilter(application, item.id),
            ).length,
        ]),
    ), [controller.applications]);

    return (
        <section className={embedded ? 'program-applications program-applications--embedded' : 'program-applications'}>
            <header className="program-applications__header">
                <div>
                    {!embedded && <span>Доступное образование</span>}
                    {!embedded && <h2>Заявки программы</h2>}
                    <p>Рассматривайте обращения семей отдельно от настройки публичных условий.</p>
                </div>
                <button type="button" onClick={() => controller.refresh()}>
                    Обновить
                </button>
            </header>

            <nav className="program-applications__tabs" aria-label="Статусы заявок">
                {FILTERS.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        className={filter === item.id ? 'is-active' : ''}
                        onClick={() => setFilter(item.id)}
                    >
                        {item.label} <span>{counts[item.id]}</span>
                    </button>
                ))}
            </nav>

            {controller.error && <p className="program-applications__error">{controller.error}</p>}
            {controller.notice && <p className="program-applications__notice">{controller.notice}</p>}

            {controller.status === 'loading' ? (
                <div className="program-applications__empty">Загружаем заявки...</div>
            ) : displayed.length ? (
                <div className="program-applications__list">
                    {displayed.map((application) => (
                        <ApplicationCard
                            key={application.id}
                            application={application}
                            isSaving={controller.savingId === application.id}
                            onRespond={controller.respond}
                        />
                    ))}
                </div>
            ) : (
                <div className="program-applications__empty">
                    В этом разделе заявок пока нет.
                </div>
            )}
        </section>
    );
}
