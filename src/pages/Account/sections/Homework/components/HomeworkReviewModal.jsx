import { useState } from 'react';

import { API } from '../../../../../api/api.js';
import {
    downloadAuthFile,
    formatFileSize,
    validateSelectedFiles,
} from '../../../../../api/upload.js';
import { HOMEWORK_GRADES } from '../constants.js';
import { formatHomeworkDate } from '../utils.js';

function AttachmentList({ files, type, onError }) {
    if (!files?.length) {
        return <p>Файлы не прикреплены.</p>;
    }

    return (
        <ul className="homework-files">
            {files.map((file) => (
                <li key={file.id}>
                    <button
                        type="button"
                        onClick={() => downloadAuthFile(
                            `${API.downloadHomeworkFile}?type=${type}&id=${file.id}`,
                            file.original_name,
                        ).catch((error) => onError(error.message))}
                    >
                        {file.original_name}
                        <small>{formatFileSize(file.file_size)}</small>
                    </button>
                </li>
            ))}
        </ul>
    );
}

export function HomeworkReviewModal({
    role,
    homework,
    isSaving,
    uploadLimits,
    onSubmit,
    onReview,
    onCancelHomework,
    onClose,
}) {
    const [answerText, setAnswerText] = useState('');
    const [files, setFiles] = useState([]);
    const [selectedGrade, setSelectedGrade] = useState('');
    const [comment, setComment] = useState('');
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');

    if (!homework) {
        return null;
    }

    const latestSubmission = homework.submissions?.[0] || null;
    const canSubmit = role === 'student'
        && homework.status === 'active'
        && (!latestSubmission || latestSubmission.status === 'returned');
    const canReview = role === 'teacher'
        && latestSubmission?.status === 'submitted';
    const canCancel = role === 'teacher'
        && homework.status === 'active'
        && !latestSubmission;

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');

        try {
            await onSubmit(homework.id, answerText, files, setProgress);
            setAnswerText('');
            setFiles([]);
        } catch (submitError) {
            setError(submitError.message);
        }
    };

    const handleReview = async (decision) => {
        setError('');

        try {
            await onReview(
                homework.id,
                decision,
                selectedGrade,
                comment,
            );
        } catch (reviewError) {
            setError(reviewError.message);
        }
    };

    const handleFilesChange = (event) => {
        setError('');

        try {
            setFiles(validateSelectedFiles(
                event.target.files,
                uploadLimits,
            ));
        } catch (validationError) {
            setFiles([]);
            event.target.value = '';
            setError(validationError.message);
        }
    };

    const handleCancel = async () => {
        if (!window.confirm('Отменить это домашнее задание?')) {
            return;
        }

        try {
            await onCancelHomework(homework.id);
            onClose();
        } catch (cancelError) {
            setError(cancelError.message);
        }
    };

    return (
        <div className="homework-modal">
            <button type="button" className="homework-modal__overlay" aria-label="Закрыть" onClick={onClose} />

            <section className="homework-modal__panel" aria-modal="true" role="dialog">
                <header className="homework-modal__header">
                    <div>
                        <span>{role === 'teacher' ? 'Домашняя работа ученика' : 'Домашнее задание'}</span>
                        <h2>{homework.title}</h2>
                    </div>
                    <button type="button" className="homework-modal__close" onClick={onClose}>×</button>
                </header>

                <div className="homework-modal__meta">
                    <span>Ученик: {homework.student_name}</span>
                    <span>Преподаватель: {homework.teacher_name}</span>
                    <span>Предмет: {homework.subject_name}</span>
                    <span>Срок: {formatHomeworkDate(homework.due_date)}</span>
                    {role === 'teacher' && (
                        <span>
                            Просмотрено: {homework.viewed_at
                                ? formatHomeworkDate(homework.viewed_at)
                                : 'ещё не открыто'}
                        </span>
                    )}
                </div>

                <div className="homework-modal__content">
                    {error && <p className="homework-form__error">{error}</p>}

                    <section>
                        <h3>Задание</h3>
                        <p className="homework-text">{homework.description}</p>
                    </section>

                    <section>
                        <h3>Материалы</h3>
                        <AttachmentList files={homework.attachments} type="assignment" onError={setError} />
                    </section>

                    {latestSubmission && (
                        <section>
                            <h3>Попытка №{latestSubmission.attempt_number}</h3>
                            <p className="homework-text">{latestSubmission.answer_text || 'Ответ приложен файлом.'}</p>
                            <AttachmentList files={latestSubmission.attachments} type="submission" onError={setError} />
                            {latestSubmission.teacher_comment && (
                                <p className="homework-review-result">
                                    <strong>Комментарий преподавателя:</strong><br />
                                    {latestSubmission.teacher_comment}
                                </p>
                            )}
                            {latestSubmission.grade && <p><strong>Оценка:</strong> {latestSubmission.grade}</p>}
                        </section>
                    )}

                    {canSubmit && (
                        <form className="homework-submit" onSubmit={handleSubmit}>
                            <h3>{latestSubmission ? 'Отправить доработку' : 'Отправить решение'}</h3>
                            <textarea
                                rows="6"
                                maxLength="30000"
                                placeholder="Напишите ответ"
                                value={answerText}
                                onChange={(event) => setAnswerText(event.target.value)}
                            />
                            <input
                                type="file"
                                multiple
                                accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                                onChange={handleFilesChange}
                            />
                            <small>
                                До {uploadLimits.maxFiles} файлов,
                                каждый до {formatFileSize(uploadLimits.maxFileBytes)},
                                суммарно до {formatFileSize(uploadLimits.maxTotalBytes)}
                            </small>
                            {files.length > 0 && (
                                <ul className="homework-selected-files">
                                    {files.map((file, index) => (
                                        <li key={`${file.name}:${file.size}`}>
                                            <span>{file.name}</span>
                                            <small>{formatFileSize(file.size)}</small>
                                            <button
                                                type="button"
                                                aria-label={`Убрать файл ${file.name}`}
                                                onClick={() => setFiles((current) =>
                                                    current.filter((_, fileIndex) => fileIndex !== index))}
                                            >
                                                ×
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {isSaving && progress > 0 && <small>Загрузка: {progress}%</small>}
                            <button type="submit" className="homework-modal__accept" disabled={isSaving}>
                                {isSaving ? 'Отправляем...' : 'Отправить преподавателю'}
                            </button>
                        </form>
                    )}

                    {canReview && (
                        <section>
                            <h3>Результат проверки</h3>
                            <div className="homework-modal__grades">
                                {HOMEWORK_GRADES.map((grade) => (
                                    <button
                                        key={grade}
                                        type="button"
                                        className={selectedGrade === grade
                                            ? 'homework-modal__grade homework-modal__grade--active'
                                            : 'homework-modal__grade'}
                                        onClick={() => setSelectedGrade(grade)}
                                    >
                                        {grade}
                                    </button>
                                ))}
                            </div>
                            <textarea
                                value={comment}
                                rows="5"
                                placeholder="Комментарий к работе. Для доработки обязателен."
                                onChange={(event) => setComment(event.target.value)}
                            />
                            <div className="homework-review-actions">
                                <button type="button" className="homework-modal__revision" disabled={isSaving} onClick={() => handleReview('returned')}>
                                    На доработку
                                </button>
                                <button type="button" className="homework-modal__accept" disabled={isSaving} onClick={() => handleReview('accepted')}>
                                    Принять
                                </button>
                            </div>
                        </section>
                    )}

                    {homework.submissions?.length > 1 && (
                        <details className="homework-attempts">
                            <summary>История попыток ({homework.submissions.length})</summary>
                            {homework.submissions.slice(1).map((submission) => (
                                <article key={submission.id}>
                                    <strong>Попытка №{submission.attempt_number}</strong>
                                    <span>{formatHomeworkDate(submission.submitted_at)}</span>
                                    <p>{submission.answer_text || 'Ответ приложен файлом.'}</p>
                                    {submission.teacher_comment && <p>Комментарий: {submission.teacher_comment}</p>}
                                </article>
                            ))}
                        </details>
                    )}
                </div>

                <footer className="homework-modal__actions">
                    {canCancel && (
                        <button type="button" className="homework-modal__revision" onClick={handleCancel}>
                            Отменить задание
                        </button>
                    )}
                    <button type="button" onClick={onClose}>Закрыть</button>
                </footer>
            </section>
        </div>
    );
}
