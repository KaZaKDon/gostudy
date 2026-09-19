import {
    useEffect,
    useState,
} from 'react';

import {
    Badge,
    Button,
    EmptyState,
    Input,
    Loader,
    Modal,
    Pagination,
    Select,
} from '../../components/ui/index.js';
import { documentsApi } from '../../services/documentsApi.js';

import './documents.css';

const STATUS_LABELS = {
    pending: 'На проверке',
    approved: 'Подтверждён',
    rejected: 'Отклонён',
};
const STATUS_VARIANTS = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
};
const TYPE_LABELS = {
    diploma: 'Диплом',
    certificate: 'Сертификат',
    qualification: 'Повышение квалификации',
    other: 'Другой документ',
};
const STATUS_OPTIONS = [
    { value: '', label: 'Все статусы' },
    { value: 'pending', label: 'На проверке' },
    { value: 'approved', label: 'Подтверждённые' },
    { value: 'rejected', label: 'Отклонённые' },
];
const TYPE_OPTIONS = [
    { value: '', label: 'Все типы' },
    { value: 'diploma', label: 'Дипломы' },
    { value: 'certificate', label: 'Сертификаты' },
    { value: 'qualification', label: 'Повышение квалификации' },
    { value: 'other', label: 'Другие документы' },
];

function formatDate(value) {
    return value
        ? new Intl.DateTimeFormat('ru-RU', {
            dateStyle: 'short',
            timeStyle: 'short',
        }).format(new Date(value))
        : '—';
}

function formatFileSize(bytes) {
    const value = Number(bytes || 0);
    if (value < 1024) return `${value} Б`;
    if (value < 1024 * 1024) return `${Math.round(value / 1024)} КБ`;
    return `${(value / 1024 / 1024).toFixed(1)} МБ`;
}

function DocumentModal({
    document,
    isSaving,
    isOpening,
    error,
    onClose,
    onOpenFile,
    onModerate,
}) {
    const [comment, setComment] = useState('');
    const [validationError, setValidationError] = useState('');

    if (!document) return null;

    async function decide(decision) {
        const reason = comment.trim();
        if (decision === 'rejected' && !reason) {
            setValidationError('Укажите причину отклонения');
            return;
        }
        setValidationError('');
        await onModerate(document.id, decision, reason);
    }

    const footer = (
        <>
            <Button
                variant="secondary"
                loading={isOpening}
                onClick={() => onOpenFile(document.id)}
            >
                Открыть файл
            </Button>
            {document.status === 'pending' && (
                <>
                    <Button
                        variant="danger"
                        loading={isSaving}
                        onClick={() => decide('rejected')}
                    >
                        Отклонить
                    </Button>
                    <Button
                        variant="primary"
                        loading={isSaving}
                        onClick={() => decide('approved')}
                    >
                        Подтвердить
                    </Button>
                </>
            )}
        </>
    );

    return (
        <Modal
            isOpen
            title={`Документ №${document.id}`}
            description={`${document.teacher_name || 'Преподаватель'} · ${TYPE_LABELS[document.type] || 'Документ'}`}
            footer={footer}
            onClose={onClose}
        >
            <div className="documents-review">
                <div className="documents-review__grid">
                    <div>
                        <span>Преподаватель</span>
                        <strong>{document.teacher_name || '—'}</strong>
                        <small>{document.teacher_email || '—'}</small>
                    </div>
                    <div>
                        <span>Статус</span>
                        <Badge variant={STATUS_VARIANTS[document.status] || 'default'}>
                            {STATUS_LABELS[document.status] || document.status}
                        </Badge>
                    </div>
                    <div>
                        <span>Название</span>
                        <strong>{document.document_title}</strong>
                    </div>
                    <div>
                        <span>Организация</span>
                        <strong>{document.institution || '—'}</strong>
                    </div>
                    <div>
                        <span>Год</span>
                        <strong>{document.document_year || '—'}</strong>
                    </div>
                    <div>
                        <span>Файл</span>
                        <strong>{document.original_name}</strong>
                        <small>{formatFileSize(document.file_size)}</small>
                    </div>
                </div>

                {document.reject_reason && (
                    <section className="documents-review__reason">
                        <span>Причина отклонения</span>
                        <p>{document.reject_reason}</p>
                    </section>
                )}

                {document.status === 'pending' && (
                    <Input
                        multiline
                        rows={4}
                        label="Комментарий модератора"
                        value={comment}
                        maxLength="2000"
                        helperText="Причина обязательна только при отклонении."
                        onChange={(event) => setComment(event.target.value)}
                    />
                )}

                {(validationError || error) && (
                    <div className="admin-alert">
                        {validationError || error}
                    </div>
                )}
            </div>
        </Modal>
    );
}

