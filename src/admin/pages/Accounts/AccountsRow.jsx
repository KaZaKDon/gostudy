import {
    Badge,
    Button,
    TableCell,
    TableRow,
} from '../../components/ui/index.js';

const roleLabels = {
    student: 'Ученик',
    teacher: 'Преподаватель',
    admin: 'Администратор',
    moderator: 'Модератор',
};

const statusLabels = {
    active: 'Активен',
    blocked: 'Заблокирован',
    deleted: 'Удалён',
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

export function AccountsRow({ account, onOpen }) {
    return (
        <TableRow>
            <TableCell>{account.id}</TableCell>

            <TableCell strong>
                {account.full_name || '—'}
            </TableCell>

            <TableCell>{account.email || '—'}</TableCell>

            <TableCell>{account.phone || '—'}</TableCell>

            <TableCell>
                <Badge>
                    {roleLabels[account.role] || account.role || '—'}
                </Badge>
            </TableCell>

            <TableCell>
                <Badge variant={statusVariants[account.status] || 'default'}>
                    {statusLabels[account.status] || account.status || '—'}
                </Badge>
            </TableCell>

            <TableCell>{formatDate(account.last_login_at)}</TableCell>

            <TableCell>{formatDate(account.created_at)}</TableCell>

            <TableCell>
                <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onOpen(account.id)}
                >
                    Открыть
                </Button>
            </TableCell>
        </TableRow>
    );
}