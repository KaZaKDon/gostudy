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

function formatDate(value) {
    if (!value) {
        return '—';
    }

    return new Date(value).toLocaleDateString('ru-RU');
}

export function StudentsRow({
    student,
    isStatusUpdating,
    onOpen,
    onUpdateStatus,
}) {
    function handleToggleStatus() {
        if (isStatusUpdating) {
            return;
        }

        if (student.status === 'blocked') {
            onUpdateStatus({
                id: student.id,
                status: 'active',
                blocked_reason: '',
            });

            return;
        }

        if (!window.confirm('Заблокировать ученика?')) {
            return;
        }

        onUpdateStatus({
            id: student.id,
            status: 'blocked',
            blocked_reason: 'Заблокирован администратором',
        });
    }

    function handleArchive() {
        if (isStatusUpdating || !window.confirm('Переместить ученика в архив?')) {
            return;
        }

        onUpdateStatus({
            id: student.id,
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
            id: student.id,
            status: 'active',
            blocked_reason: '',
            archive_reason: '',
        });
    }

    return (
        <TableRow>
            <TableCell>{student.id}</TableCell>

            <TableCell strong>
                {student.full_name || '—'}
            </TableCell>

            <TableCell>{student.email || '—'}</TableCell>

            <TableCell>{student.phone || '—'}</TableCell>

            <TableCell>
                <Badge variant={statusVariants[student.status] || 'default'}>
                    {statusLabels[student.status] || student.status || '—'}
                </Badge>
            </TableCell>

            <TableCell>{student.goal || '—'}</TableCell>

            <TableCell>{student.active_teachers_total ?? 0}</TableCell>

            <TableCell>{student.lessons_total ?? 0}</TableCell>

            <TableCell>{student.homework_total ?? 0}</TableCell>

            <TableCell>{formatDate(student.created_at)}</TableCell>

            <TableCell>
                <div className="students-row-actions">
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onOpen(student.id)}
                    >
                        Открыть
                    </Button>

                    {student.status !== 'deleted' && (
                        <Button
                            size="sm"
                            variant={student.status === 'blocked' ? 'primary' : 'danger'}
                            loading={isStatusUpdating}
                            onClick={handleToggleStatus}
                        >
                            {student.status === 'blocked' ? 'Разблок.' : 'Блок.'}
                        </Button>
                    )}

                    {student.status !== 'deleted' && (
                        <Button
                            size="sm"
                            variant="secondary"
                            loading={isStatusUpdating}
                            onClick={handleArchive}
                        >
                            Архив
                        </Button>
                    )}

                    {student.status === 'deleted' && (
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