export function DocumentsPage() {
    const [filters, setFilters] = useState({ q: '', status: 'pending', type: '' });
    const [page, setPage] = useState(1);
    const [documents, setDocuments] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, pages: 0, total: 0 });
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isOpening, setIsOpening] = useState(false);
    const [error, setError] = useState('');
    const [modalError, setModalError] = useState('');
    const [notice, setNotice] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        let active = true;
        const timer = window.setTimeout(async () => {
            setIsLoading(true);
            setError('');
            try {
                const result = await documentsApi.list({
                    ...filters,
                    page,
                    limit: 20,
                });
                if (!active) return;
                setDocuments(result.data?.items || []);
                setPagination(result.data?.pagination || { page: 1, pages: 0, total: 0 });
            } catch (requestError) {
                if (active) {
                    setError(requestError.message || 'Не удалось загрузить документы');
                }
            } finally {
                if (active) setIsLoading(false);
            }
        }, 250);

        return () => {
            active = false;
            window.clearTimeout(timer);
        };
    }, [filters, page, refreshKey]);

    function changeFilter(name, value) {
        setFilters((current) => ({ ...current, [name]: value }));
        setPage(1);
    }

    async function openFile(documentId) {
        setIsOpening(true);
        setModalError('');
        try {
            await documentsApi.openFile(documentId);
        } catch (requestError) {
            setModalError(requestError.message || 'Не удалось открыть документ');
        } finally {
            setIsOpening(false);
        }
    }

    async function moderate(documentId, decision, comment) {
        setIsSaving(true);
        setModalError('');
        try {
            const result = await documentsApi.moderate(
                documentId,
                decision,
                comment,
            );
            setNotice(result.message || 'Решение сохранено');
            setSelectedDocument(null);
            setRefreshKey((value) => value + 1);
        } catch (requestError) {
            setModalError(requestError.message || 'Не удалось сохранить решение');
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="admin-page documents-admin-page">
            <header className="documents-admin-page__header">
                <div>
                    <span>Закрытое хранилище</span>
                    <h1>Документы преподавателей</h1>
                    <p>Файлы открываются только после авторизации администратора или модератора.</p>
                </div>
                <Button
                    variant="secondary"
                    onClick={() => setRefreshKey((value) => value + 1)}
                >
                    Обновить
                </Button>
            </header>

            <section className="documents-admin-page__filters">
                <Input
                    label="Поиск"
                    type="search"
                    placeholder="Преподаватель, email, документ или ID"
                    value={filters.q}
                    onChange={(event) => changeFilter('q', event.target.value)}
                />
                <Select
                    label="Статус"
                    value={filters.status}
                    options={STATUS_OPTIONS}
                    onChange={(event) => changeFilter('status', event.target.value)}
                />
                <Select
                    label="Тип"
                    value={filters.type}
                    options={TYPE_OPTIONS}
                    onChange={(event) => changeFilter('type', event.target.value)}
                />
            </section>

            {error && <div className="admin-alert">{error}</div>}
            {notice && <div className="admin-alert documents-admin-page__success">{notice}</div>}

            {isLoading ? (
                <Loader text="Загружаем документы..." />
            ) : documents.length === 0 ? (
                <EmptyState
                    title="Документов не найдено"
                    description="Измените фильтры или дождитесь новой загрузки преподавателя."
                />
            ) : (
                <div className="documents-admin-list">
                    {documents.map((document) => (
                        <article className="documents-admin-card" key={document.id}>
                            <div>
                                <span>№{document.id} · {formatDate(document.created_at)}</span>
                                <h2>{document.teacher_name || document.teacher_email}</h2>
                                <p>{document.document_title}</p>
                                <small>{document.original_name} · {formatFileSize(document.file_size)}</small>
                            </div>
                            <strong>{TYPE_LABELS[document.type] || document.type}</strong>
                            <Badge variant={STATUS_VARIANTS[document.status] || 'default'}>
                                {STATUS_LABELS[document.status] || document.status}
                            </Badge>
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                    setModalError('');
                                    setSelectedDocument(document);
                                }}
                            >
                                Проверить
                            </Button>
                        </article>
                    ))}
                </div>
            )}

            <Pagination
                page={pagination.page}
                pages={pagination.pages}
                total={pagination.total}
                onPageChange={setPage}
            />

            <DocumentModal
                key={selectedDocument?.id || 'closed'}
                document={selectedDocument}
                isSaving={isSaving}
                isOpening={isOpening}
                error={modalError}
                onClose={() => setSelectedDocument(null)}
                onOpenFile={openFile}
                onModerate={moderate}
            />
        </div>
    );
}
