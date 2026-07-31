import {
    Badge,
    Button,
    TableCell,
    TableRow,
} from '../../components/ui/index.js';

const statusLabels = {
    none: 'Нет ответа',
    pending: 'На модерации',
    approved: 'Одобрено',
    rejected: 'Отклонено',
};

const statusVariants = {
    none: 'default',
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
};

function formatDate(value) {
    if (!value) {
        return '—';
    }

    return new Date(String(value).replace(' ', 'T'))
        .toLocaleString('ru-RU');
}

export function ReviewsRow({ review, onOpen }) {
    return (
        <TableRow>
            <TableCell>{review.id}</TableCell>

            <TableCell strong>
                {review.student_name || '—'}
            </TableCell>

            <TableCell>
                {review.teacher_name || '—'}
            </TableCell>

            <TableCell>
                {review.subject_name || '—'}
            </TableCell>

            <TableCell>
                <Badge
                    variant={
                        statusVariants[review.status] || 'default'
                    }
                >
                    {statusLabels[review.status] || review.status}
                </Badge>
            </TableCell>

            <TableCell>
                <Badge
                    variant={
                        statusVariants[review.reply_status]
                        || 'default'
                    }
                >
                    {statusLabels[review.reply_status]
                        || review.reply_status}
                </Badge>
            </TableCell>

            <TableCell>{formatDate(review.updated_at)}</TableCell>

            <TableCell>
                <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onOpen(review)}
                >
                    Открыть
                </Button>
            </TableCell>
        </TableRow>
    );
}
