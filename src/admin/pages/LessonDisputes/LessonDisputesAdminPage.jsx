import { useState } from 'react';

import {
    Badge,
    Button,
    EmptyState,
    Input,
    Loader,
    Modal,
    Pagination,
    Select,
    Table,
    TableCell,
    TableRow,
} from '../../components/ui/index.js';
import { useAdminLessonDisputes } from '../../hooks/useAdminLessonDisputes.js';

import './lesson-disputes.css';

const REASONS = {
    no_show: 'Неявка',
    late_cancellation: 'Поздняя отмена',
    lesson_not_held: 'Урок не состоялся',
    lesson_quality: 'Проблема с уроком',
    other: 'Другая причина',
};

const STATUSES = {
    open: 'Открыт',
    under_review: 'На рассмотрении',
    resolved: 'Решён',
    rejected: 'Не подтверждён',
};

const ROLE_LABELS = {
    teacher: 'Преподаватель',
    student: 'Ученик',
    parent: 'Родитель',
    moderator: 'Модератор',
    admin: 'Администратор',
};

const STATUS_OPTIONS = [
    { value: '', label: 'Все' },
    { value: 'open', label: 'Открытые' },
    { value: 'under_review', label: 'На рассмотрении' },
    { value: 'resolved', label: 'Решённые' },
    { value: 'rejected', label: 'Не подтверждённые' },
];

const DECISION_OPTIONS = [
    { value: 'applicant_supported', label: 'Заявитель прав' },
    { value: 'respondent_supported', label: 'Вторая сторона права' },
    { value: 'mutual_agreement', label: 'Взаимное соглашение' },
    { value: 'no_violation', label: 'Нарушение не подтверждено' },
];

const COLUMNS = [
    { key: 'id', label: 'ID', width: '70px' },
    { key: 'lesson', label: 'Урок' },
    { key: 'participants', label: 'Стороны' },
    { key: 'applicant', label: 'Заявитель' },
    { key: 'reason', label: 'Причина' },
    { key: 'status', label: 'Статус' },
    { key: 'action', label: 'Действие', width: '110px' },
];

function formatDate(value) {
    if (!value) return '—';
    return new Intl.DateTimeFormat('ru-RU', {
        dateStyle: 'short',
        timeStyle: 'short',
    }).format(new Date(value));
}

function badgeVariant(status) {
    if (status === 'open') return 'warning';
    if (status === 'under_review') return 'info';
    if (status === 'resolved') return 'success';
    return 'default';
}

function Attachments({ disputeId, files, onDownload }) {
    if (!files?.length) return null;
    return (
        <div className="admin-disputes__attachments">
            {files.map((file) => (
                <Button key={file.id} size="sm" onClick={() => onDownload(disputeId, file)}>
                    {file.original_name}
                </Button>
            ))}
        </div>
    );
}

