import { useState } from 'react';

import {
    Badge,
    Button,
    EmptyState,
    Input,
    Loader,
    Modal,
    Pagination,
    Select,
} from '../../components/ui/index.js';
import { useAdminAccessibility } from '../../hooks/useAdminAccessibility.js';

import './accessibility-offers.css';

const TYPE_LABELS = {
    free: 'Бесплатно',
    discount: 'Со скидкой',
    individual: 'Индивидуальные условия',
};
const STATUS_LABELS = {
    pending: 'На модерации',
    approved: 'Опубликовано',
    rejected: 'Отклонено',
    archived: 'Закрыто',
};
const STATUS_VARIANTS = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
    archived: 'default',
};
const STATUS_OPTIONS = [
    { value: '', label: 'Все статусы' },
    { value: 'pending', label: 'На модерации' },
    { value: 'approved', label: 'Опубликованные' },
    { value: 'rejected', label: 'Отклонённые' },
    { value: 'archived', label: 'Закрытые' },
];
const TYPE_OPTIONS = [
    { value: '', label: 'Все варианты' },
    { value: 'free', label: 'Бесплатно' },
    { value: 'discount', label: 'Со скидкой' },
    { value: 'individual', label: 'Индивидуальные условия' },
];

function formatDate(value) {
    return value
        ? new Intl.DateTimeFormat('ru-RU', {
            dateStyle: 'short',
            timeStyle: 'short',
        }).format(new Date(value))
        : '—';
}

function OfferModal({ offer, isSaving, error, onClose, onModerate }) {
    const [comment, setComment] = useState('');
    const [validationError, setValidationError] = useState('');

    if (!offer) return null;

    async function decide(decision) {
        const reason = comment.trim();
        if (decision === 'rejected' && !reason) {
            setValidationError('Укажите причину отклонения');
            return;
        }
        setValidationError('');
        await onModerate(decision, reason);
    }

    const footer = offer.status === 'pending' ? (
        <>
            <Button
                variant="danger"
                loading={isSaving}
                onClick={() => decide('rejected')}
            >
                Отклонить
            </Button>
            <Button
                variant="primary"
                loading={isSaving}
                onClick={() => decide('approved')}
            >
                Опубликовать
            </Button>
        </>
    ) : null;

    return (
        <Modal
            isOpen
            title={`Предложение №${offer.id}`}
            description={`${offer.teacher_name} · ${TYPE_LABELS[offer.offer_type]}`}
            footer={footer}
            onClose={onClose}
        >
            <div className="accessibility-review">
                <div className="accessibility-review__grid">
                    <div><span>Преподаватель</span><strong>{offer.teacher_name}</strong><small>{offer.teacher_email}</small></div>
                    <div><span>Статус</span><Badge variant={STATUS_VARIANTS[offer.status] || 'default'}>{STATUS_LABELS[offer.status] || offer.status}</Badge></div>
                    <div><span>Предметы</span><strong>{offer.subjects.map((subject) => subject.name).join(', ')}</strong></div>
                    <div><span>Количество мест</span><strong>{offer.slots}</strong></div>
                    <div><span>Скидка</span><strong>{offer.discount_percent ? `${offer.discount_percent}%` : '—'}</strong></div>
                    <div><span>Срок</span><strong>{offer.default_duration_months ? `${offer.default_duration_months} мес.` : 'Без ограничения'}</strong></div>
                </div>

                <section className="accessibility-review__terms">
                    <span>Описание условий</span>
                    <p>{offer.comment || 'Преподаватель не добавил описание.'}</p>
                </section>

                {offer.supersedes && (
                    <p className="accessibility-review__note">
                        До решения действует опубликованная редакция №{offer.supersedes.id}.
                    </p>
                )}

                {offer.moderation_comment && (
                    <section className="accessibility-review__terms">
                        <span>Комментарий модератора</span>
                        <p>{offer.moderation_comment}</p>
                    </section>
                )}

                {offer.status === 'pending' && (
                    <Input
                        multiline
                        rows={4}
                        label="Комментарий модератора"
                        value={comment}
                        maxLength="3000"
                        helperText="При отклонении причина обязательна."
                        onChange={(event) => setComment(event.target.value)}
                    />
                )}

                {(validationError || error) && (
                    <div className="admin-alert">{validationError || error}</div>
                )}
            </div>
        </Modal>
    );
}

export function AccessibilityOffersPage() {
    const controller = useAdminAccessibility();

    function changeFilter(name, value) {
        controller.updateFilters({ ...controller.filters, [name]: value });
    }

    return (
        <div className="admin-page accessibility-admin-page">
            <header className="accessibility-admin-page__header">
                <div>
                    <span>Модерация программы</span>
                    <h1>Доступное образование</h1>
                    <p>Проверка условий, которые преподаватели предлагают семьям.</p>
                </div>
                <Button variant="secondary" onClick={() => controller.refresh()}>
                    Обновить
                </Button>
            </header>

            <section className="accessibility-admin-page__filters">
                <Input
                    label="Поиск"
                    type="search"
                    placeholder="Преподаватель, email, предмет или ID"
                    value={controller.filters.q}
                    onChange={(event) => changeFilter('q', event.target.value)}
                />
                <Select
                    label="Статус"
                    value={controller.filters.status}
                    options={STATUS_OPTIONS}
                    onChange={(event) => changeFilter('status', event.target.value)}
                />
                <Select
                    label="Вариант"
                    value={controller.filters.offer_type}
                    options={TYPE_OPTIONS}
                    onChange={(event) => changeFilter('offer_type', event.target.value)}
                />
            </section>

            {controller.error && <div className="admin-alert">{controller.error}</div>}
            {controller.notice && <div className="admin-alert accessibility-admin-page__success">{controller.notice}</div>}

            {controller.isLoading ? (
                <Loader label="Загружаем предложения..." />
            ) : controller.offers.length === 0 ? (
                <EmptyState
                    title="Предложений не найдено"
                    description="Измените фильтры или дождитесь новой отправки преподавателя."
                />
            ) : (
                <div className="accessibility-admin-list">
                    {controller.offers.map((offer) => (
                        <article className="accessibility-admin-card" key={offer.id}>
                            <div>
                                <span>№{offer.id} · {formatDate(offer.updated_at)}</span>
                                <h2>{offer.teacher_name}</h2>
                                <p>{offer.subjects.map((subject) => subject.name).join(', ')}</p>
                            </div>
                            <strong>{TYPE_LABELS[offer.offer_type]}</strong>
                            <small>{offer.slots} мест{offer.discount_percent ? ` · скидка ${offer.discount_percent}%` : ''}</small>
                            <Badge variant={STATUS_VARIANTS[offer.status] || 'default'}>
                                {STATUS_LABELS[offer.status] || offer.status}
                            </Badge>
                            <Button size="sm" variant="secondary" onClick={() => controller.openOffer(offer)}>
                                Открыть
                            </Button>
                        </article>
                    ))}
                </div>
            )}

            <Pagination
                page={controller.pagination.page}
                pages={controller.pagination.pages}
                total={controller.pagination.total}
                onPageChange={controller.changePage}
            />

            <OfferModal
                key={controller.selectedOffer?.id || 'closed'}
                offer={controller.selectedOffer}
                isSaving={controller.isSaving}
                error={controller.moderationError}
                onClose={controller.closeOffer}
                onModerate={controller.moderate}
            />
        </div>
    );
}
