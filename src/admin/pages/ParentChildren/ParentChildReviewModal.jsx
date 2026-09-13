import { useState } from 'react';

import {
    Badge,
    Button,
    Input,
    Modal,
} from '../../components/ui/index.js';

const REPRESENTATIVE_LABELS = {
    parent: 'Родитель',
    guardian: 'Опекун',
    trustee: 'Попечитель',
};
const STATUS_LABELS = {
    pending: 'Ожидает проверки',
    verified: 'Подтверждена',
    rejected: 'Отклонена',
};
const STATUS_VARIANTS = {
    pending: 'warning',
    verified: 'success',
    rejected: 'danger',
};

function formatDate(value) {
    if (!value) return '—';
    return new Intl.DateTimeFormat('ru-RU').format(new Date(value));
}

export function ParentChildReviewModal({
    child,
    isSaving,
    error,
    onClose,
    onReview,
}) {
    const [comment, setComment] = useState('');
    const [validationError, setValidationError] = useState('');

    if (!child) return null;

    async function decide(decision) {
        const value = comment.trim();
        if (decision !== 'approved' && !value) {
            setValidationError('Укажите причину или необходимые уточнения');
            return;
        }
        setValidationError('');
        await onReview(decision, value);
    }

    const canReview = child.verification_status === 'pending';
    const footer = canReview ? (
        <>
            <Button
                variant="danger"
                loading={isSaving}
                onClick={() => decide('rejected')}
            >
                Отклонить
            </Button>
            <Button
                variant="secondary"
                loading={isSaving}
                onClick={() => decide('needs_clarification')}
            >
                Запросить уточнение
            </Button>
            <Button
                variant="primary"
                loading={isSaving}
                onClick={() => decide('approved')}
            >
                Подтвердить
            </Button>
        </>
    ) : null;

    return (
        <Modal
            isOpen
            title={`Карточка ребёнка №${child.id}`}
            description={child.full_name}
            footer={footer}
            onClose={onClose}
        >
            <div className="parent-child-review">
                <section className="parent-child-review__grid">
                    <div><span>Дата рождения</span><strong>{formatDate(child.birth_date)}</strong></div>
                    <div><span>Класс / уровень</span><strong>{child.class_level || '—'}</strong></div>
                    <div><span>Город</span><strong>{child.city || '—'}</strong></div>
                    <div><span>Представитель</span><strong>{REPRESENTATIVE_LABELS[child.representative_type] || child.representative_type}</strong></div>
                    <div>
                        <span>Статус</span>
                        <Badge variant={STATUS_VARIANTS[child.verification_status] || 'default'}>
                            {STATUS_LABELS[child.verification_status] || child.verification_status}
                        </Badge>
                    </div>
                    <div><span>Карточка создана</span><strong>{formatDate(child.created_at)}</strong></div>
                </section>

                <section className="parent-child-review__section">
                    <h3>Аккаунт представителя</h3>
                    <p><strong>{child.parent?.full_name || '—'}</strong></p>
                    <p>{child.parent?.email || '—'} · {child.parent?.phone || 'Телефон не указан'}</p>
                    <p>Email {child.parent?.email_verified ? 'подтверждён' : 'не подтверждён'}</p>
                </section>

                <section className="parent-child-review__section">
                    <h3>Согласие</h3>
                    <p>
                        {child.consent?.accepted ? 'Принято' : 'Не принято'}
                        {' · '}
                        {formatDate(child.consent?.accepted_at)}
                    </p>
                </section>

                {child.verification_comment && (
                    <section className="parent-child-review__section">
                        <h3>Комментарий проверки</h3>
                        <p>{child.verification_comment}</p>
                    </section>
                )}

                {canReview && (
                    <Input
                        multiline
                        rows={4}
                        label="Комментарий администратора"
                        value={comment}
                        maxLength={1000}
                        helperText="Обязателен для отклонения и запроса уточнений."
                        error={validationError}
                        onChange={(event) => setComment(event.target.value)}
                    />
                )}

                {error && <div className="admin-alert">{error}</div>}
            </div>
        </Modal>
    );
}
