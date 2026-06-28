import {
    Badge,
    Button,
    Loader,
    Modal,
    Select,
} from '../../components/ui/index.js';

import './accounts.css';

const roleLabels = {
    student: 'Ученик',
    teacher: 'Преподаватель',
    admin: 'Администратор',
    moderator: 'Модератор',
};

const roleOptions = [
    { value: 'student', label: 'Ученик' },
    { value: 'teacher', label: 'Преподаватель' },
    { value: 'moderator', label: 'Модератор' },
    { value: 'admin', label: 'Администратор' },
];

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

export function AccountsViewModal({
    accountData,
    isLoading,
    isStatusUpdating,
    isRoleUpdating,
    error,
    onClose,
    onUpdateStatus,
    onUpdateRole,
}) {
    const user = accountData?.user;

    function getProfilePath() {
        if (!user) {
            return null;
        }

        if (user.role === 'student') {
            return `/admin/students/${user.id}`;
        }

        if (user.role === 'teacher') {
            return `/admin/teachers/${user.id}`;
        }

        return null;
    }

    function handleToggleStatus() {
        if (!user || isStatusUpdating) {
            return;
        }

        if (user.status === 'blocked') {
            onUpdateStatus({
                id: user.id,
                status: 'active',
                blocked_reason: '',
            });

            return;
        }

        onUpdateStatus({
            id: user.id,
            status: 'blocked',
            blocked_reason: 'Заблокирован администратором',
        });
    }

    function handleRoleChange(event) {
        if (!user || isRoleUpdating) {
            return;
        }

        onUpdateRole({
            id: user.id,
            role: event.target.value,
        });
    }

    function handleArchive() {
        if (!user || isStatusUpdating) {
            return;
        }

        onUpdateStatus({
            id: user.id,
            status: 'deleted',
            blocked_reason: '',
            archive_reason: 'Архивирован администратором',
        });
    }

    function handleRestore() {
        if (!user || isStatusUpdating) {
            return;
        }

        onUpdateStatus({
            id: user.id,
            status: 'active',
            blocked_reason: '',
            archive_reason: '',
        });
    }

    const profilePath = getProfilePath();

    return (
        <Modal
            isOpen={Boolean(isLoading || error || user)}
            title="Карточка аккаунта"
            description="Краткая информация и быстрые действия"
            onClose={onClose}
            footer={(
                <>
                    {profilePath && (
                        <Button
                            variant="secondary"
                            onClick={() => {
                                window.location.href = profilePath;
                            }}
                        >
                            Перейти в профиль
                        </Button>
                    )}

                    {user && (
                        <Button
                            variant={user.status === 'blocked' ? 'primary' : 'danger'}
                            loading={isStatusUpdating}
                            onClick={handleToggleStatus}
                        >
                            {user.status === 'blocked' ? 'Разблокировать' : 'Заблокировать'}
                        </Button>
                    )}
                </>
            )}
        >
            {isLoading && (
                <Loader text="Загрузка аккаунта..." />
            )}

            {error && (
                <div className="admin-alert">
                    {error}
                </div>
            )}

            {user && !isLoading && (
                <div className="account-view">
                    <div className="account-view__head">
                        <div>
                            <h3>{user.full_name || 'Без имени'}</h3>
                            <p>{user.email}</p>
                        </div>

                        <div className="account-view__badges">
                            <Badge>
                                {roleLabels[user.role] || user.role}
                            </Badge>

                            <Badge variant={statusVariants[user.status] || 'default'}>
                                {statusLabels[user.status] || user.status}
                            </Badge>
                        </div>
                    </div>

                    <dl className="account-view__list">
                        <div>
                            <dt>Телефон</dt>
                            <dd>{user.phone || '—'}</dd>
                        </div>

                        <div>
                            <dt>Дата регистрации</dt>
                            <dd>{formatDate(user.created_at)}</dd>
                        </div>

                        <div>
                            <dt>Последний вход</dt>
                            <dd>{formatDate(user.last_login_at)}</dd>
                        </div>

                        {user.blocked_reason && (
                            <div>
                                <dt>Причина блокировки</dt>
                                <dd>{user.blocked_reason}</dd>
                            </div>
                        )}
                    </dl>

                    {user && user.status !== 'deleted' && (
                        <Button
                            variant="secondary"
                            loading={isStatusUpdating}
                            onClick={handleArchive}
                        >
                            В архив
                        </Button>
                    )}

                    {user && user.status === 'deleted' && (
                        <Button
                            variant="primary"
                            loading={isStatusUpdating}
                            onClick={handleRestore}
                        >
                            Восстановить
                        </Button>
                    )}

                    <div className="account-view__role">
                        <Select
                            label="Назначить роль"
                            value={user.role}
                            options={roleOptions}
                            disabled={isRoleUpdating}
                            onChange={handleRoleChange}
                        />
                    </div>
                </div>
            )}
        </Modal>
    );
}