export function LessonDisputesAdminPage() {
    const controller = useAdminLessonDisputes();
    const [decision, setDecision] = useState('applicant_supported');
    const [comment, setComment] = useState('');
    const detail = controller.selected;
    const isClosed = detail?.status === 'resolved' || detail?.status === 'rejected';

    const open = async (disputeId) => {
        setDecision('applicant_supported');
        setComment('');
        await controller.open(disputeId);
    };

    return (
        <div className="admin-page admin-disputes">
            <div className="admin-page__head">
                <div>
                    <p className="admin-page__eyebrow">Уроки и модерация</p>
                    <h2 className="admin-page__title">Споры по урокам</h2>
                    <p className="admin-disputes__intro">
                        Решение фиксируется в журнале действий. Финансовый перерасчёт на этом этапе не выполняется.
                    </p>
                </div>
                <Button onClick={controller.load}>Обновить</Button>
            </div>

            <div className="admin-disputes__filter">
                <Select
                    label="Статус"
                    value={controller.status}
                    options={STATUS_OPTIONS}
                    onChange={(event) => controller.setStatus(event.target.value)}
                />
            </div>

            {controller.error && <div className="admin-alert">{controller.error}</div>}
            {controller.notice && <div className="admin-alert admin-disputes__success">{controller.notice}</div>}

            {controller.isLoading ? (
                <Loader text="Загрузка споров..." />
            ) : !controller.items.length ? (
                <EmptyState title="Споров нет" description="В выбранной очереди нет обращений." />
            ) : (
                <Table columns={COLUMNS} minWidth={1180}>
                    {controller.items.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell>{item.id}</TableCell>
                            <TableCell strong>
                                {item.lesson_title}
                                <small>{formatDate(item.lesson_date)}</small>
                            </TableCell>
                            <TableCell>{item.teacher_name} — {item.student_name}</TableCell>
                            <TableCell>
                                {item.opened_by_name}
                                <small>{ROLE_LABELS[item.opened_by_role]}</small>
                            </TableCell>
                            <TableCell>{REASONS[item.reason] || item.reason}</TableCell>
                            <TableCell><Badge variant={badgeVariant(item.status)}>{STATUSES[item.status]}</Badge></TableCell>
                            <TableCell><Button size="sm" onClick={() => open(item.id)}>Открыть</Button></TableCell>
                        </TableRow>
                    ))}
                </Table>
            )}

            <Pagination
                page={controller.pagination.page}
                pages={controller.pagination.pages}
                total={controller.pagination.total}
                onPageChange={controller.setPage}
            />

            {controller.isLoadingDetails && <Loader text="Открываем спор..." />}

            <Modal
                isOpen={Boolean(detail)}
                title={detail ? `Спор №${detail.id}: ${detail.lesson.title}` : 'Спор'}
                description={detail ? `${detail.teacher.name} — ${detail.student.name}` : ''}
                onClose={controller.close}
                footer={detail && !isClosed ? (
                    <>
                        {detail.status === 'open' && (
                            <Button
                                loading={controller.isSaving}
                                onClick={() => controller.moderate(detail.id, { action: 'review' })}
                            >
                                Взять в работу
                            </Button>
                        )}
                        <Button
                            variant="danger"
                            loading={controller.isSaving}
                            onClick={() => controller.moderate(detail.id, {
                                action: 'decide',
                                decision,
                                comment: comment.trim(),
                            })}
                        >
                            Сохранить решение
                        </Button>
                    </>
                ) : null}
            >
                {detail && (
                    <div className="admin-disputes__detail">
                        <section className="admin-disputes__meta">
                            <p><strong>Статус:</strong> <Badge variant={badgeVariant(detail.status)}>{STATUSES[detail.status]}</Badge></p>
                            <p><strong>Урок:</strong> {formatDate(detail.lesson.lesson_date)}</p>
                            <p><strong>Причина:</strong> {REASONS[detail.reason]}</p>
                            <p><strong>Заявитель:</strong> {detail.opened_by.name} ({ROLE_LABELS[detail.opened_by.role]})</p>
                            <p><strong>Преподаватель:</strong> {detail.teacher.name} · {detail.teacher.email}</p>
                            <p><strong>Ученик:</strong> {detail.student.name} · {detail.student.email}</p>
                        </section>

                        <section>
                            <h3>Описание ситуации</h3>
                            <p>{detail.description}</p>
                            <Attachments disputeId={detail.id} files={detail.attachments} onDownload={controller.download} />
                        </section>

                        {!!detail.messages.length && (
                            <section>
                                <h3>Ответы сторон</h3>
                                <div className="admin-disputes__messages">
                                    {detail.messages.map((message) => (
                                        <article key={message.id}>
                                            <header>
                                                <strong>{message.author_name} · {ROLE_LABELS[message.author_role]}</strong>
                                                <span>{formatDate(message.created_at)}</span>
                                            </header>
                                            <p>{message.message_text || 'Вложение без текста'}</p>
                                            <Attachments disputeId={detail.id} files={message.attachments} onDownload={controller.download} />
                                        </article>
                                    ))}
                                </div>
                            </section>
                        )}

                        <section>
                            <h3>История действий</h3>
                            <div className="admin-disputes__events">
                                {detail.events.map((event) => (
                                    <p key={event.id}>
                                        <span>{formatDate(event.created_at)}</span>
                                        <strong>{event.event_type}</strong>
                                        <small>{event.actor_name}</small>
                                    </p>
                                ))}
                            </div>
                        </section>

                        {isClosed ? (
                            <section className="admin-disputes__resolution">
                                <h3>Решение</h3>
                                <p><strong>{DECISION_OPTIONS.find((item) => item.value === detail.resolution)?.label || detail.resolution}</strong></p>
                                <p>{detail.resolution_comment}</p>
                                <small>{detail.handled_by} · {formatDate(detail.handled_at)}</small>
                            </section>
                        ) : (
                            <section className="admin-disputes__decision">
                                <h3>Решение модератора</h3>
                                <Select
                                    label="Итог"
                                    value={decision}
                                    options={DECISION_OPTIONS}
                                    onChange={(event) => setDecision(event.target.value)}
                                />
                                <Input
                                    label="Обоснование"
                                    multiline
                                    rows={5}
                                    maxLength={5000}
                                    value={comment}
                                    onChange={(event) => setComment(event.target.value)}
                                    helperText="Минимум 10 символов. Текст увидят обе стороны."
                                />
                            </section>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}
