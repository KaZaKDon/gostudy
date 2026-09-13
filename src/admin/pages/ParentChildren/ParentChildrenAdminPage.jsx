import {
    Badge,
    Button,
    EmptyState,
    Input,
    Loader,
    Pagination,
    Select,
} from '../../components/ui/index.js';
import { useAdminParentChildren } from '../../hooks/useAdminParentChildren.js';
import { ParentChildReviewModal } from './ParentChildReviewModal.jsx';

import './parent-children-admin.css';

const STATUS_OPTIONS = [
    { value: '', label: 'Все статусы' },
    { value: 'pending', label: 'Ожидают проверки' },
    { value: 'verified', label: 'Подтверждённые' },
    { value: 'rejected', label: 'Отклонённые' },
];
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
    return new Intl.DateTimeFormat('ru-RU').format(new Date(value));
}

export function ParentChildrenAdminPage() {
    const controller = useAdminParentChildren();

    return (
        <div className="admin-page parent-children-admin-page">
            <header className="parent-children-admin-page__header">
                <div>
                    <span>Семья и безопасность</span>
                    <h1>Карточки детей</h1>
                    <p>Проверка данных ребёнка и полномочий представителя.</p>
                </div>
                <Button variant="secondary" onClick={controller.refresh}>Обновить</Button>
            </header>

            <section className="parent-children-admin-page__filters">
                <Input
                    label="Поиск"
                    placeholder="Ребёнок, родитель, email или ID"
                    value={controller.filters.q}
                    onChange={(event) => controller.updateFilters({
                        ...controller.filters,
                        q: event.target.value,
                    })}
                />
                <Select
                    label="Статус"
                    options={STATUS_OPTIONS}
                    value={controller.filters.status}
                    onChange={(event) => controller.updateFilters({
                        ...controller.filters,
                        status: event.target.value,
                    })}
                />
            </section>

            {controller.error && <div className="admin-alert">{controller.error}</div>}
            {controller.successMessage && (
                <div className="admin-alert parent-children-admin-page__success">
                    {controller.successMessage}
                </div>
            )}

            {controller.isLoading ? (
                <Loader label="Загружаем карточки детей..." />
            ) : controller.children.length === 0 ? (
                <EmptyState
                    title="Карточек не найдено"
                    description="Измените фильтры или дождитесь новой заявки родителя."
                />
            ) : (
                <div className="parent-children-admin-list">
                    {controller.children.map((child) => (
                        <article className="parent-children-admin-card" key={child.id}>
                            <div>
                                <span>Ребёнок · №{child.id}</span>
                                <h2>{child.full_name}</h2>
                                <p>{formatDate(child.birth_date)} · {child.class_level || 'Уровень не указан'} · {child.city || 'Город не указан'}</p>
                            </div>
                            <div>
                                <span>Представитель</span>
                                <strong>{child.parent?.full_name || '—'}</strong>
                                <small>{child.parent?.email || '—'}</small>
                            </div>
                            <Badge variant={STATUS_VARIANTS[child.verification_status] || 'default'}>
                                {STATUS_LABELS[child.verification_status] || child.verification_status}
                            </Badge>
                            <Button size="sm" variant="secondary" onClick={() => controller.openChild(child)}>
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

            <ParentChildReviewModal
                key={controller.selectedChild?.id || 'closed'}
                child={controller.selectedChild}
                isSaving={controller.isSaving}
                error={controller.reviewError}
                onClose={controller.closeChild}
                onReview={controller.review}
            />
        </div>
    );
}
