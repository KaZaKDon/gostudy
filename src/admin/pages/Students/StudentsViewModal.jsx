import {
    Badge,
    Button,
    Loader,
    Modal,
} from '../../components/ui/index.js';

const statusLabels = {
    active: 'Активен',
    blocked: 'Заблокирован',
    archived: 'Архив',
    deleted: 'Архив',
};

const statusVariants = {
    active: 'success',
    blocked: 'danger',
    archived: 'info',
    deleted: 'info',
};

const relationStatusLabels = {
    active: 'Активная связь',
    archived: 'Архивная связь',
};

const requestStatusLabels = {
    pending: 'Ожидает ответа',
    accepted: 'Принята',
    rejected: 'Отклонена',
};

const lessonStatusLabels = {
    scheduled: 'Запланирован',
    active: 'Идёт',
    completed: 'Завершён',
    cancelled: 'Отменён',
    rescheduled: 'Перенесён',
};

function formatDate(value) {
    if (!value) {
        return '—';
    }

    return new Date(value).toLocaleDateString('ru-RU');
}

function renderValue(value) {
    return value === undefined || value === null || value === ''
        ? '—'
        : value;
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
    canManageAccounts,
}) {
    const student = studentData?.student;
    const stats = studentData?.stats || {};
    const teachers = studentData?.teachers || [];
    const requests = studentData?.requests || [];
    const lessons = studentData?.lessons || [];
    const homework = studentData?.homework || [];
    const profileExists = studentData?.profile_exists !== false;
    const isArchived = student?.status === 'archived'
        || student?.status === 'deleted';

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
            status: 'archived',
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
            description="Аккаунт, анкета, преподаватели, заявки и уроки"
            onClose={onClose}
            footer={canManageAccounts ? (
                <>
                    {student && !isArchived && (
                        <Button
                            variant={student.status === 'blocked' ? 'primary' : 'danger'}
                            loading={isStatusUpdating}
                            onClick={handleToggleStatus}
                        >
                            {student.status === 'blocked' ? 'Разблокировать' : 'Заблокировать'}
                        </Button>
                    )}

                    {student && !isArchived && (
                        <Button
                            variant="secondary"
                            loading={isStatusUpdating}
                            onClick={handleArchive}
                        >
                            В архив
                        </Button>
                    )}

                    {student && isArchived && (
                        <Button
                            variant="primary"
                            loading={isStatusUpdating}
                            onClick={handleRestore}
                        >
                            Восстановить
                        </Button>
                    )}
                </>
            ) : null}
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
                            <span>Активные преподаватели</span>
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

                    {!profileExists && (
                        <div className="admin-alert">
                            Анкета ученика ещё не заполнена.
                        </div>
                    )}

                    <section className="student-view__section">
                        <h4>Аккаунт</h4>

                        <InfoList
                            items={[
                                { label: 'ID', value: student.id },
                                { label: 'Email', value: student.email },
                                { label: 'Телефон', value: student.phone },
                                {
                                    label: 'Email подтверждён',
                                    value: student.email_verified ? 'Да' : 'Нет',
                                },
                                {
                                    label: 'Анкета завершена',
                                    value: student.profile_completed ? 'Да' : 'Нет',
                                },
                                {
                                    label: 'Заполнение анкеты',
                                    value: student.profile_completion === null
                                        || student.profile_completion === undefined
                                        ? '—'
                                        : `${student.profile_completion}%`,
                                },
                                { label: 'Регистрация', value: formatDate(student.created_at) },
                                { label: 'Последний вход', value: formatDate(student.last_login_at) },
                            ]}
                        />
                    </section>

                    <section className="student-view__section">
                        <h4>Анкета ученика</h4>

                        <InfoList
                            items={[
                                { label: 'Имя', value: student.first_name },
                                { label: 'Фамилия', value: student.last_name },
                                { label: 'Город', value: student.city },
                                { label: 'Часовой пояс', value: student.timezone },
                                { label: 'Год рождения', value: student.birth_year },
                                { label: 'Класс / уровень', value: student.class_level },
                                { label: 'Предметы', value: student.subjects },
                                { label: 'Цель обучения', value: student.goal },
                                { label: 'Учебные цели', value: student.learning_goals },
                                { label: 'Описание уровня', value: student.level_description },
                                { label: 'Формат занятий', value: student.lesson_format },
                                { label: 'Мессенджер', value: student.messenger },
                                { label: 'Предпочтительный контакт', value: student.contact_preference },
                                { label: 'Удобное время', value: student.preferred_time },
                                { label: 'Комментарий к расписанию', value: student.schedule_comment },
                            ]}
                        />
                    </section>

                    <section className="student-view__section">
                        <h4>Родитель / представитель</h4>

                        <InfoList
                            items={[
                                { label: 'Имя', value: student.parent_name },
                                { label: 'Телефон', value: student.parent_phone },
                                { label: 'Email', value: student.parent_email },
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
                        emptyText="Связей с преподавателями пока нет."
                        renderItem={(teacher) => (
                            <article className="student-view__card" key={teacher.id}>
                                <strong>{teacher.teacher_name || 'Преподаватель'}</strong>
                                <span>{teacher.subject_name || 'Предмет не указан'}</span>
                                <small>
                                    {relationStatusLabels[teacher.status] || teacher.status || '—'}
                                    {teacher.teacher_status !== 'active'
                                        ? ` · аккаунт: ${statusLabels[teacher.teacher_status] || teacher.teacher_status}`
                                        : ''}
                                </small>
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
                                <small>
                                    {requestStatusLabels[request.status] || request.status || '—'}
                                    {' · '}{formatDate(request.created_at)}
                                </small>
                                {request.message && <p>{request.message}</p>}
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
                                <small>
                                    {lessonStatusLabels[lesson.status] || lesson.status || '—'}
                                    {' · '}{formatDate(lesson.lesson_date)}
                                    {lesson.duration_minutes
                                        ? ` · ${lesson.duration_minutes} минут`
                                        : ''}
                                </small>
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

                    <p className="student-view__muted">
                        Сообщения появятся после переноса соответствующего
                        модуля. Аккаунт родителя будет связан с учеником
                        отдельным этапом; сейчас показаны контактные данные из
                        анкеты.
                    </p>
                </div>
            )}
        </Modal>
    );
}
