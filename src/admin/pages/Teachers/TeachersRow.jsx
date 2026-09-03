import {
    Badge,
    Button,
    TableCell,
    TableRow,
} from '../../components/ui/index.js';
import {
    teacherStatusLabels,
    teacherStatusVariants,
    verificationLabels,
    verificationVariants,
} from './teacherPresentation.js';

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
    canManageAccounts,
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
            status: 'archived',
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
                <Badge variant={teacherStatusVariants[teacher.status] || 'default'}>
                    {teacherStatusLabels[teacher.status] || teacher.status || '—'}
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

                    {canManageAccounts && teacher.status !== 'archived' && teacher.status !== 'deleted' && (
                        <Button
                            size="sm"
                            variant={teacher.status === 'blocked' ? 'primary' : 'danger'}
                            loading={isStatusUpdating}
                            onClick={handleToggleStatus}
                        >
                            {teacher.status === 'blocked' ? 'Разблок.' : 'Блок.'}
                        </Button>
                    )}

                    {canManageAccounts && teacher.status !== 'archived' && teacher.status !== 'deleted' && (
                        <Button
                            size="sm"
                            variant="secondary"
                            loading={isStatusUpdating}
                            onClick={handleArchive}
                        >
                            Архив
                        </Button>
                    )}

                    {canManageAccounts && (teacher.status === 'archived' || teacher.status === 'deleted') && (
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
