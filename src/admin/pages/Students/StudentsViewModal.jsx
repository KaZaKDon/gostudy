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

function formatDate(value) {
    if (!value) {
        return '—';
    }

    return new Date(value).toLocaleDateString('ru-RU');
}

function renderValue(value) {
    return value || '—';
}

function InfoList({ items }) {
    return (
        <dl className="student-view__list">
            {items.map((item) => (
                <div key={item.label}>
                    <dt>{item.label}</dt>
                    <dd>{renderValue(item.value)}</dd>
                </div>
            ))}
        </dl>
    );
}

function SimpleCollection({
    title,
    items,
    emptyText,
    renderItem,
}) {
    return (
        <section className="student-view__section">
            <h4>{title}</h4>

            {items.length === 0 ? (
                <p className="student-view__muted">{emptyText}</p>
            ) : (
                <div className="student-view__cards">
                    {items.map(renderItem)}
                </div>
            )}
        </section>
    );
}

export function StudentsViewModal({
    studentData,
    isLoading,
    isStatusUpdating,
    error,
    onClose,
    onUpdateStatus,
}) {
    const student = studentData?.student;
    const stats = studentData?.stats || {};
    const teachers = studentData?.teachers || [];
    const requests = studentData?.requests || [];
    const lessons = studentData?.lessons || [];
    const homework = studentData?.homework || [];

    function handleToggleStatus() {
        if (!student || isStatusUpdating) {
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

        onUpdateStatus({
            id: student.id,
            status: 'blocked',
            blocked_reason: 'Заблокирован администратором',
        });
    }

    function handleArchive() {
        if (!student || isStatusUpdating) {
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
        if (!student || isStatusUpdating) {
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
        <Modal
            isOpen={Boolean(isLoading || error || student)}
            title="Карточка ученика"
            description="Профиль, связи, уроки и домашние задания"
            onClose={onClose}
            footer={(
                <>
                    {student && student.status !== 'deleted' && (
                        <Button
                            variant={student.status === 'blocked' ? 'primary' : 'danger'}
                            loading={isStatusUpdating}
                            onClick={handleToggleStatus}
                        >
                            {student.status === 'blocked' ? 'Разблокировать' : 'Заблокировать'}
                        </Button>
                    )}

                    {student && student.status !== 'deleted' && (
                        <Button
                            variant="secondary"
                            loading={isStatusUpdating}
                            onClick={handleArchive}
                        >
                            В архив
                        </Button>
                    )}

                    {student && student.status === 'deleted' && (
                        <Button
                            variant="primary"
                            loading={isStatusUpdating}
                            onClick={handleRestore}
                        >
                            Восстановить
                        </Button>
                    )}
                </>
            )}
        >
            {isLoading && (
                <Loader text="Загрузка ученика..." />
            )}

            {error && (
                <div className="admin-alert">
                    {error}
                </div>
            )}

            {!isLoading && student && (
                <div className="student-view">
                    <div className="student-view__head">
                        <div>
                            <h3>{student.full_name || 'Без имени'}</h3>
                            <p>{student.email}</p>
                        </div>

                        <Badge variant={statusVariants[student.status] || 'default'}>
                            {statusLabels[student.status] || student.status}
                        </Badge>
                    </div>

                    <div className="student-view__stats">
                        <div>
                            <span>Преподаватели</span>
                            <strong>{stats.teachers_total ?? 0}</strong>
                        </div>

                        <div>
                            <span>Заявки</span>
                            <strong>{stats.requests_total ?? 0}</strong>
                        </div>

                        <div>
                            <span>Уроки</span>
                            <strong>{stats.lessons_total ?? 0}</strong>
                        </div>

                        <div>
                            <span>Домашние</span>
                            <strong>{stats.homework_total ?? 0}</strong>
                        </div>

                        <div>
                            <span>Сообщения</span>
                            <strong>{stats.messages_total ?? 0}</strong>
                        </div>
                    </div>

                    <section className="student-view__section">
                        <h4>Основные данные</h4>

                        <InfoList
                            items={[
                                { label: 'ID', value: student.id },
                                { label: 'Телефон', value: student.phone },
                                { label: 'Год рождения', value: student.birth_year },
                                { label: 'Класс / уровень', value: student.class_level },
                                { label: 'Цель обучения', value: student.goal },
                                { label: 'Описание уровня', value: student.level_description },
                                { label: 'Мессенджер', value: student.messenger },
                                { label: 'Удобное время', value: student.preferred_time },
                                { label: 'Регистрация', value: formatDate(student.created_at) },
                                { label: 'Последний вход', value: formatDate(student.last_login_at) },
                            ]}
                        />
                    </section>

                    <section className="student-view__section">
                        <h4>Родитель / представитель</h4>

                        <InfoList
                            items={[
                                { label: 'Имя', value: student.parent_name },
                                { label: 'Телефон', value: student.parent_phone },
                            ]}
                        />
                    </section>

                    {student.blocked_reason && (
                        <section className="student-view__section">
                            <h4>Причина блокировки</h4>
                            <p className="student-view__text">{student.blocked_reason}</p>
                        </section>
                    )}

                    {student.about && (
                        <section className="student-view__section">
                            <h4>О себе</h4>
                            <p className="student-view__text">{student.about}</p>
                        </section>
                    )}

                    <SimpleCollection
                        title="Преподаватели"
                        items={teachers}
                        emptyText="Активных преподавателей пока нет."
                        renderItem={(teacher) => (
                            <article className="student-view__card" key={teacher.id}>
                                <strong>{teacher.teacher_name || 'Преподаватель'}</strong>
                                <span>{teacher.subject_name || 'Предмет не указан'}</span>
                                <small>{teacher.status || '—'}</small>
                            </article>
                        )}
                    />

                    <SimpleCollection
                        title="Заявки"
                        items={requests}
                        emptyText="Заявок пока нет."
                        renderItem={(request) => (
                            <article className="student-view__card" key={request.id}>
                                <strong>{request.teacher_name || 'Преподаватель'}</strong>
                                <span>{request.subject_name || 'Предмет не указан'}</span>
                                <small>{request.status || '—'} · {formatDate(request.created_at)}</small>
                            </article>
                        )}
                    />

                    <SimpleCollection
                        title="Последние уроки"
                        items={lessons}
                        emptyText="Уроков пока нет."
                        renderItem={(lesson) => (
                            <article className="student-view__card" key={lesson.id}>
                                <strong>{lesson.title || lesson.lesson_topic || 'Урок'}</strong>
                                <span>{lesson.teacher_name || 'Преподаватель'} · {lesson.subject_name || 'Предмет не указан'}</span>
                                <small>{lesson.status || '—'} · {formatDate(lesson.lesson_date)}</small>
                            </article>
                        )}
                    />

                    <SimpleCollection
                        title="Домашние задания"
                        items={homework}
                        emptyText="Домашних заданий пока нет."
                        renderItem={(item) => (
                            <article className="student-view__card" key={item.id}>
                                <strong>{item.title || 'Домашнее задание'}</strong>
                                <span>{item.subject_name || 'Предмет не указан'}</span>
                                <small>
                                    {item.submission_status || item.status || '—'}
                                    {item.grade ? ` · оценка ${item.grade}` : ''}
                                </small>
                            </article>
                        )}
                    />
                </div>
            )}
        </Modal>
    );
}