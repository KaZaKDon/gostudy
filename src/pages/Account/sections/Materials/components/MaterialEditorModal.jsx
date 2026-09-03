import {
    useEffect,
    useState,
} from 'react';

import {
    formatFileSize,
    validateSelectedFiles,
} from '../../../../../api/upload.js';

export function MaterialEditorModal({
    material,
    options,
    uploadLimits,
    isSaving,
    onLoadOptions,
    onCreate,
    onUpdate,
    onClose,
}) {
    const isEditing = Boolean(material);
    const [subjectId, setSubjectId] = useState(String(material?.subject_id || ''));
    const [category, setCategory] = useState(material?.category || 'extra');
    const [title, setTitle] = useState(material?.title || '');
    const [description, setDescription] = useState(material?.description || '');
    const [accessType, setAccessType] = useState(material?.access_type || 'free');
    const [priceRub, setPriceRub] = useState(material?.price_rub || '');
    const [publicationMode, setPublicationMode] = useState('private');
    const [linkType, setLinkType] = useState('');
    const [externalUrl, setExternalUrl] = useState('');
    const [linkTitle, setLinkTitle] = useState('');
    const [files, setFiles] = useState([]);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');

    useEffect(() => {
        onLoadOptions().catch((requestError) => setError(requestError.message));
    }, [onLoadOptions]);

    const handleFiles = (event) => {
        try {
            setFiles(validateSelectedFiles(event.target.files, uploadLimits));
            setError('');
        } catch (validationError) {
            setFiles([]);
            event.target.value = '';
            setError(validationError.message);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        try {
            const fields = {
                subject_id: Number(subjectId),
                category,
                title,
                description,
                access_type: accessType,
                ...(accessType === 'paid' ? { price_rub: Number(priceRub) } : {}),
            };
            if (isEditing) {
                await onUpdate(material.id, fields);
            } else {
                await onCreate({
                    ...fields,
                    publication_mode: publicationMode,
                    link_type: linkType,
                    external_url: externalUrl,
                    link_title: linkTitle,
                }, files, setProgress);
            }
            onClose();
        } catch (submitError) {
            setError(submitError.message);
        }
    };

    return (
        <div className="material-modal">
            <button type="button" className="material-modal__overlay" aria-label="Закрыть" onClick={onClose} />
            <form className="material-modal__panel" onSubmit={handleSubmit}>
                <header className="material-modal__header">
                    <div>
                        <span>{isEditing ? 'Редактирование' : 'Личная библиотека'}</span>
                        <h2>{isEditing ? 'Изменить материал' : 'Загрузить материал'}</h2>
                    </div>
                    <button type="button" onClick={onClose}>×</button>
                </header>

                <div className="material-modal__form">
                    {error && <p className="materials-message materials-message--error">{error}</p>}

                    <label>
                        <span>Предмет</span>
                        <select required value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
                            <option value="">Выберите предмет</option>
                            {(options?.subjects || []).map((subject) => (
                                <option key={subject.id} value={subject.id}>{subject.name}</option>
                            ))}
                        </select>
                    </label>

                    <label>
                        <span>Раздел</span>
                        <select value={category} onChange={(event) => setCategory(event.target.value)}>
                            <option value="textbook">Учебники</option>
                            <option value="trainer">Тренажёры</option>
                            <option value="extra">Дополнительные материалы</option>
                        </select>
                    </label>

                    <label className="material-modal__wide">
                        <span>Название</span>
                        <input required maxLength="255" value={title} onChange={(event) => setTitle(event.target.value)} />
                    </label>

                    <label className="material-modal__wide">
                        <span>Описание</span>
                        <textarea rows="5" maxLength="10000" value={description} onChange={(event) => setDescription(event.target.value)} />
                    </label>

                    <label>
                        <span>Доступ</span>
                        <select value={accessType} onChange={(event) => setAccessType(event.target.value)}>
                            <option value="free">Бесплатно</option>
                            <option value="paid">Платно</option>
                        </select>
                    </label>

                    {accessType === 'paid' && (
                        <label>
                            <span>Цена, ₽</span>
                            <input required type="number" min="1" max="1000000" step="0.01" value={priceRub} onChange={(event) => setPriceRub(event.target.value)} />
                            <small>Продажа пока будет показана как «Скоро».</small>
                        </label>
                    )}

                    {!isEditing && (
                        <>
                            <label>
                                <span>Размещение</span>
                                <select value={publicationMode} onChange={(event) => setPublicationMode(event.target.value)}>
                                    <option value="private">Только личная библиотека</option>
                                    <option value="public">Отправить в общий каталог</option>
                                </select>
                                <small>Общий каталог требует модерации.</small>
                            </label>

                            <label>
                                <span>Ссылка</span>
                                <select value={linkType} onChange={(event) => setLinkType(event.target.value)}>
                                    <option value="">Без ссылки</option>
                                    <option value="external_link">Внешний материал</option>
                                    <option value="interactive_link">Интерактивный тренажёр</option>
                                </select>
                            </label>

                            {linkType && (
                                <>
                                    <label className="material-modal__wide">
                                        <span>Адрес ссылки</span>
                                        <input required type="url" maxLength="2000" placeholder="https://..." value={externalUrl} onChange={(event) => setExternalUrl(event.target.value)} />
                                    </label>
                                    <label className="material-modal__wide">
                                        <span>Название ссылки</span>
                                        <input maxLength="255" value={linkTitle} onChange={(event) => setLinkTitle(event.target.value)} />
                                    </label>
                                </>
                            )}

                            <label className="material-modal__wide">
                                <span>Файлы</span>
                                <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx" onChange={handleFiles} />
                                <small>
                                    Можно загрузить файлы, указать ссылку или использовать оба варианта. До {uploadLimits.maxFiles} файлов, каждый до {formatFileSize(uploadLimits.maxFileBytes)}.
                                </small>
                                {files.length > 0 && (
                                    <ul className="material-selected-files">
                                        {files.map((file) => (
                                            <li key={`${file.name}:${file.size}`}>
                                                <span>{file.name}</span>
                                                <small>{formatFileSize(file.size)}</small>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </label>
                        </>
                    )}

                    {isEditing && (
                        <p className="material-modal__hint material-modal__wide">
                            Файлы и ссылки сохраняются без изменений. После редактирования опубликованный материал снова отправится на модерацию.
                        </p>
                    )}
                </div>

                <footer className="material-modal__actions">
                    {isSaving && progress > 0 && <span>Загрузка: {progress}%</span>}
                    <button type="button" onClick={onClose}>Отмена</button>
                    <button type="submit" className="material-modal__accept" disabled={isSaving}>
                        {isSaving ? 'Сохраняем...' : 'Сохранить'}
                    </button>
                </footer>
            </form>
        </div>
    );
}
