import {
    Badge,
    Button,
    TableCell,
    TableRow,
} from '../../components/ui/index.js';

const statusLabels = {
    active: 'Активен',
    blocked: 'Заблокирован',
    deleted: 'Архив',
};

const statusVariants = {
    active: 'success',
    blocked: 'danger',
    deleted: 'info',
};

const verificationLabels = {
    draft: 'Черновик',
    pending: 'На проверке',
    approved: 'Одобрен',
    rejected: 'На доработку',
};

const verificationVariants = {
    draft: 'default',
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
};

function formatRating(value, reviewsCount) {
    const rating = Number(value || 0);

    if (rating <= 0) {
        return '—';
    }

    return `${rating.toFixed(2)} (${reviewsCount || 0})`;
}

export function TeachersRow({
    teacher,
    isStatusUpdating,
    onOpen,
    onUpdateStatus,
}) {
    function handleToggleStatus() {
        if (isStatusUpdating) {
            return;
        }

        if (teacher.status === 'blocked') {
            onUpdateStatus({
                id: teacher.id,
                status: 'active',
                blocked_reason: '',
            });

            return;
        }

        if (!window.confirm('Заблокировать преподавателя?')) {
            return;
        }

        onUpdateStatus({
            id: teacher.id,
            status: 'blocked',
            blocked_reason: 'Заблокирован администратором',
        });
    }

    function handleArchive() {
        if (isStatusUpdating || !window.confirm('Переместить преподавателя в архив?')) {
            return;
        }

        onUpdateStatus({
            id: teacher.id,
            status: 'deleted',
            blocked_reason: '',
            archive_reason: 'Архивирован администратором',
        });
    }

    function handleRestore() {
        if (isStatusUpdating) {
            return;
        }

        onUpdateStatus({
            id: teacher.id,
            status: 'active',
            blocked_reason: '',
            archive_reason: '',
        });
    }

    return (
        <TableRow>
            <TableCell>{teacher.id}</TableCell>

            <TableCell strong>
                {teacher.full_name || '—'}
            </TableCell>

            <TableCell>{teacher.email || '—'}</TableCell>

            <TableCell>{teacher.subjects_text || '—'}</TableCell>

            <TableCell>{teacher.city || '—'}</TableCell>

            <TableCell>
                <Badge variant={statusVariants[teacher.status] || 'default'}>
                    {statusLabels[teacher.status] || teacher.status || '—'}
                </Badge>
            </TableCell>

            <TableCell>
                <Badge variant={verificationVariants[teacher.verification_status] || 'default'}>
                    {verificationLabels[teacher.verification_status] || 'Профиль не создан'}
                </Badge>
            </TableCell>

            <TableCell>
                {teacher.is_visible === null ? '—' : (
                    <Badge variant={Number(teacher.is_visible) === 1 ? 'success' : 'default'}>
                        {Number(teacher.is_visible) === 1 ? 'Да' : 'Нет'}
                    </Badge>
                )}
            </TableCell>

            <TableCell>{formatRating(teacher.rating, teacher.reviews_count)}</TableCell>

            <TableCell>{teacher.active_students_total ?? 0}</TableCell>

            <TableCell>
                <div className="teachers-row-actions">
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onOpen(teacher.id)}
                    >
                        Открыть
                    </Button>

                    {teacher.status !== 'deleted' && (
                        <Button
                            size="sm"
                            variant={teacher.status === 'blocked' ? 'primary' : 'danger'}
                            loading={isStatusUpdating}
                            onClick={handleToggleStatus}
                        >
                            {teacher.status === 'blocked' ? 'Разблок.' : 'Блок.'}
                        </Button>
                    )}

                    {teacher.status !== 'deleted' && (
                        <Button
                            size="sm"
                            variant="secondary"
                            loading={isStatusUpdating}
                            onClick={handleArchive}
                        >
                            Архив
                        </Button>
                    )}

                    {teacher.status === 'deleted' && (
                        <Button
                            size="sm"
                            variant="primary"
                            loading={isStatusUpdating}
                            onClick={handleRestore}
                        >
                            Восст.
                        </Button>
                    )}
                </div>
            </TableCell>
        </TableRow>
    );
}