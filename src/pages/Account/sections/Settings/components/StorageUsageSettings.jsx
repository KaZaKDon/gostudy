import {
    useCallback,
    useEffect,
    useState,
} from 'react';
import { useNavigate } from 'react-router-dom';

import { API } from '../../../../../api/api.js';
import { apiRequest } from '../../../../../api/apiRequest.js';
import { SettingsMessage } from './SettingsMessage.jsx';

const CATEGORY_META = {
    profile: {
        label: 'Профиль',
        description: 'Фотография и видеовизитка',
    },
    documents: {
        label: 'Документы',
        description: 'Дипломы и сертификаты',
    },
    messages: {
        label: 'Сообщения',
        description: 'Отправленные вложения',
    },
    homework: {
        label: 'Домашние задания',
        description: 'Задания и ответы',
    },
    classroom: {
        label: 'Класс',
        description: 'Материалы уроков',
    },
    disputes: {
        label: 'Споры',
        description: 'Подтверждающие файлы',
    },
    materials: {
        label: 'Личные материалы',
        description: 'Файлы авторской библиотеки',
    },
};

function formatBytes(value) {
    const bytes = Math.max(0, Number(value) || 0);
    if (bytes === 0) return '0 Б';

    const units = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'];
    const unitIndex = Math.min(
        units.length - 1,
        Math.floor(Math.log(bytes) / Math.log(1024)),
    );
    const amount = bytes / (1024 ** unitIndex);

    return `${new Intl.NumberFormat('ru-RU', {
        maximumFractionDigits: unitIndex === 0 ? 0 : 1,
    }).format(amount)} ${units[unitIndex]}`;
}

function formatFileCount(value) {
    const count = Math.max(0, Number(value) || 0);
    const lastTwoDigits = count % 100;
    const lastDigit = count % 10;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
        return `${count} файлов`;
    }
    if (lastDigit === 1) return `${count} файл`;
    if (lastDigit >= 2 && lastDigit <= 4) return `${count} файла`;
    return `${count} файлов`;
}

function formatDate(value) {
    if (!value) return '';

    return new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(new Date(value));
}

