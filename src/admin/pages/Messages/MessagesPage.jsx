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
import { useAdminMessages } from '../../hooks/useAdminMessages.js';

import './messages.css';

const reasons = {
    spam: 'Спам',
    abuse: 'Оскорбление или травля',
    inappropriate: 'Недопустимый материал',
    threat: 'Угроза',
    other: 'Другая причина',
};

const statusOptions = [
    { value: '', label: 'Все' },
    { value: 'pending', label: 'Новые' },
    { value: 'resolved', label: 'Подтверждённые' },
    { value: 'dismissed', label: 'Отклонённые' },
];

const columns = [
    { key: 'id', label: 'ID', width: '70px' },
    { key: 'participants', label: 'Диалог' },
    { key: 'reporter', label: 'Заявитель' },
    { key: 'reason', label: 'Причина' },
    { key: 'preview', label: 'Сообщение' },
    { key: 'status', label: 'Статус' },
    { key: 'action', label: 'Действие', width: '110px' },
];

function reportBadge(status) {
    if (status === 'pending') return 'warning';
    if (status === 'resolved') return 'success';
    return 'default';
}

function formatDate(value) {
    if (!value) return '—';
    return new Intl.DateTimeFormat('ru-RU', {
        dateStyle: 'short',
        timeStyle: 'short',
    }).format(new Date(value));
}

export function MessagesPage() {
    const controller = useAdminMessages();
    const [comment, setComment] = useState('');
    const [hideMessage, setHideMessage] = useState(false);
    const detail = controller.selected;
    const report = detail?.report;

    const openReport = async (id) => {
        setComment('');
        setHideMessage(false);
        await controller.open(id);
    };

    return (
        <div className="admin-page admin-messages">
            <div className="admin-page__head">
                <div>
                    <p className="admin-page__eyebrow">Безопасность переписки</p>
                    <h2 className="admin-page__title">Жалобы на сообщения</h2>
                    <p className="admin-messages__privacy">
                        Доступен только обжалованный фрагмент переписки. Просмотр фиксируется в журнале действий.
                    </p>
                </div>
                <Button onClick={controller.load}>Обновить</Button>
            </div>

            <div className="admin-messages__filter">
                <Select
                    label="Статус жалобы"
                    value={controller.status}
                    options={statusOptions}
                    onChange={(event) => controller.setStatus(event.target.value)}
                />
            </div>

            {controller.error && <div className="admin-alert">{controller.error}</div>}
            {controller.notice && <div className="admin-alert admin-messages__success">{controller.notice}</div>}

            {controller.isLoading ? (
                <Loader text="Загрузка жалоб..." />
            ) : !controller.reports.length ? (
                <EmptyState title="Жалоб нет" description="В выбранной очереди нет обращений." />
            ) : (
                <Table columns={columns} minWidth={1180}>
                    {controller.reports.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell>{item.id}</TableCell>
                            <TableCell strong>{item.participants}</TableCell>
                            <TableCell>
                                {item.reporter_name}
                                <small className="admin-messages__email">{item.reporter_email}</small>
                            </TableCell>
                            <TableCell>{reasons[item.reason] || item.reason}</TableCell>
                            <TableCell>{item.message_preview}</TableCell>
                            <TableCell><Badge variant={reportBadge(item.status)}>{item.status}</Badge></TableCell>
                            <TableCell>
                                <Button size="sm" onClick={() => openReport(item.id)}>
                                    Открыть
                                </Button>
                            </TableCell>
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

            {controller.isLoadingDetails && <Loader text="Открываем контекст..." />}

            <Modal
                isOpen={Boolean(detail)}
                title={report ? `Жалоба №${report.id}` : 'Жалоба'}
                description={detail?.dialog?.participants}
                onClose={controller.close}
                footer={report?.status === 'pending' ? (
                    <>
                        <Button
                            loading={controller.isSaving}
                            onClick={() => controller.resolve(report.id, {
                                decision: 'dismissed',
                                comment: comment.trim(),
                                hide_message: false,
                            })}
                        >
                            Не подтверждена
                        </Button>
                        <Button
                            variant="danger"
                            loading={controller.isSaving}
                            onClick={() => controller.resolve(report.id, {
                                decision: 'resolved',
                                comment: comment.trim(),
                                hide_message: hideMessage,
                            })}
                        >
                            Подтвердить
                        </Button>
                    </>
                ) : null}
            >
                {report && (
                    <div className="admin-messages__detail">
                        <div className="admin-messages__report-info">
                            <p><strong>Причина:</strong> {reasons[report.reason] || report.reason}</p>
                            <p><strong>Комментарий:</strong> {report.comment || 'Без комментария'}</p>
                            <p><strong>Получена:</strong> {formatDate(report.created_at)}</p>
                        </div>

                        <div className="admin-messages__context">
                            {detail.context.map((message) => (
                                <article
                                    key={message.id}
                                    className={message.is_reported
                                        ? 'admin-messages__message admin-messages__message--reported'
                                        : 'admin-messages__message'}
                                >
                                    <header>
                                        <strong>{message.author_name}</strong>
                                        <span>{formatDate(message.created_at)}</span>
                                    </header>
                                    <p>{message.message_text || 'Вложение без текста'}</p>
                                    {!!message.attachments?.length && (
                                        <div className="admin-messages__attachments">
                                            {message.attachments.map((attachment) => (
                                                <Button
                                                    key={attachment.id}
                                                    size="sm"
                                                    disabled={!message.is_reported}
                                                    onClick={() => controller.download(report.id, attachment)}
                                                >
                                                    {attachment.original_name}
                                                </Button>
                                            ))}
                                        </div>
                                    )}
                                    {message.is_reported && <Badge variant="danger">Обжаловано</Badge>}
                                </article>
                            ))}
                        </div>

                        {report.status === 'pending' && (
                            <>
                                <Input
                                    label="Решение администратора"
                                    multiline
                                    rows={4}
                                    value={comment}
                                    onChange={(event) => setComment(event.target.value)}
                                    helperText={hideMessage ? 'Причина обязательна при скрытии.' : ''}
                                />
                                <label className="admin-messages__check">
                                    <input
                                        type="checkbox"
                                        checked={hideMessage}
                                        onChange={(event) => setHideMessage(event.target.checked)}
                                    />
                                    Скрыть обжалованное сообщение и его вложения
                                </label>
                            </>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}
