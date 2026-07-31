import {
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    formatFileSize,
    validateSelectedFiles,
} from '../../../../../api/upload.js';

export function CreateHomeworkModal({
    options,
    isSaving,
    uploadLimits,
    initialRelationId = null,
    initialLessonId = null,
    onLoadOptions,
    onCreate,
    onClose,
}) {
    const [relationId, setRelationId] = useState(
        initialRelationId ? String(initialRelationId) : '',
    );
    const [lessonId, setLessonId] = useState(
        initialLessonId ? String(initialLessonId) : '',
    );
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [files, setFiles] = useState([]);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');

    useEffect(() => {
        onLoadOptions().catch((requestError) => {
            setError(requestError.message);
        });
    }, [onLoadOptions]);

    const availableLessons = useMemo(() => {
        const relation = options?.relations?.find(
            (item) => String(item.relation_id) === relationId,
        );

        if (!relation) {
            return [];
        }

        return (options.lessons || []).filter((lesson) =>
            Number(lesson.student_id) === Number(relation.student_id)
            && Number(lesson.subject_id) === Number(relation.subject_id));
    }, [options, relationId]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');

        try {
            await onCreate({
                relation_id: relationId,
                lesson_id: lessonId,
                title,
                description,
                due_date: dueDate,
            }, files, setProgress);
            onClose();
        } catch (submitError) {
            setError(submitError.message);
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

    return (
        <div className="homework-modal">
            <button
                type="button"
                className="homework-modal__overlay"
                aria-label="Закрыть"
                onClick={onClose}
            />

            <form className="homework-modal__panel" onSubmit={handleSubmit}>
                <header className="homework-modal__header">
                    <div>
                        <span>Новое задание</span>
                        <h2>Выдать домашнюю работу</h2>
                    </div>
                    <button type="button" className="homework-modal__close" onClick={onClose}>×</button>
                </header>

                <div className="homework-modal__form">
                    {error && <p className="homework-form__error">{error}</p>}

                    <label>
                        <span>Ученик и предмет</span>
                        <select
                            required
                            value={relationId}
                            onChange={(event) => {
                                setRelationId(event.target.value);
                                setLessonId('');
                            }}
                        >
                            <option value="">Выберите</option>
                            {(options?.relations || []).map((relation) => (
                                <option key={relation.relation_id} value={relation.relation_id}>
                                    {relation.student_name} · {relation.subject_name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        <span>Связать с уроком</span>
                        <select value={lessonId} onChange={(event) => setLessonId(event.target.value)}>
                            <option value="">Без привязки к уроку</option>
                            {availableLessons.map((lesson) => (
                                <option key={lesson.id} value={lesson.id}>
                                    {lesson.lesson_date} · {lesson.lesson_topic || lesson.subject_name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="homework-form__wide">
                        <span>Название</span>
                        <input required maxLength="255" value={title} onChange={(event) => setTitle(event.target.value)} />
                    </label>

                    <label className="homework-form__wide">
                        <span>Описание</span>
                        <textarea required rows="7" maxLength="20000" value={description} onChange={(event) => setDescription(event.target.value)} />
                    </label>

                    <label>
                        <span>Сдать до</span>
                        <input type="datetime-local" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
                        <small>Не раньше чем через 24 часа</small>
                    </label>

                    <label>
                        <span>Материалы</span>
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
                    </label>
                </div>

                <footer className="homework-modal__actions">
                    {isSaving && progress > 0 && <span>Загрузка: {progress}%</span>}
                    <button type="button" onClick={onClose}>Отмена</button>
                    <button type="submit" className="homework-modal__accept" disabled={isSaving}>
                        {isSaving ? 'Выдаём...' : 'Выдать задание'}
                    </button>
                </footer>
            </form>
        </div>
    );
}
