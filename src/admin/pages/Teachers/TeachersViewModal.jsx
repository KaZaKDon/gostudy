import {
    Badge,
    Button,
    Loader,
    Modal,
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

function formatDate(value) {
    if (!value) {
        return '—';
    }

    return new Date(value).toLocaleString('ru-RU');
}

function renderValue(value) {
    return value || '—';
}

export function TeachersViewModal({
    teacherData,
    isLoading,
    isStatusUpdating,
    isVerificationUpdating,
    error,
    onClose,
    onUpdateStatus,
    onUpdateVerification,
}) {
    const teacher = teacherData?.teacher;

    return (
        <Modal
            isOpen={Boolean(isLoading || error || teacher)}
            title="Карточка преподавателя"
            description="Аккаунт, профиль и модерация"
            onClose={onClose}
        >
            {isLoading && (
                <Loader text="Загрузка преподавателя..." />
            )}

            {error && (
                <div className="admin-alert">
                    {error}
                </div>
            )}

            {!isLoading && teacher && (
                <div className="teacher-view">
                    <div className="teacher-view__head">
                        <div>
                            <h3>{teacher.full_name || 'Без имени'}</h3>
                            <p>{teacher.email || '—'}</p>
                        </div>

                        <div className="teacher-view__badges">
                            <Badge variant={statusVariants[teacher.status] || 'default'}>
                                {statusLabels[teacher.status] || teacher.status || '—'}
                            </Badge>

                            <Badge variant={verificationVariants[teacher.verification_status] || 'default'}>
                                {verificationLabels[teacher.verification_status] || 'Профиль не создан'}
                            </Badge>
                        </div>
                    </div>

                    {!teacher.profile_id && (
                        <div className="admin-alert">
                            Профиль преподавателя ещё не создан. Доступны только данные аккаунта.
                        </div>
                    )}

                    <section className="teacher-view__section">
                        <h4>Аккаунт</h4>

                        <dl className="teacher-view__list">
                            <div>
                                <dt>ID</dt>
                                <dd>{teacher.id}</dd>
                            </div>

                            <div>
                                <dt>ФИО</dt>
                                <dd>{renderValue(teacher.full_name)}</dd>
                            </div>

                            <div>
                                <dt>Email</dt>
                                <dd>{renderValue(teacher.email)}</dd>
                            </div>

                            <div>
                                <dt>Телефон</dt>
                                <dd>{renderValue(teacher.phone)}</dd>
                            </div>

                            <div>
                                <dt>Статус</dt>
                                <dd>{statusLabels[teacher.status] || teacher.status || '—'}</dd>
                            </div>

                            <div>
                                <dt>Дата регистрации</dt>
                                <dd>{formatDate(teacher.created_at)}</dd>
                            </div>

                            <div>
                                <dt>Последний вход</dt>
                                <dd>{formatDate(teacher.last_login_at)}</dd>
                            </div>
                        </dl>
                    </section>

                    <section className="teacher-view__section">
                        <h4>Профиль</h4>

                        <dl className="teacher-view__list">
                            <div>
                                <dt>ID профиля</dt>
                                <dd>{renderValue(teacher.profile_id)}</dd>
                            </div>

                            <div>
                                <dt>Город</dt>
                                <dd>{renderValue(teacher.city)}</dd>
                            </div>

                            <div>
                                <dt>Заголовок</dt>
                                <dd>{renderValue(teacher.headline)}</dd>
                            </div>

                            <div>
                                <dt>Опыт</dt>
                                <dd>{renderValue(teacher.experience_years)}</dd>
                            </div>

                            <div>
                                <dt>Проверка</dt>
                                <dd>{verificationLabels[teacher.verification_status] || renderValue(teacher.verification_status)}</dd>
                            </div>

                            <div>
                                <dt>Видимость</dt>
                                <dd>
                                    {teacher.is_visible === null
                                        ? '—'
                                        : Number(teacher.is_visible) === 1
                                            ? 'Да'
                                            : 'Нет'}
                                </dd>
                            </div>

                            <div>
                                <dt>Заполненность</dt>
                                <dd>
                                    {teacher.profile_completion === null
                                        ? '—'
                                        : `${teacher.profile_completion}%`}
                                </dd>
                            </div>

                            <div>
                                <dt>Комментарий</dt>
                                <dd>{renderValue(teacher.verification_comment)}</dd>
                            </div>
                        </dl>
                    </section>

                    <div className="teacher-view__actions">
                        {teacher.status !== 'deleted' && (
                            <Button
                                variant={teacher.status === 'blocked' ? 'primary' : 'danger'}
                                loading={isStatusUpdating}
                                onClick={() => {
                                    onUpdateStatus({
                                        id: teacher.id,
                                        status: teacher.status === 'blocked' ? 'active' : 'blocked',
                                        blocked_reason: teacher.status === 'blocked'
                                            ? ''
                                            : 'Заблокирован администратором',
                                    });
                                }}
                            >
                                {teacher.status === 'blocked' ? 'Разблокировать' : 'Заблокировать'}
                            </Button>
                        )}

                        {teacher.status !== 'deleted' && (
                            <Button
                                variant="secondary"
                                loading={isStatusUpdating}
                                onClick={() => {
                                    onUpdateStatus({
                                        id: teacher.id,
                                        status: 'deleted',
                                        blocked_reason: '',
                                        archive_reason: 'Архивирован администратором',
                                    });
                                }}
                            >
                                В архив
                            </Button>
                        )}

                        {teacher.status === 'deleted' && (
                            <Button
                                variant="primary"
                                loading={isStatusUpdating}
                                onClick={() => {
                                    onUpdateStatus({
                                        id: teacher.id,
                                        status: 'active',
                                        blocked_reason: '',
                                        archive_reason: '',
                                    });
                                }}
                            >
                                Восстановить
                            </Button>
                        )}
                    </div>

                    {teacher.profile_id && (
                        <div className="teacher-view__actions">
                            {teacher.verification_status !== 'approved' && (
                                <Button
                                    variant="primary"
                                    loading={isVerificationUpdating}
                                    onClick={() => {
                                        onUpdateVerification({
                                            id: teacher.id,
                                            status: 'approved',
                                            comment: '',
                                        });
                                    }}
                                >
                                    Подтвердить профиль
                                </Button>
                            )}

                            <Button
                                variant="secondary"
                                loading={isVerificationUpdating}
                                onClick={() => {
                                    const comment = window.prompt(
                                        'Комментарий преподавателю',
                                        teacher.verification_comment || '',
                                    );

                                    if (comment === null) {
                                        return;
                                    }

                                    onUpdateVerification({
                                        id: teacher.id,
                                        status: 'rejected',
                                        comment,
                                    });
                                }}
                            >
                                Вернуть на доработку
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
}