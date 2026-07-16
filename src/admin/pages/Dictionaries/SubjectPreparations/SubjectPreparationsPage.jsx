import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    Button,
    EmptyState,
    Input,
    Loader,
} from '../../../components/ui/index.js';

import {
    dictionariesApi,
} from '../../../services/dictionariesApi.js';

import './subjectPreparations.css';

function groupItems(items, groupKey = 'group_id') {
    return items.reduce(
        (groups, item) => {
            const key = String(item[groupKey]);

            if (!groups[key]) {
                groups[key] = [];
            }

            groups[key].push(item);

            return groups;
        },
        {},
    );
}

function normalizeLinks(links) {
    return [...links]
        .sort(
            (first, second) => (
                first.sort_order
                - second.sort_order
            ),
        )
        .map(
            (link) => link.preparation_id,
        );
}

function areIdListsEqual(firstIds, secondIds) {
    if (firstIds.length !== secondIds.length) {
        return false;
    }

    return firstIds.every(
        (id, index) => (
            id === secondIds[index]
        ),
    );
}

export function SubjectPreparationsPage() {
    const [subjects, setSubjects] =
        useState([]);

    const [
        preparationGroups,
        setPreparationGroups,
    ] = useState([]);

    const [preparations, setPreparations] =
        useState([]);

    const [
        selectedSubjectId,
        setSelectedSubjectId,
    ] = useState(null);

    const [
        selectedPreparationIds,
        setSelectedPreparationIds,
    ] = useState([]);

    const [
        savedPreparationIds,
        setSavedPreparationIds,
    ] = useState([]);

    const [
        subjectSearch,
        setSubjectSearch,
    ] = useState('');

    const [
        preparationSearch,
        setPreparationSearch,
    ] = useState('');

    const [isLoading, setIsLoading] =
        useState(true);

    const [
        isLinksLoading,
        setIsLinksLoading,
    ] = useState(false);

    const [isSaving, setIsSaving] =
        useState(false);

    const [error, setError] =
        useState('');

    const [
        successMessage,
        setSuccessMessage,
    ] = useState('');

    const isDirty = useMemo(
        () => (
            !areIdListsEqual(
                selectedPreparationIds,
                savedPreparationIds,
            )
        ),
        [
            savedPreparationIds,
            selectedPreparationIds,
        ],
    );

    useEffect(() => {
        if (!isDirty) {
            return undefined;
        }

        function handleBeforeUnload(event) {
            event.preventDefault();

            event.returnValue = '';
        }

        window.addEventListener(
            'beforeunload',
            handleBeforeUnload,
        );

        return () => {
            window.removeEventListener(
                'beforeunload',
                handleBeforeUnload,
            );
        };
    }, [isDirty]);

    const loadSubjectLinks = useCallback(
        async (subjectId) => {
            setIsLinksLoading(true);
            setError('');
            setSuccessMessage('');

            try {
                const response =
                    await dictionariesApi
                        .getSubjectPreparationLinks(
                            subjectId,
                        );

                if (!response?.success) {
                    throw new Error(
                        response?.message
                        || 'Не удалось загрузить связи предмета',
                    );
                }

                const loadedIds = normalizeLinks(
                    response.data?.links ?? [],
                );

                setSelectedPreparationIds(
                    loadedIds,
                );

                setSavedPreparationIds(
                    loadedIds,
                );

                return true;
            } catch (requestError) {
                setSelectedPreparationIds([]);
                setSavedPreparationIds([]);

                setError(
                    requestError.message
                    || 'Не удалось загрузить связи предмета',
                );

                return false;
            } finally {
                setIsLinksLoading(false);
            }
        },
        [],
    );

    useEffect(() => {
        let isActive = true;

        async function initializePage() {
            try {
                const response =
                    await dictionariesApi
                        .getSubjectPreparationsData();

                if (!response?.success) {
                    throw new Error(
                        response?.message
                        || 'Не удалось загрузить данные страницы',
                    );
                }

                if (!isActive) {
                    return;
                }

                const loadedSubjects =
                    response.data?.subjects
                    ?? [];

                setSubjects(
                    loadedSubjects,
                );

                setPreparationGroups(
                    response.data
                        ?.preparation_groups
                    ?? [],
                );

                setPreparations(
                    response.data
                        ?.preparations
                    ?? [],
                );

                const firstSubject =
                    loadedSubjects[0]
                    ?? null;

                if (!firstSubject) {
                    return;
                }

                setSelectedSubjectId(
                    firstSubject.id,
                );

                const linksResponse =
                    await dictionariesApi
                        .getSubjectPreparationLinks(
                            firstSubject.id,
                        );

                if (!isActive) {
                    return;
                }

                if (!linksResponse?.success) {
                    throw new Error(
                        linksResponse?.message
                        || 'Не удалось загрузить связи предмета',
                    );
                }

                const loadedIds = normalizeLinks(
                    linksResponse.data?.links
                    ?? [],
                );

                setSelectedPreparationIds(
                    loadedIds,
                );

                setSavedPreparationIds(
                    loadedIds,
                );
            } catch (requestError) {
                if (!isActive) {
                    return;
                }

                setError(
                    requestError.message
                    || 'Не удалось загрузить данные страницы',
                );
            } finally {
                if (isActive) {
                    setIsLoading(false);
                }
            }
        }

        initializePage();

        return () => {
            isActive = false;
        };
    }, []);

    const selectedSubject = useMemo(
        () => (
            subjects.find(
                (subject) => (
                    subject.id
                    === selectedSubjectId
                ),
            ) ?? null
        ),
        [
            selectedSubjectId,
            subjects,
        ],
    );

    const filteredSubjects = useMemo(
        () => {
            const search =
                subjectSearch
                    .trim()
                    .toLowerCase();

            if (!search) {
                return subjects;
            }

            return subjects.filter(
                (subject) => (
                    subject.name
                        .toLowerCase()
                        .includes(search)
                    || subject.group_name
                        .toLowerCase()
                        .includes(search)
                    || subject.slug
                        .toLowerCase()
                        .includes(search)
                ),
            );
        },
        [
            subjectSearch,
            subjects,
        ],
    );

    const groupedSubjects = useMemo(
        () => groupItems(
            filteredSubjects,
        ),
        [filteredSubjects],
    );

    const filteredPreparations = useMemo(
        () => {
            const search =
                preparationSearch
                    .trim()
                    .toLowerCase();

            if (!search) {
                return preparations;
            }

            return preparations.filter(
                (preparation) => (
                    preparation.name
                        .toLowerCase()
                        .includes(search)
                    || preparation.group_name
                        .toLowerCase()
                        .includes(search)
                    || preparation.slug
                        .toLowerCase()
                        .includes(search)
                ),
            );
        },
        [
            preparationSearch,
            preparations,
        ],
    );

    const groupedPreparations = useMemo(
        () => groupItems(
            filteredPreparations,
        ),
        [filteredPreparations],
    );

    const selectedPreparations = useMemo(
        () => (
            selectedPreparationIds
                .map((preparationId) => (
                    preparations.find(
                        (preparation) => (
                            preparation.id
                            === preparationId
                        ),
                    )
                ))
                .filter(Boolean)
        ),
        [
            preparations,
            selectedPreparationIds,
        ],
    );

    async function handleSubjectSelect(
        subjectId,
    ) {
        if (
            subjectId === selectedSubjectId
            || isLinksLoading
            || isSaving
        ) {
            return;
        }

        if (isDirty) {
            const shouldDiscard =
                window.confirm(
                    'Есть несохранённые изменения. Перейти к другому предмету и отменить их?',
                );

            if (!shouldDiscard) {
                return;
            }
        }

        setSelectedSubjectId(subjectId);
        setSelectedPreparationIds([]);
        setSavedPreparationIds([]);

        await loadSubjectLinks(subjectId);
    }

    function handlePreparationToggle(
        preparationId,
    ) {
        setSuccessMessage('');

        setSelectedPreparationIds(
            (currentIds) => {
                if (
                    currentIds.includes(
                        preparationId,
                    )
                ) {
                    return currentIds.filter(
                        (currentId) => (
                            currentId
                            !== preparationId
                        ),
                    );
                }

                return [
                    ...currentIds,
                    preparationId,
                ];
            },
        );
    }

    function movePreparation(
        preparationId,
        direction,
    ) {
        setSuccessMessage('');

        setSelectedPreparationIds(
            (currentIds) => {
                const currentIndex =
                    currentIds.indexOf(
                        preparationId,
                    );

                const nextIndex =
                    currentIndex + direction;

                if (
                    currentIndex < 0
                    || nextIndex < 0
                    || nextIndex
                        >= currentIds.length
                ) {
                    return currentIds;
                }

                const nextIds =
                    [...currentIds];

                [
                    nextIds[currentIndex],
                    nextIds[nextIndex],
                ] = [
                    nextIds[nextIndex],
                    nextIds[currentIndex],
                ];

                return nextIds;
            },
        );
    }

    async function handleSave() {
        if (
            !selectedSubjectId
            || !isDirty
            || isSaving
        ) {
            return;
        }

        setIsSaving(true);
        setError('');
        setSuccessMessage('');

        try {
            const response =
                await dictionariesApi
                    .updateSubjectPreparations({
                        subject_id:
                            selectedSubjectId,

                        preparations:
                            selectedPreparationIds
                                .map(
                                    (
                                        preparationId,
                                        index,
                                    ) => ({
                                        id:
                                            preparationId,

                                        sort_order:
                                            (index + 1)
                                            * 10,
                                    }),
                                ),
                    });

            if (!response?.success) {
                throw new Error(
                    response?.message
                    || 'Не удалось сохранить связи',
                );
            }

            setSubjects(
                (currentSubjects) => (
                    currentSubjects.map(
                        (subject) => (
                            subject.id
                            === selectedSubjectId
                                ? {
                                    ...subject,
                                    preparations_total:
                                        selectedPreparationIds
                                            .length,
                                }
                                : subject
                        ),
                    )
                ),
            );

            setSavedPreparationIds(
                [...selectedPreparationIds],
            );

            setSuccessMessage(
                response.message
                || 'Направления подготовки сохранены',
            );
        } catch (requestError) {
            setError(
                requestError.message
                || 'Не удалось сохранить связи',
            );
        } finally {
            setIsSaving(false);
        }
    }

    if (isLoading) {
        return (
            <div className="subject-preparations-page">
                <Loader>
                    Загрузка связей предметов...
                </Loader>
            </div>
        );
    }

    if (
        !subjects.length
        || !preparations.length
    ) {
        return (
            <div className="subject-preparations-page">
                <EmptyState
                    title="Недостаточно данных"
                    description="Для настройки связей должны существовать предметы и направления подготовки."
                />
            </div>
        );
    }

    return (
        <div className="subject-preparations-page">
            {error && (
                <div
                    className="subject-preparations-page__message subject-preparations-page__message--error"
                    role="alert"
                >
                    {error}
                </div>
            )}

            {successMessage && (
                <div
                    className="subject-preparations-page__message subject-preparations-page__message--success"
                    role="status"
                >
                    {successMessage}
                </div>
            )}

            <div className="subject-preparations-layout">
                <section className="subject-preparations-panel subject-preparations-panel--subjects">
                    <div className="subject-preparations-panel__header">
                        <div>
                            <h2 className="subject-preparations-panel__title">
                                Предметы
                            </h2>

                            <p className="subject-preparations-panel__description">
                                Выберите предмет для настройки направлений.
                            </p>
                        </div>

                        <span className="subject-preparations-panel__count">
                            {subjects.length}
                        </span>
                    </div>

                    <div className="subject-preparations-panel__search">
                        <Input
                            type="search"
                            value={subjectSearch}
                            placeholder="Найти предмет"
                            fullWidth
                            onChange={(event) => {
                                setSubjectSearch(
                                    event.target.value,
                                );
                            }}
                        />
                    </div>

                    <div className="subject-preparations-subjects">
                        {Object.entries(
                            groupedSubjects,
                        ).map(
                            ([
                                groupId,
                                groupSubjects,
                            ]) => (
                                <div
                                    className="subject-preparations-group"
                                    key={groupId}
                                >
                                    <h3 className="subject-preparations-group__title">
                                        {
                                            groupSubjects[0]
                                                ?.group_name
                                        }
                                    </h3>

                                    <div className="subject-preparations-group__items">
                                        {groupSubjects.map(
                                            (subject) => {
                                                const isSelected =
                                                    subject.id
                                                    === selectedSubjectId;

                                                return (
                                                    <button
                                                        className={
                                                            isSelected
                                                                ? 'subject-preparations-subject subject-preparations-subject--selected'
                                                                : 'subject-preparations-subject'
                                                        }
                                                        type="button"
                                                        key={subject.id}
                                                        disabled={
                                                            isLinksLoading
                                                            || isSaving
                                                        }
                                                        onClick={() => {
                                                            handleSubjectSelect(
                                                                subject.id,
                                                            );
                                                        }}
                                                    >
                                                        <span className="subject-preparations-subject__main">
                                                            <strong>
                                                                {subject.name}
                                                            </strong>

                                                            {!subject.is_active && (
                                                                <small>
                                                                    Отключён
                                                                </small>
                                                            )}
                                                        </span>

                                                        <span className="subject-preparations-subject__count">
                                                            {
                                                                subject.preparations_total
                                                                ?? 0
                                                            }
                                                        </span>
                                                    </button>
                                                );
                                            },
                                        )}
                                    </div>
                                </div>
                            ),
                        )}

                        {!filteredSubjects.length && (
                            <p className="subject-preparations-panel__empty">
                                Предметы не найдены.
                            </p>
                        )}
                    </div>
                </section>

                <section className="subject-preparations-panel subject-preparations-panel--preparations">
                    <div className="subject-preparations-panel__header">
                        <div>
                            <h2 className="subject-preparations-panel__title">
                                Направления подготовки
                            </h2>

                            <p className="subject-preparations-panel__description">
                                {selectedSubject
                                    ? `Предмет: ${selectedSubject.name}`
                                    : 'Выберите предмет'}
                            </p>
                        </div>

                        <span className="subject-preparations-panel__count">
                            {
                                selectedPreparationIds
                                    .length
                            }
                        </span>
                    </div>

                    <div className="subject-preparations-panel__search">
                        <Input
                            type="search"
                            value={preparationSearch}
                            placeholder="Найти направление"
                            fullWidth
                            disabled={isLinksLoading}
                            onChange={(event) => {
                                setPreparationSearch(
                                    event.target.value,
                                );
                            }}
                        />
                    </div>

                    {isLinksLoading ? (
                        <div className="subject-preparations-panel__loader">
                            <Loader>
                                Загрузка направлений...
                            </Loader>
                        </div>
                    ) : (
                        <div className="subject-preparations-options">
                            {preparationGroups.map(
                                (group) => {
                                    const groupPreparations =
                                        groupedPreparations[
                                            String(group.id)
                                        ] ?? [];

                                    if (
                                        !groupPreparations
                                            .length
                                    ) {
                                        return null;
                                    }

                                    return (
                                        <div
                                            className="subject-preparations-group"
                                            key={group.id}
                                        >
                                            <h3 className="subject-preparations-group__title">
                                                {group.name}

                                                {!group.is_active && (
                                                    <span>
                                                        Отключена
                                                    </span>
                                                )}
                                            </h3>

                                            <div className="subject-preparations-group__items">
                                                {groupPreparations.map(
                                                    (
                                                        preparation,
                                                    ) => {
                                                        const isChecked =
                                                            selectedPreparationIds
                                                                .includes(
                                                                    preparation.id,
                                                                );

                                                        return (
                                                            <label
                                                                className={
                                                                    isChecked
                                                                        ? 'subject-preparations-option subject-preparations-option--checked'
                                                                        : 'subject-preparations-option'
                                                                }
                                                                key={
                                                                    preparation.id
                                                                }
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={
                                                                        isChecked
                                                                    }
                                                                    disabled={
                                                                        isSaving
                                                                    }
                                                                    onChange={() => {
                                                                        handlePreparationToggle(
                                                                            preparation.id,
                                                                        );
                                                                    }}
                                                                />

                                                                <span className="subject-preparations-option__content">
                                                                    <strong>
                                                                        {
                                                                            preparation.name
                                                                        }
                                                                    </strong>

                                                                    {!preparation.is_active && (
                                                                        <small>
                                                                            Отключено
                                                                        </small>
                                                                    )}
                                                                </span>
                                                            </label>
                                                        );
                                                    },
                                                )}
                                            </div>
                                        </div>
                                    );
                                },
                            )}

                            {!filteredPreparations.length && (
                                <p className="subject-preparations-panel__empty">
                                    Направления не найдены.
                                </p>
                            )}
                        </div>
                    )}
                </section>

                <section className="subject-preparations-panel subject-preparations-panel--order">
                    <div className="subject-preparations-panel__header">
                        <div>
                            <h2 className="subject-preparations-panel__title">
                                Порядок вывода
                            </h2>

                            <p className="subject-preparations-panel__description">
                                Расположите выбранные направления в нужном порядке.
                            </p>
                        </div>

                        {isDirty && (
                            <span className="subject-preparations-panel__status">
                                Не сохранено
                            </span>
                        )}
                    </div>

                    <div className="subject-preparations-order">
                        {selectedPreparations.map(
                            (
                                preparation,
                                index,
                            ) => (
                                <div
                                    className="subject-preparations-order__item"
                                    key={preparation.id}
                                >
                                    <span className="subject-preparations-order__number">
                                        {index + 1}
                                    </span>

                                    <span className="subject-preparations-order__name">
                                        {preparation.name}
                                    </span>

                                    <div className="subject-preparations-order__actions">
                                        <button
                                            type="button"
                                            title="Поднять выше"
                                            disabled={
                                                index === 0
                                                || isSaving
                                            }
                                            onClick={() => {
                                                movePreparation(
                                                    preparation.id,
                                                    -1,
                                                );
                                            }}
                                        >
                                            ↑
                                        </button>

                                        <button
                                            type="button"
                                            title="Опустить ниже"
                                            disabled={
                                                index
                                                === selectedPreparations
                                                    .length
                                                    - 1
                                                || isSaving
                                            }
                                            onClick={() => {
                                                movePreparation(
                                                    preparation.id,
                                                    1,
                                                );
                                            }}
                                        >
                                            ↓
                                        </button>
                                    </div>
                                </div>
                            ),
                        )}

                        {!selectedPreparations.length && (
                            <p className="subject-preparations-panel__empty">
                                Для выбранного предмета направления пока не выбраны.
                            </p>
                        )}
                    </div>

                    <div className="subject-preparations-save">
                        <Button
                            type="button"
                            variant="primary"
                            loading={isSaving}
                            disabled={
                                !selectedSubjectId
                                || !isDirty
                                || isLinksLoading
                            }
                            fullWidth
                            onClick={handleSave}
                        >
                            {isDirty
                                ? 'Сохранить изменения'
                                : 'Изменений нет'}
                        </Button>
                    </div>
                </section>
            </div>
        </div>
    );
}