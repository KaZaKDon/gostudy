import { useState } from 'react';

import {
    formatFileSize,
    validateSelectedFiles,
} from '../../../api/upload.js';
import {
    formatClassroomDateTime,
    getFileTypeLabel,
} from '../utils/classroom.js';

const PANEL_TABS = [
    { id: 'materials', label: 'Материалы' },
    { id: 'homework', label: 'Домашнее' },
    { id: 'notes', label: 'Заметки', teacherOnly: true },
];

export function ClassroomSidePanel({
    role,
    activePanel,
    files,
    homework,
    teacherNote,
    uploadLimits,
    canManageFiles,
    isSaving,
    onChangePanel,
    onSelectFile,
    onOpenHomework,
    onCreateHomework,
    onSaveNote,
    onUploadFiles,
    onDeleteFile,
    onDownloadFile,
}) {
    const [noteText, setNoteText] = useState(teacherNote);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [notice, setNotice] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const visibleTabs = PANEL_TABS.filter(
        (tab) => !tab.teacherOnly || role === 'teacher',
    );

    const handleFilesChange = (event) => {
        setErrorMessage('');
        setNotice('');

        try {
            setSelectedFiles(validateSelectedFiles(
                event.target.files,
                uploadLimits,
            ));
        } catch (error) {
            event.target.value = '';
            setSelectedFiles([]);
            setErrorMessage(error.message);
        }
    };

    const handleUpload = async () => {
        if (!selectedFiles.length || isSaving) {
            return;
        }

        setErrorMessage('');
        setNotice('');
        setUploadProgress(0);

        try {
            const result = await onUploadFiles(
                selectedFiles,
                setUploadProgress,
            );
            setSelectedFiles([]);
            setNotice(result.message || 'Материалы добавлены');
        } catch (error) {
            setErrorMessage(error.message);
        }
    };

    const handleSaveNote = async () => {
        setErrorMessage('');
        setNotice('');

        try {
            const result = await onSaveNote(noteText);
            setNotice(result.message || 'Заметка сохранена');
        } catch (error) {
            setErrorMessage(error.message);
        }
    };

    const handleDeleteFile = async (file) => {
        if (!window.confirm(`Удалить материал «${file.original_name}»?`)) {
            return;
        }

        setErrorMessage('');
        setNotice('');

        try {
            const result = await onDeleteFile(file.id);
            setNotice(result.message || 'Материал удалён');
        } catch (error) {
            setErrorMessage(error.message);
        }
    };

    const handleDownloadFile = async (file) => {
        setErrorMessage('');

        try {
            await onDownloadFile(file);
        } catch (error) {
            setErrorMessage(error.message);
        }
    };

    return (
        <section className="classroom-card classroom-side-panel">
            <div className="classroom-side-panel__tabs">
                {visibleTabs.map((tab) => (
                    <button
                        type="button"
                        className={
                            activePanel === tab.id
                                ? 'classroom-side-panel__tab classroom-side-panel__tab--active'
                                : 'classroom-side-panel__tab'
                        }
                        key={tab.id}
                        onClick={() => onChangePanel(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="classroom-side-panel__content">
                {errorMessage && (
                    <p className="classroom-inline-error" role="alert">
                        {errorMessage}
                    </p>
                )}

                {notice && (
                    <p className="classroom-inline-notice">{notice}</p>
                )}

                {activePanel === 'materials' && (
                    <>
                        {files.length === 0 ? (
                            <p className="classroom-empty-text">
                                Материалы к уроку пока не добавлены.
                            </p>
                        ) : files.map((file) => (
                            <article className="classroom-material" key={file.id}>
                                <span>{getFileTypeLabel(file)}</span>
                                <strong>{file.original_name}</strong>
                                <small>{formatFileSize(file.file_size)}</small>

                                <div className="classroom-material__actions">
                                    <button
                                        type="button"
                                        onClick={() => onSelectFile(file)}
                                    >
                                        Открыть
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDownloadFile(file)}
                                    >
                                        Скачать
                                    </button>
                                    {canManageFiles && (
                                        <button
                                            type="button"
                                            className="is-danger"
                                            aria-label={`Удалить ${file.original_name}`}
                                            title="Удалить материал"
                                            onClick={() => handleDeleteFile(file)}
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            </article>
                        ))}

                        {role === 'teacher' && canManageFiles && (
                            <div className="classroom-file-upload">
                                <label>
                                    <span>Добавить материалы урока</span>
                                    <input
                                        type="file"
                                        multiple
                                        accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                                        disabled={isSaving}
                                        onChange={handleFilesChange}
                                    />
                                </label>

                                <small>
                                    До {uploadLimits.maxFiles} файлов,
                                    каждый до {formatFileSize(
                                        uploadLimits.maxFileBytes,
                                    )}
                                </small>

                                {selectedFiles.length > 0 && (
                                    <ul>
                                        {selectedFiles.map((file) => (
                                            <li key={`${file.name}:${file.size}`}>
                                                {file.name}
                                                <small>{formatFileSize(file.size)}</small>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                <button
                                    type="button"
                                    disabled={!selectedFiles.length || isSaving}
                                    onClick={handleUpload}
                                >
                                    {isSaving && uploadProgress > 0
                                        ? `Загрузка ${uploadProgress}%`
                                        : 'Загрузить'}
                                </button>
                            </div>
                        )}
                    </>
                )}

                {activePanel === 'homework' && (
                    <>
                        {homework.length === 0 ? (
                            <p className="classroom-empty-text">
                                Домашнее задание к уроку не выдавалось.
                            </p>
                        ) : homework.map((item) => (
                            <article
                                className="classroom-homework-preview"
                                key={item.id}
                            >
                                <span>
                                    {item.due_date
                                        ? `Сдать до ${formatClassroomDateTime(item.due_date)}`
                                        : 'Без срока сдачи'}
                                </span>
                                <h3>{item.title}</h3>
                                <p>{item.description}</p>
                                <button
                                    type="button"
                                    onClick={() => onOpenHomework(item.id)}
                                >
                                    Открыть задание
                                </button>
                            </article>
                        ))}

                        {role === 'teacher' && (
                            <button
                                type="button"
                                className="classroom-side-panel__primary"
                                onClick={onCreateHomework}
                            >
                                Выдать домашнее задание
                            </button>
                        )}
                    </>
                )}

                {activePanel === 'notes' && role === 'teacher' && (
                    <label className="classroom-notes">
                        <span>Личная заметка преподавателя</span>
                        <textarea
                            rows="8"
                            maxLength="5000"
                            value={noteText}
                            placeholder="Эту заметку ученик не увидит. После урока она будет доступна в журнале."
                            onChange={(event) => setNoteText(event.target.value)}
                        />
                        <small>{noteText.length} из 5000 символов</small>
                        <button
                            type="button"
                            disabled={isSaving || noteText === teacherNote}
                            onClick={handleSaveNote}
                        >
                            {isSaving ? 'Сохраняем...' : 'Сохранить заметку'}
                        </button>
                    </label>
                )}
            </div>
        </section>
    );
}