export function StorageUsageSettings({ role }) {
    const navigate = useNavigate();
    const [overview, setOverview] = useState(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [deletingFileId, setDeletingFileId] = useState('');

    const loadOverview = useCallback(
        (signal) => apiRequest(API.storageOverview, { signal }),
        [],
    );

    useEffect(() => {
        const controller = new AbortController();

        loadOverview(controller.signal)
            .then(setOverview)
            .catch((requestError) => {
                if (requestError.name !== 'AbortError') {
                    setError(requestError.message);
                }
            });

        return () => controller.abort();
    }, [loadOverview]);

    const percentage = Math.min(
        100,
        Math.max(0, Number(overview?.usage_percent) || 0),
    );

    const openCategory = (categoryId, entityId = null, sourceType = '') => {
        if (categoryId === 'profile' || categoryId === 'documents') {
            const step = categoryId === 'profile' && sourceType !== 'profile_video'
                ? 'basic'
                : 'documents';
            navigate(`/profile-start?role=${role}&mode=edit&step=${step}`);
            return;
        }

        const params = new URLSearchParams({ section: categoryId });

        if (categoryId === 'homework' && entityId) {
            params.set('homework', String(entityId));
        }
        if (categoryId === 'messages' && entityId) {
            params.set('dialog', String(entityId));
        }
        if (categoryId === 'materials' && entityId) {
            params.set('material', String(entityId));
        }
        if (categoryId === 'disputes' && entityId) {
            params.set('dispute', String(entityId));
        }
        if (categoryId === 'messages') {
            params.set('storage', '1');
        }

        navigate(`/account?${params.toString()}`);
    };

    const deleteClassroomFile = async (file) => {
        if (!file.file_id || !file.entity_id || deletingFileId) return;

        const confirmed = window.confirm(
            'Удалить этот материал урока?\n\n'
            + 'Ученик больше не сможет скачать файл. '
            + 'История занятия сохранится.',
        );
        if (!confirmed) return;

        setDeletingFileId(file.id);
        setError('');
        setNotice('');

        try {
            const result = await apiRequest(API.classroomDeleteFile, {
                method: 'POST',
                body: {
                    lesson_id: Number(file.entity_id),
                    file_id: Number(file.file_id),
                },
            });

            setNotice(result.message || 'Материал урока удалён');
            try {
                const refreshedOverview = await loadOverview();
                setOverview(refreshedOverview);
            } catch {
                setError(
                    'Материал удалён, но не удалось обновить '
                    + 'данные хранилища. Обновите страницу.',
                );
            }
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setDeletingFileId('');
        }
    };

    return (
        <section className="settings-panel">
            <header className="settings-panel__header">
                <span>Настройки</span>
                <h3>Хранилище</h3>
            </header>

            {overview ? (
                <div className="settings-storage-layout">
                    <section className="settings-storage">
                        <div className="settings-storage__summary">
                            <div>
                                <span>Использовано</span>
                                <strong>{formatBytes(overview.used_bytes)}</strong>
                            </div>
                            <div>
                                <span>Общий объём</span>
                                <strong>{formatBytes(overview.limit_bytes)}</strong>
                            </div>
                        </div>

                        <div
                            className="settings-storage__progress"
                            role="progressbar"
                            aria-label="Использование хранилища"
                            aria-valuemin="0"
                            aria-valuemax="100"
                            aria-valuenow={Math.round(percentage)}
                        >
                            <span style={{ width: `${percentage}%` }} />
                        </div>

                        <p>
                            Свободно {formatBytes(overview.remaining_bytes)}.
                            Учитываются файлы в сообщениях, домашних заданиях,
                            спорах, материалах, документах и профиле. Материалы
                            самой платформы GoStudy в личную квоту не входят.
                        </p>
                    </section>

                    <section className="settings-storage-details">
                        <header>
                            <div>
                                <span>Распределение места</span>
                                <h4>По разделам</h4>
                            </div>
                        </header>

                        <div className="settings-storage-categories">
                            {(overview.categories || []).map((category) => {
                                const meta = CATEGORY_META[category.id];
                                if (!meta) return null;

                                return (
                                    <button
                                        key={category.id}
                                        type="button"
                                        className="settings-storage-category"
                                        onClick={() => openCategory(category.id)}
                                    >
                                        <span>{meta.label}</span>
                                        <strong>{formatBytes(category.used_bytes)}</strong>
                                        <small>
                                            {formatFileCount(category.file_count)}
                                            {' · '}
                                            {meta.description}
                                        </small>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    <section className="settings-storage-details">
                        <header>
                            <div>
                                <span>Контроль объёма</span>
                                <h4>Самые крупные файлы</h4>
                            </div>
                            <small>До 10 файлов</small>
                        </header>

                        {(overview.largest_files || []).length > 0 ? (
                            <div className="settings-storage-files">
                                {overview.largest_files.map((file) => {
                                    const meta = CATEGORY_META[file.category];
                                    const canDeleteFromStorage = role === 'teacher'
                                        && file.source_type === 'classroom_file';
                                    const fileDetails = (
                                        <>
                                            <span className="settings-storage-file__name">
                                                <strong>{file.name}</strong>
                                                <small>
                                                    {file.context_title || meta?.label}
                                                    {file.created_at
                                                        ? ` · ${formatDate(file.created_at)}`
                                                        : ''}
                                                </small>
                                            </span>
                                            <span className="settings-storage-file__size">
                                                {formatBytes(file.size_bytes)}
                                            </span>
                                            <span className="settings-storage-file__action">
                                                {canDeleteFromStorage
                                                    ? 'Материал урока'
                                                    : 'Перейти'}
                                            </span>
                                        </>
                                    );

                                    return (
                                        <div
                                            key={file.id}
                                            className="settings-storage-file"
                                        >
                                            {canDeleteFromStorage ? (
                                                <div className="settings-storage-file__open settings-storage-file__open--static">
                                                    {fileDetails}
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="settings-storage-file__open"
                                                    onClick={() => openCategory(
                                                        file.category,
                                                        file.entity_id,
                                                        file.source_type,
                                                    )}
                                                >
                                                    {fileDetails}
                                                </button>
                                            )}
                                            {canDeleteFromStorage ? (
                                                <button
                                                    type="button"
                                                    className="settings-storage-file__delete"
                                                    disabled={Boolean(deletingFileId)}
                                                    onClick={() => deleteClassroomFile(file)}
                                                >
                                                    {deletingFileId === file.id
                                                        ? 'Удаляем…'
                                                        : 'Удалить'}
                                                </button>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="settings-storage-details__empty">
                                В хранилище пока нет файлов.
                            </p>
                        )}
                        <p className="settings-storage-details__hint">
                            Файлы класса можно удалить здесь и после завершения
                            урока. Остальные файлы удаляются в исходных разделах.
                            Отправленные сообщения и принятые домашние работы
                            сохраняются как часть истории обучения. Вложения
                            споров сохраняются вместе с историей решения.
                        </p>
                    </section>
                </div>
            ) : !error ? (
                <section className="settings-card">
                    <div>
                        <h4>Использование места</h4>
                        <p>Загружаем данные хранилища...</p>
                    </div>
                </section>
            ) : null}

            <SettingsMessage type="error">{error}</SettingsMessage>
            <SettingsMessage type="success">{notice}</SettingsMessage>
        </section>
    );
}
