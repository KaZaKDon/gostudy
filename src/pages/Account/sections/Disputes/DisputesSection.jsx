import { useState } from 'react';

import { useLessonDisputes } from './useLessonDisputes.js';

import './DisputesSection.css';

const REASON_LABELS = {
    no_show: 'Неявка на урок',
    late_cancellation: 'Поздняя отмена',
    lesson_not_held: 'Урок не состоялся',
    lesson_quality: 'Проблема с проведением урока',
    other: 'Другая проблема',
};

const STATUS_LABELS = {
    open: 'Открыт',
    under_review: 'На рассмотрении',
    resolved: 'Решён',
    rejected: 'Нарушение не подтверждено',
};

const RESOLUTION_LABELS = {
    applicant_supported: 'Заявитель прав',
    respondent_supported: 'Вторая сторона права',
    mutual_agreement: 'Взаимное соглашение',
    no_violation: 'Нарушение не подтверждено',
};

const EVENT_LABELS = {
    'dispute.opened': 'Спор открыт',
    'participant.message_added': 'Добавлен ответ',
    'moderation.review_started': 'Модератор начал рассмотрение',
    'moderation.decision_saved': 'Модератор принял решение',
};

function formatDate(value) {
    if (!value) return '—';
    return new Intl.DateTimeFormat('ru-RU', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}

function formatBytes(value) {
    const bytes = Number(value) || 0;
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / 1024 ** 2).toFixed(1)} МБ`;
}

function AttachmentList({ disputeId, files, onDownload }) {
    if (!files?.length) return null;
    return (
        <div className="disputes-attachments">
            {files.map((file) => (
                <button
                    key={file.id}
                    type="button"
                    onClick={() => onDownload(disputeId, file)}
                >
                    <span>{file.original_name}</span>
                    <small>{formatBytes(file.file_size)}</small>
                </button>
            ))}
        </div>
    );
}

export function DisputesSection({ role, targetDisputeId }) {
    const disputes = useLessonDisputes(targetDisputeId);
    const [isCreating, setIsCreating] = useState(false);
    const [selectedChildId, setSelectedChildId] = useState('');
    const [lessonId, setLessonId] = useState('');
    const [reason, setReason] = useState('no_show');
    const [description, setDescription] = useState('');
    const [claimFiles, setClaimFiles] = useState([]);
    const [replyText, setReplyText] = useState('');
    const [replyFiles, setReplyFiles] = useState([]);
    const [formError, setFormError] = useState('');

    const openCreate = async () => {
        disputes.clearMessages();
        setFormError('');
        setLessonId('');
        setDescription('');
        setClaimFiles([]);
        try {
            const result = await disputes.loadOptions();
            const firstChildId = role === 'parent'
                ? result.children?.[0]?.student_id || ''
                : '';
            setSelectedChildId(firstChildId);
            if (firstChildId) await disputes.loadOptions(firstChildId);
            setIsCreating(true);
        } catch (requestError) {
            setFormError(requestError.message || 'Не удалось загрузить уроки');
        }
    };

    const changeChild = async (value) => {
        setSelectedChildId(value);
        setLessonId('');
        setFormError('');
        try {
            await disputes.loadOptions(value || null);
        } catch (requestError) {
            setFormError(requestError.message || 'Не удалось загрузить уроки');
        }
    };

    const submitClaim = async (event) => {
        event.preventDefault();
        setFormError('');
        if (!lessonId) {
            setFormError('Выберите урок');
            return;
        }
        if (description.trim().length < 10) {
            setFormError('Опишите ситуацию подробнее');
            return;
        }
        const saved = await disputes.create({
            lessonId,
            reason,
            description: description.trim(),
            files: claimFiles,
        });
        if (saved) setIsCreating(false);
    };

    const submitReply = async (event) => {
        event.preventDefault();
        if (!disputes.selected) return;
        const saved = await disputes.reply(
            disputes.selected.id,
            replyText.trim(),
            replyFiles,
        );
        if (saved) {
            setReplyText('');
            setReplyFiles([]);
        }
    };

    const detail = disputes.selected;

    return (
        <section className="disputes-section">
            <header className="disputes-section__header">
                <div>
                    <span>Помощь и модерация</span>
                    <h2>Споры по урокам</h2>
                    <p>
                        Модератор рассмотрит описание, ответы сторон и приложенные файлы.
                    </p>
                </div>
                <button type="button" onClick={openCreate}>
                    Открыть спор
                </button>
            </header>

            <div className="disputes-section__filters">
                <label>
                    <span>Статус</span>
                    <select
                        value={disputes.statusFilter}
                        onChange={(event) => disputes.setStatusFilter(event.target.value)}
                    >
                        <option value="">Все споры</option>
                        <option value="open">Открытые</option>
                        <option value="under_review">На рассмотрении</option>
                        <option value="resolved">Решённые</option>
                        <option value="rejected">Не подтверждённые</option>
                    </select>
                </label>
            </div>

            {disputes.error && <p className="disputes-section__message disputes-section__message--error">{disputes.error}</p>}
            {disputes.notice && <p className="disputes-section__message disputes-section__message--success">{disputes.notice}</p>}

            {disputes.isLoading ? (
                <div className="disputes-section__empty">Загружаем споры...</div>
            ) : disputes.disputes.length ? (
                <div className="disputes-list">
                    {disputes.disputes.map((item) => (
                        <article key={item.id} className="disputes-card">
                            <button type="button" onClick={() => disputes.open(item.id)}>
                                <span className={`disputes-status disputes-status--${item.status}`}>
                                    {STATUS_LABELS[item.status] || item.status}
                                </span>
                                <div>
                                    <strong>{item.lesson.title}</strong>
                                    <span>{formatDate(item.lesson.lesson_date)}</span>
                                </div>
                                <p>{REASON_LABELS[item.reason] || item.reason}</p>
                                <small>
                                    {item.teacher_name} — {item.student_name}
                                    {' · '}{item.message_count} отв.
                                    {' · '}{item.attachment_count} файл.
                                </small>
                            </button>
                        </article>
                    ))}
                </div>
            ) : (
                <div className="disputes-section__empty">
                    <h3>Споров нет</h3>
                    <p>В выбранной группе нет обращений.</p>
                </div>
            )}

            {isCreating && (
                <div className="disputes-modal" onClick={() => setIsCreating(false)}>
                    <form className="disputes-modal__panel" onSubmit={submitClaim} onClick={(event) => event.stopPropagation()}>
                        <header>
                            <div>
                                <span>Новое обращение</span>
                                <h3>Открыть спор</h3>
                            </div>
                            <button type="button" onClick={() => setIsCreating(false)}>Закрыть</button>
                        </header>

                        {role === 'parent' && disputes.options.children.length > 0 && (
                            <label>
                                <span>Ребёнок</span>
                                <select value={selectedChildId} onChange={(event) => changeChild(event.target.value)}>
                                    {disputes.options.children.map((child) => (
                                        <option key={child.student_id} value={child.student_id}>{child.full_name}</option>
                                    ))}
                                </select>
                            </label>
                        )}

                        <label>
                            <span>Урок</span>
                            <select value={lessonId} onChange={(event) => setLessonId(event.target.value)} required>
                                <option value="">Выберите урок</option>
                                {disputes.options.lessons.map((lesson) => (
                                    <option key={lesson.id} value={lesson.id}>
                                        {formatDate(lesson.lesson_date)} — {lesson.title} — {role === 'teacher' ? lesson.student_name : lesson.teacher_name}
                                    </option>
                                ))}
                            </select>
                        </label>

                        {!disputes.options.lessons.length && (
                            <p className="disputes-form__hint">Нет завершённых или отменённых уроков без спора.</p>
                        )}

                        <label>
                            <span>Причина</span>
                            <select value={reason} onChange={(event) => setReason(event.target.value)}>
                                {Object.entries(REASON_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        </label>

                        <label>
                            <span>Описание</span>
                            <textarea rows="6" maxLength="5000" value={description} onChange={(event) => setDescription(event.target.value)} required />
                            <small>Опишите факты спокойно и последовательно.</small>
                        </label>

                        <label>
                            <span>Подтверждающие файлы</span>
                            <input type="file" multiple onChange={(event) => setClaimFiles([...event.target.files])} />
                            <small>До 5 файлов. Файлы учитываются в личном хранилище.</small>
                        </label>

                        {formError && <p className="disputes-section__message disputes-section__message--error">{formError}</p>}
                        <footer>
                            <button type="button" onClick={() => setIsCreating(false)}>Отмена</button>
                            <button type="submit" disabled={disputes.isSaving || !disputes.options.lessons.length}>
                                {disputes.isSaving ? 'Отправляем…' : 'Передать на модерацию'}
                            </button>
                        </footer>
                    </form>
                </div>
            )}

            {detail && (
                <div className="disputes-modal" onClick={() => disputes.setSelected(null)}>
                    <section className="disputes-modal__panel disputes-modal__panel--detail" onClick={(event) => event.stopPropagation()}>
                        <header>
                            <div>
                                <span>Спор №{detail.id}</span>
                                <h3>{detail.lesson.title}</h3>
                            </div>
                            <button type="button" onClick={() => disputes.setSelected(null)}>Закрыть</button>
                        </header>

                        <div className="disputes-detail__meta">
                            <span className={`disputes-status disputes-status--${detail.status}`}>{STATUS_LABELS[detail.status]}</span>
                            <p><strong>Урок:</strong> {formatDate(detail.lesson.lesson_date)}</p>
                            <p><strong>Стороны:</strong> {detail.teacher_name} — {detail.student_name}</p>
                            <p><strong>Причина:</strong> {REASON_LABELS[detail.reason]}</p>
                            <p><strong>Заявитель:</strong> {detail.opened_by_name}</p>
                        </div>

                        <article className="disputes-detail__claim">
                            <h4>Описание ситуации</h4>
                            <p>{detail.description}</p>
                            <AttachmentList disputeId={detail.id} files={detail.attachments} onDownload={disputes.download} />
                        </article>

                        {!!detail.messages.length && (
                            <div className="disputes-detail__messages">
                                <h4>Ответы сторон</h4>
                                {detail.messages.map((message) => (
                                    <article key={message.id}>
                                        <header>
                                            <strong>{message.author_name}</strong>
                                            <span>{formatDate(message.created_at)}</span>
                                        </header>
                                        <p>{message.message_text || 'Вложение без текста'}</p>
                                        <AttachmentList disputeId={detail.id} files={message.attachments} onDownload={disputes.download} />
                                    </article>
                                ))}
                            </div>
                        )}

                        {detail.resolution && (
                            <article className="disputes-detail__resolution">
                                <h4>Решение модератора</h4>
                                <strong>{RESOLUTION_LABELS[detail.resolution] || detail.resolution}</strong>
                                <p>{detail.resolution_comment}</p>
                            </article>
                        )}

                        <div className="disputes-detail__timeline">
                            <h4>История</h4>
                            {detail.events.map((event) => (
                                <p key={event.id}>
                                    <span>{formatDate(event.created_at)}</span>
                                    <strong>{EVENT_LABELS[event.event_type] || event.event_type}</strong>
                                    <small>{event.actor_name}</small>
                                </p>
                            ))}
                        </div>

                        {detail.can_reply && (
                            <form className="disputes-reply" onSubmit={submitReply}>
                                <label>
                                    <span>Добавить ответ</span>
                                    <textarea rows="4" maxLength="5000" value={replyText} onChange={(event) => setReplyText(event.target.value)} />
                                </label>
                                <label>
                                    <span>Прикрепить файлы</span>
                                    <input type="file" multiple onChange={(event) => setReplyFiles([...event.target.files])} />
                                </label>
                                <button type="submit" disabled={disputes.isSaving || (!replyText.trim() && !replyFiles.length)}>
                                    {disputes.isSaving ? 'Отправляем…' : 'Добавить ответ'}
                                </button>
                            </form>
                        )}
                    </section>
                </div>
            )}
        </section>
    );
}
