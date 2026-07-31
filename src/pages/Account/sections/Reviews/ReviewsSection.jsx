import { useMemo, useState } from 'react';

import { ReviewModal } from './components/ReviewModal.jsx';
import { StudentReviews } from './components/StudentReviews.jsx';
import { TeacherReviews } from './components/TeacherReviews.jsx';
import { useReviews } from './useReviews.js';

import './ReviewsSection.css';

const RELATION_STATUS_TABS = [
    {
        id: 'active',
        label: 'Активные',
    },
    {
        id: 'archived',
        label: 'Завершённые',
    },
];

export function ReviewsSection({
    role,
    onFindTeacher,
}) {
    const isTeacher = role === 'teacher';
    const [activeStatus, setActiveStatus] = useState('active');
    const [selectedReview, setSelectedReview] = useState(null);
    const controller = useReviews(role);

    const relations = useMemo(
        () => controller.items.filter(
            (item) => item.relation_status === activeStatus,
        ),
        [activeStatus, controller.items],
    );

    async function handleSubmit(payload) {
        const saved = isTeacher
            ? await controller.saveReply(payload)
            : await controller.saveReview(payload);

        if (saved) {
            setSelectedReview(null);
        }
    }

    function handleOpenReview(review) {
        controller.clearMessages();
        setSelectedReview(review);
    }

    function handleCloseReview() {
        controller.clearMessages();
        setSelectedReview(null);
    }

    return (
        <section className="reviews-section">
            <header className="reviews-section__header">
                <div>
                    <span>
                        {isTeacher
                            ? 'Отзывы'
                            : 'Мои преподаватели'}
                    </span>

                    <h2>
                        {isTeacher
                            ? 'Отзывы учеников'
                            : 'Преподаватели и отзывы'}
                    </h2>
                </div>

                {!isTeacher && (
                    <div className="reviews-section__status-tabs">
                        {RELATION_STATUS_TABS.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                className={
                                    activeStatus === tab.id
                                        ? 'reviews-section__status-tab reviews-section__status-tab--active'
                                        : 'reviews-section__status-tab'
                                }
                                onClick={() => {
                                    setActiveStatus(tab.id);
                                    setSelectedReview(null);
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                )}
            </header>

            {controller.successMessage && (
                <div className="reviews-section__alert reviews-section__alert--success">
                    {controller.successMessage}
                </div>
            )}

            {controller.errorMessage && !selectedReview && (
                <div className="reviews-section__alert reviews-section__alert--error">
                    {controller.errorMessage}
                </div>
            )}

            {controller.status === 'loading' ? (
                <div className="reviews-list__empty">
                    Загружаем отзывы...
                </div>
            ) : controller.status === 'error' ? (
                <div className="reviews-list__empty">
                    Не удалось загрузить раздел. Обновите страницу.
                </div>
            ) : isTeacher ? (
                <TeacherReviews
                    reviews={controller.items}
                    summary={controller.summary}
                    onOpenReview={handleOpenReview}
                    hasMore={
                        controller.pagination.page
                        < controller.pagination.pages
                    }
                    isLoadingMore={controller.isLoadingMore}
                    onLoadMore={controller.loadMore}
                />
            ) : (
                <StudentReviews
                    relations={relations}
                    activeStatus={activeStatus}
                    onOpenReview={handleOpenReview}
                    onFindTeacher={onFindTeacher}
                />
            )}

            <ReviewModal
                key={selectedReview?.id
                    ?? selectedReview?.relation_id
                    ?? 'closed'}
                role={role}
                review={selectedReview}
                isSaving={controller.isSaving}
                errorMessage={controller.errorMessage}
                onClose={handleCloseReview}
                onSubmit={handleSubmit}
            />
        </section>
    );
}
