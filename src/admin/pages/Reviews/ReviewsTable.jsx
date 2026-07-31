import {
    EmptyState,
    Loader,
    Table,
} from '../../components/ui/index.js';

import { ReviewsRow } from './ReviewsRow.jsx';

const columns = [
    { key: 'id', label: 'ID', width: '70px' },
    { key: 'student', label: 'Ученик' },
    { key: 'teacher', label: 'Преподаватель' },
    { key: 'subject', label: 'Предмет' },
    { key: 'review_status', label: 'Отзыв' },
    { key: 'reply_status', label: 'Ответ' },
    { key: 'updated_at', label: 'Изменён' },
    { key: 'actions', label: 'Действие', width: '120px' },
];

export function ReviewsTable({
    reviews,
    isLoading,
    onOpenReview,
}) {
    if (isLoading) {
        return <Loader text="Загрузка отзывов..." />;
    }

    if (!reviews.length) {
        return (
            <EmptyState
                title="Отзывы не найдены"
                description="В выбранной очереди публикаций нет."
            />
        );
    }

    return (
        <Table columns={columns} minWidth={1080}>
            {reviews.map((review) => (
                <ReviewsRow
                    key={review.id}
                    review={review}
                    onOpen={onOpenReview}
                />
            ))}
        </Table>
    );
}
