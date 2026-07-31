import {
    DOCUMENT_STATUS_LABELS,
    DOCUMENT_TYPE_LABELS,
    VERIFICATION_LABELS,
} from '../constants.js';

export function DocumentsSettings({
    documents = [],
    profile,
    onManage,
}) {
    return (
        <div className="settings-documents">
            <section className="settings-documents__block">
                <div className="settings-documents__heading">
                    <div>
                        <h4>Документы преподавателя</h4>
                        <p>
                            Файлы доступны только преподавателю и модераторам.
                            Ученики видят лишь подтверждённые сведения.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="settings-panel__secondary"
                        onClick={onManage}
                    >
                        Управлять документами
                    </button>
                </div>

                {documents.length === 0 ? (
                    <p>Документы пока не загружены.</p>
                ) : (
                    <div className="settings-documents__list">
                        {documents.map((document) => (
                            <article
                                key={document.id}
                                className="settings-documents__certificate"
                            >
                                <div>
                                    <strong>
                                        {document.document_title
                                            || document.original_name
                                            || DOCUMENT_TYPE_LABELS[document.type]
                                            || 'Документ'}
                                    </strong>

                                    <small>
                                        {DOCUMENT_TYPE_LABELS[document.type]
                                            || document.type}
                                    </small>
                                </div>

                                <span
                                    className={
                                        document.status === 'approved'
                                            ? 'settings-status settings-status--success'
                                            : document.status === 'rejected'
                                                ? 'settings-status settings-status--error'
                                                : 'settings-status'
                                    }
                                >
                                    {DOCUMENT_STATUS_LABELS[document.status]
                                        || document.status}
                                </span>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            <section className="settings-documents__block">
                <h4>Проверка анкеты</h4>

                <p className="settings-documents__status">
                    {VERIFICATION_LABELS[profile?.verification_status]
                        || profile?.verification_status
                        || 'Не отправлена'}
                </p>

                {profile?.verification_comment && (
                    <p>{profile.verification_comment}</p>
                )}
            </section>
        </div>
    );
}
