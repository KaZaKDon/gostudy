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
import { profileMediaApi } from '../../services/profileMediaApi.js';

import '../Documents/documents.css';

const STATUS_LABELS = {
    pending: 'На проверке',
    approved: 'Подтверждён',
    rejected: 'Отклонён',
    replaced: 'Заменён',
};
const STATUS_VARIANTS = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
    replaced: 'default',
};
const TYPE_LABELS = {
    photo: 'Фотография',
    video: 'Видеовизитка',
};
const STATUS_OPTIONS = [
    { value: '', label: 'Все статусы' },
    { value: 'pending', label: 'На проверке' },
    { value: 'approved', label: 'Подтверждённые' },
    { value: 'rejected', label: 'Отклонённые' },
    { value: 'replaced', label: 'Заменённые' },
];
const TYPE_OPTIONS = [
    { value: '', label: 'Фото и видео' },
    { value: 'photo', label: 'Фотографии' },
    { value: 'video', label: 'Видеовизитки' },
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

function ReviewModal({
    item,
    isSaving,
    isOpening,
    error,
    onClose,
    onOpenFile,
    onModerate,
}) {
    const [comment, setComment] = useState('');
    const [validationError, setValidationError] = useState('');
    if (!item) return null;

    async function decide(decision) {
        const reason = comment.trim();
        if (decision === 'rejected' && !reason) {
            setValidationError('Укажите причину отклонения');
            return;
        }
        setValidationError('');
        await onModerate(item.id, decision, reason);
    }

    return (
        <Modal
            isOpen
            title={`${TYPE_LABELS[item.type]} №${item.id}`}
            description={item.teacher_name || item.teacher_email}
            onClose={onClose}
            footer={(
                <>
                    <Button
                        variant="secondary"
                        loading={isOpening}
                        onClick={() => onOpenFile(item.id)}
                    >
                        Открыть файл
                    </Button>
                    {item.status === 'pending' && (
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
            )}
        >
            <div className="documents-review">
                <div className="documents-review__grid">
                    <div>
                        <span>Преподаватель</span>
                        <strong>{item.teacher_name || '—'}</strong>
                        <small>{item.teacher_email || '—'}</small>
                    </div>
                    <div>
                        <span>Статус</span>
                        <Badge variant={STATUS_VARIANTS[item.status] || 'default'}>
                            {STATUS_LABELS[item.status] || item.status}
                        </Badge>
                    </div>
                    <div>
                        <span>Тип</span>
                        <strong>{TYPE_LABELS[item.type]}</strong>
                    </div>
                    <div>
                        <span>Файл</span>
                        <strong>{item.original_name}</strong>
                        <small>{formatFileSize(item.file_size)}</small>
                    </div>
                </div>

                {item.reject_reason && (
                    <section className="documents-review__reason">
                        <span>Причина отклонения</span>
                        <p>{item.reject_reason}</p>
                    </section>
                )}

                {item.status === 'pending' && (
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

export function ProfileMediaPage() {
    const [filters, setFilters] = useState({ q: '', status: 'pending', type: '' });
    const [page, setPage] = useState(1);
    const [items, setItems] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, pages: 0, total: 0 });
    const [selected, setSelected] = useState(null);
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
                const result = await profileMediaApi.list({
                    ...filters,
                    page,
                    limit: 20,
                });
                if (!active) return;
                setItems(result.data?.items || []);
                setPagination(result.data?.pagination || {
                    page: 1,
                    pages: 0,
                    total: 0,
                });
            } catch (requestError) {
                if (active) {
                    setError(requestError.message || 'Не удалось загрузить файлы');
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

    async function openFile(id) {
        setIsOpening(true);
        setModalError('');
        try {
            await profileMediaApi.openFile(id);
        } catch (requestError) {
            setModalError(requestError.message || 'Не удалось открыть файл');
        } finally {
            setIsOpening(false);
        }
    }

    async function moderate(id, decision, comment) {
        setIsSaving(true);
        setModalError('');
        try {
            const result = await profileMediaApi.moderate(id, decision, comment);
            setNotice(result.message || 'Решение сохранено');
            setSelected(null);
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
                    <span>Публичная анкета</span>
                    <h1>Фото и видеовизитки</h1>
                    <p>Новый файл публикуется только после проверки модератором.</p>
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
                    placeholder="Преподаватель, email, файл или ID"
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
                <Loader text="Загружаем фото и видео..." />
            ) : items.length === 0 ? (
                <EmptyState
                    title="Файлов не найдено"
                    description="Измените фильтры или дождитесь новой загрузки преподавателя."
                />
            ) : (
                <div className="documents-admin-list">
                    {items.map((item) => (
                        <article className="documents-admin-card" key={item.id}>
                            <div>
                                <span>№{item.id} · {formatDate(item.created_at)}</span>
                                <h2>{item.teacher_name || item.teacher_email}</h2>
                                <p>{item.original_name}</p>
                                <small>{formatFileSize(item.file_size)}</small>
                            </div>
                            <strong>{TYPE_LABELS[item.type]}</strong>
                            <Badge variant={STATUS_VARIANTS[item.status] || 'default'}>
                                {STATUS_LABELS[item.status] || item.status}
                            </Badge>
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                    setModalError('');
                                    setSelected(item);
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

            <ReviewModal
                key={selected?.id || 'closed'}
                item={selected}
                isSaving={isSaving}
                isOpening={isOpening}
                error={modalError}
                onClose={() => setSelected(null)}
                onOpenFile={openFile}
                onModerate={moderate}
            />
        </div>
    );
}
