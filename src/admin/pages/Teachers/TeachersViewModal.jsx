import {
    Badge,
    Button,
    Loader,
    Modal,
} from '../../components/ui/index.js';
import { TeacherProfileDetails } from './TeacherProfileDetails.jsx';
import {
    teacherStatusLabels,
    teacherStatusVariants,
    verificationLabels,
    verificationVariants,
} from './teacherPresentation.js';

export function TeachersViewModal({
    teacherData,
    isLoading,
    isStatusUpdating,
    isVerificationUpdating,
    isVisibilityUpdating,
    error,
    onClose,
    onUpdateStatus,
    onUpdateVerification,
    onUpdateVisibility,
    canManageAccounts,
}) {
    const teacher = teacherData?.teacher;
    const isArchived = teacher?.status === 'archived'
        || teacher?.status === 'deleted';

    function rejectProfile() {
        const comment = window.prompt(
            'Укажите, что преподавателю необходимо исправить',
            teacher.verification_comment || '',
        );

        if (comment === null) {
            return;
        }

        onUpdateVerification({
            id: teacher.id,
            status: 'rejected',
            comment: comment.trim(),
        });
    }

    return (
        <Modal
            isOpen={Boolean(isLoading || error || teacher)}
            title="Карточка преподавателя"
            description="Аккаунт, полная анкета и модерация"
            onClose={onClose}
        >
            {isLoading && <Loader text="Загрузка преподавателя..." />}

            {error && <div className="admin-alert">{error}</div>}

            {!isLoading && teacher && (
                <div className="teacher-view">
                    <div className="teacher-view__head">
                        <div>
                            <h3>{teacher.full_name || 'Без имени'}</h3>
                            <p>{teacher.email || '—'}</p>
                        </div>

                        <div className="teacher-view__badges">
                            <Badge
                                variant={
                                    teacherStatusVariants[teacher.status]
                                    || 'default'
                                }
                            >
                                {teacherStatusLabels[teacher.status]
                                    || teacher.status
                                    || '—'}
                            </Badge>
                            <Badge
                                variant={
                                    verificationVariants[
                                        teacher.verification_status
                                    ] || 'default'
                                }
                            >
                                {verificationLabels[
                                    teacher.verification_status
                                ] || 'Профиль не создан'}
                            </Badge>
                        </div>
                    </div>

                    {!teacher.profile_id && (
                        <div className="admin-alert">
                            Профиль преподавателя ещё не заполнен.
                        </div>
                    )}

                    <TeacherProfileDetails teacherData={teacherData} />

                    <section className="teacher-view__section">
                        <h4>Документы</h4>
                        <p className="teacher-view__muted">
                            Загрузка и защищённая проверка файлов будут
                            подключены вместе с переносом медиахранилища на
                            российский сервер.
                        </p>
                    </section>

                    {canManageAccounts && (
                        <div className="teacher-view__actions">
                            {!isArchived && (
                                <Button
                                    variant={
                                        teacher.status === 'blocked'
                                            ? 'primary'
                                            : 'danger'
                                    }
                                    loading={isStatusUpdating}
                                    onClick={() => onUpdateStatus({
                                        id: teacher.id,
                                        status: teacher.status === 'blocked'
                                            ? 'active'
                                            : 'blocked',
                                        blocked_reason:
                                            teacher.status === 'blocked'
                                                ? ''
                                                : 'Заблокирован администратором',
                                    })}
                                >
                                    {teacher.status === 'blocked'
                                        ? 'Разблокировать'
                                        : 'Заблокировать'}
                                </Button>
                            )}

                            {!isArchived && (
                                <Button
                                    variant="secondary"
                                    loading={isStatusUpdating}
                                    onClick={() => onUpdateStatus({
                                        id: teacher.id,
                                        status: 'archived',
                                        archive_reason:
                                            'Архивирован администратором',
                                    })}
                                >
                                    В архив
                                </Button>
                            )}

                            {isArchived && (
                                <Button
                                    variant="primary"
                                    loading={isStatusUpdating}
                                    onClick={() => onUpdateStatus({
                                        id: teacher.id,
                                        status: 'active',
                                    })}
                                >
                                    Восстановить
                                </Button>
                            )}
                        </div>
                    )}

                    {teacher.profile_id && (
                        <div className="teacher-view__actions">
                            {teacher.verification_status !== 'verified' && (
                                <Button
                                    variant="primary"
                                    loading={isVerificationUpdating}
                                    onClick={() => onUpdateVerification({
                                        id: teacher.id,
                                        status: 'verified',
                                        comment: '',
                                    })}
                                >
                                    Подтвердить и опубликовать
                                </Button>
                            )}

                            <Button
                                variant="secondary"
                                loading={isVerificationUpdating}
                                onClick={rejectProfile}
                            >
                                Вернуть на доработку
                            </Button>

                            {teacher.verification_status === 'verified' && (
                                <Button
                                    variant="secondary"
                                    loading={isVisibilityUpdating}
                                    onClick={() => onUpdateVisibility({
                                        id: teacher.id,
                                        is_visible: !teacher.is_visible,
                                    })}
                                >
                                    {teacher.is_visible
                                        ? 'Скрыть из поиска'
                                        : 'Опубликовать в поиске'}
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
}
