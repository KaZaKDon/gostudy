import { formatFileSize } from '../../../../api/upload.js';

const DOCUMENT_STATUS_LABELS = {
    pending: 'На проверке',
    approved: 'Подтверждён',
    rejected: 'Отклонён',
};

const DOCUMENT_TYPE_LABELS = {
    diploma: 'Диплом',
    certificate: 'Сертификат',
    qualification: 'Повышение квалификации',
    other: 'Другой документ',
};

function DocumentList({
    documents,
    deletingDocumentId,
    onDeleteDocument,
}) {
    if (documents.length === 0) {
        return null;
    }

    return (
        <div className="teacher-profile-document-list">
            {documents.map((document) => (
                <article
                    key={document.id}
                    className="teacher-profile-document"
                >
                    <div>
                        <span className="teacher-profile-document__type">
                            {DOCUMENT_TYPE_LABELS[document.type] || 'Документ'}
                        </span>
                        <strong>
                            {document.document_title
                                || document.original_name
                                || `Документ №${document.id}`}
                        </strong>
                        <small>
                            {document.original_name}
                            {document.file_size
                                ? ` · ${formatFileSize(document.file_size)}`
                                : ''}
                        </small>
                        <span className={`teacher-profile-document__status teacher-profile-document__status--${document.status}`}>
                            {DOCUMENT_STATUS_LABELS[document.status] || document.status}
                        </span>
                        {document.reject_reason && (
                            <p>{document.reject_reason}</p>
                        )}
                    </div>

                    <button
                        type="button"
                        className="teacher-profile-upload-remove"
                        disabled={deletingDocumentId === Number(document.id)}
                        onClick={() => onDeleteDocument(Number(document.id))}
                    >
                        {deletingDocumentId === Number(document.id)
                            ? 'Удаляем...'
                            : 'Удалить'}
                    </button>
                </article>
            ))}
        </div>
    );
}

export function StepDocuments({
    profile,
    documents,
    isUploadingDocument,
    documentProgress,
    deletingDocumentId,
    isUploadingVideo,
    videoProgress,
    documentMaxBytes,
    videoMaxBytes,
    onDocumentSelect,
    onDeleteDocument,
    onVideoSelect,
    onDeleteVideo,
}) {
    return (
        <div className="teacher-profile-step">
            <div className="teacher-profile-step__head">
                <h2>Документы и видеовизитка</h2>
                <p>
                    Документы доступны только модераторам. Ученики увидят
                    подтверждённые сведения, фотографию и видеовизитку.
                </p>
            </div>

            <div className="teacher-profile-info-box">
                <h3>Безопасность документов</h3>
                <p>
                    Файлы дипломов и сертификатов хранятся в закрытой папке вне
                    публичной части сайта и выдаются только после авторизации модератора.
                </p>
            </div>

            <section className="teacher-profile-upload-card">
                <div>
                    <h3>Диплом или документ об образовании</h3>
                    <p>
                        PDF, JPG, PNG или WebP, до{' '}
                        {formatFileSize(documentMaxBytes || 10 * 1024 * 1024)} каждый.
                    </p>
                </div>

                <label className="teacher-profile-upload-button">
                    <input
                        type="file"
                        accept="application/pdf,image/jpeg,image/png,image/webp"
                        multiple
                        disabled={isUploadingDocument}
                        onChange={(event) => {
                            const files = Array.from(event.target.files || []);
                            event.target.value = '';

                            if (files.length > 0) {
                                onDocumentSelect(files, 'diploma');
                            }
                        }}
                    />
                    <span>
                        {isUploadingDocument
                            ? `Загрузка ${documentProgress}%`
                            : 'Загрузить диплом'}
                    </span>
                </label>
            </section>

            <section className="teacher-profile-upload-card">
                <div>
                    <h3>Сертификаты и повышение квалификации</h3>
                    <p>Можно выбрать несколько файлов сразу.</p>
                </div>

                <label className="teacher-profile-upload-button">
                    <input
                        type="file"
                        accept="application/pdf,image/jpeg,image/png,image/webp"
                        multiple
                        disabled={isUploadingDocument}
                        onChange={(event) => {
                            const files = Array.from(event.target.files || []);
                            event.target.value = '';

                            if (files.length > 0) {
                                onDocumentSelect(files, 'certificate');
                            }
                        }}
                    />
                    <span>
                        {isUploadingDocument
                            ? `Загрузка ${documentProgress}%`
                            : 'Загрузить сертификаты'}
                    </span>
                </label>
            </section>

            {isUploadingDocument && (
                <div className="teacher-profile-upload-progress">
                    <span style={{ width: `${documentProgress}%` }} />
                </div>
            )}

            <DocumentList
                documents={documents}
                deletingDocumentId={deletingDocumentId}
                onDeleteDocument={onDeleteDocument}
            />

            <section className="teacher-profile-upload-card">
                <div>
                    <h3>Видеовизитка</h3>
                    <p>
                        MP4 или WebM, до{' '}
                        {formatFileSize(videoMaxBytes || 100 * 1024 * 1024)}.
                        Загрузить можно только один ролик.
                    </p>
                </div>

                {profile.intro_video_url && (
                    <video
                        className="teacher-profile-upload-card__video"
                        src={profile.intro_video_url}
                        controls
                        preload="metadata"
                    >
                        Ваш браузер не поддерживает видео.
                    </video>
                )}

                <div className="teacher-profile-upload-card__actions">
                    <label className="teacher-profile-upload-button">
                        <input
                            type="file"
                            accept="video/mp4,video/webm"
                            disabled={isUploadingVideo}
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                event.target.value = '';

                                if (file) {
                                    onVideoSelect(file);
                                }
                            }}
                        />
                        <span>
                            {isUploadingVideo
                                ? `Загрузка ${videoProgress}%`
                                : profile.intro_video_url
                                    ? 'Заменить видео'
                                    : 'Загрузить видео'}
                        </span>
                    </label>

                    {profile.intro_video_url && (
                        <button
                            type="button"
                            className="teacher-profile-upload-remove"
                            disabled={isUploadingVideo}
                            onClick={onDeleteVideo}
                        >
                            Удалить
                        </button>
                    )}
                </div>

                {isUploadingVideo && (
                    <div className="teacher-profile-upload-progress">
                        <span style={{ width: `${videoProgress}%` }} />
                    </div>
                )}
            </section>
        </div>
    );
}
