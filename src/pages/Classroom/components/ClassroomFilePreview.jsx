import { getFileTypeLabel } from '../utils/classroom.js';
import { ClassroomDocxPreview } from './ClassroomDocxPreview.jsx';
import { ClassroomPdfPreview } from './ClassroomPdfPreview.jsx';

export function ClassroomFilePreview({
    file,
    preview,
    onRetry,
    onDownload,
    page,
    canChangePage,
    onPageChange,
}) {
    if (!file) {
        return (
            <div className="classroom-workspace__placeholder">
                <strong>Материал не выбран</strong>
                <p>Выберите файл в панели «Материалы» слева.</p>
            </div>
        );
    }

    if (preview.status === 'loading' || preview.status === 'idle') {
        return (
            <div className="classroom-workspace__placeholder">
                <small>{getFileTypeLabel(file)}</small>
                <strong>{file.original_name}</strong>
                <p>Открываем защищённый материал...</p>
            </div>
        );
    }

    if (preview.status === 'error') {
        return (
            <div className="classroom-workspace__placeholder">
                <small>{getFileTypeLabel(file)}</small>
                <strong>{file.original_name}</strong>
                <p className="classroom-file-preview__error">
                    {preview.errorMessage}
                </p>
                <div className="classroom-file-preview__actions">
                    <button type="button" onClick={onRetry}>
                        Попробовать снова
                    </button>
                    <button type="button" onClick={() => onDownload(file)}>
                        Скачать материал
                    </button>
                </div>
            </div>
        );
    }

    if (preview.status === 'unsupported') {
        return (
            <div className="classroom-workspace__placeholder">
                <small>{getFileTypeLabel(file)}</small>
                <strong>{file.original_name}</strong>
                <p>
                    Этот формат браузер не может показать внутри класса без
                    преобразования. Материал можно скачать и открыть на
                    устройстве.
                </p>
                <button type="button" onClick={() => onDownload(file)}>
                    Скачать материал
                </button>
            </div>
        );
    }

    if (preview.kind === 'image') {
        return (
            <div className="classroom-file-preview classroom-file-preview--image">
                <img src={preview.objectUrl} alt={file.original_name} />
            </div>
        );
    }

    if (preview.kind === 'pdf') {
        return (
            <div className="classroom-file-preview classroom-file-preview--pdf">
                <ClassroomPdfPreview
                    sourceUrl={preview.objectUrl}
                    page={page}
                    canChangePage={canChangePage}
                    onPageChange={onPageChange}
                />
            </div>
        );
    }

    if (preview.kind === 'docx') {
        return (
            <div className="classroom-file-preview classroom-file-preview--docx">
                <ClassroomDocxPreview data={preview.data} />
            </div>
        );
    }

    return (
        <div className="classroom-file-preview classroom-file-preview--text">
            <pre>{preview.text}</pre>
        </div>
    );
}
