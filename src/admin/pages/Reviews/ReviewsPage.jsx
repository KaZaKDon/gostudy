import { Pagination } from '../../components/ui/index.js';
import { useAdminReviews } from '../../hooks/useAdminReviews.js';

import { ReviewModerationModal } from './ReviewModerationModal.jsx';
import { ReviewsTable } from './ReviewsTable.jsx';
import { ReviewsToolbar } from './ReviewsToolbar.jsx';

import './reviews.css';

export function ReviewsPage() {
    const controller = useAdminReviews();

    return (
        <div className="admin-page reviews-admin-page">
            <ReviewsToolbar
                filters={controller.filters}
                onFiltersChange={controller.updateFilters}
                onResetFilters={controller.resetFilters}
                onRefresh={controller.refresh}
            />

            {controller.error && (
                <div className="admin-alert">
                    {controller.error}
                </div>
            )}

            {controller.successMessage && (
                <div className="admin-alert reviews-admin-page__success">
                    {controller.successMessage}
                </div>
            )}

            <ReviewsTable
                reviews={controller.reviews}
                isLoading={controller.isLoading}
                onOpenReview={controller.openReview}
            />

            <Pagination
                page={controller.pagination.page}
                pages={controller.pagination.pages}
                total={controller.pagination.total}
                onPageChange={controller.changePage}
            />

            <ReviewModerationModal
                key={controller.selectedReview?.id ?? 'closed'}
                review={controller.selectedReview}
                isModerating={controller.isModerating}
                error={controller.moderationError}
                onClose={controller.closeReview}
                onModerate={controller.moderateReview}
            />
        </div>
    );
}
