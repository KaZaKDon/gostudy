import {
    useCallback,
    useMemo,
    useState,
} from 'react';

import {
    EmptyState,
    Loader,
} from '../ui/index.js';

import { useCrud } from '../../hooks/useCrud.js';

import { CrudModal } from './CrudModal.jsx';
import { CrudTable } from './CrudTable.jsx';
import { CrudToolbar } from './CrudToolbar.jsx';

import './crud.css';

function createInitialFilters(filters) {
    if (!Array.isArray(filters)) {
        return {};
    }

    return filters.reduce(
        (result, filter) => {
            result[filter.name] =
                filter.defaultValue
                ?? '';

            return result;
        },
        {},
    );
}

function normalizeSearchValue(value) {
    return String(value ?? '')
        .trim()
        .toLocaleLowerCase('ru-RU');
}

function applyDefaultFilters(
    items,
    filters,
    filterConfig,
) {
    if (!Array.isArray(filterConfig)) {
        return items;
    }

    return items.filter((item) => (
        filterConfig.every((filter) => {
            const filterValue =
                filters[filter.name];

            if (
                filterValue === ''
                || filterValue === null
                || filterValue === undefined
                || filterValue === 'all'
            ) {
                return true;
            }

            if (
                typeof filter.filterItem
                === 'function'
            ) {
                return filter.filterItem(
                    item,
                    filterValue,
                );
            }

            if (filter.type === 'search') {
                const searchValue =
                    normalizeSearchValue(
                        filterValue,
                    );

                const searchFields =
                    Array.isArray(
                        filter.searchFields,
                    )
                        ? filter.searchFields
                        : ['name', 'slug'];

                const haystack = searchFields
                    .map((fieldName) => (
                        item[fieldName]
                    ))
                    .filter(Boolean)
                    .join(' ')
                    .toLocaleLowerCase('ru-RU');

                return haystack.includes(
                    searchValue,
                );
            }

            if (filter.type === 'status') {
                if (filterValue === 'active') {
                    return Boolean(
                        item.is_active,
                    );
                }

                if (filterValue === 'inactive') {
                    return !item.is_active;
                }

                return true;
            }

            return String(
                item[filter.itemKey
                    ?? filter.name],
            ) === String(filterValue);
        })
    ));
}

export function CrudPage({
    config,
}) {
    const [filters, setFilters] =
        useState(() => (
            createInitialFilters(
                config.filters,
            )
        ));

    const loadDependencies = useCallback(
        async () => {
            if (
                typeof config.loadDependencies
                !== 'function'
            ) {
                return {};
            }

            return config.loadDependencies();
        },
        [config],
    );

    const buildTogglePayload = useCallback(
        (item) => {
            if (
                typeof config.buildTogglePayload
                === 'function'
            ) {
                return config.buildTogglePayload(
                    item,
                );
            }

            return {
                ...item,
                is_active:
                    !item.is_active,
            };
        },
        [config],
    );

    const crud = useCrud({
        api: config.api,
        loadDependencies:
            config.loadDependencies
                ? loadDependencies
                : undefined,
        buildTogglePayload,
        messages: config.messages,
    });

    const context = useMemo(
        () => ({
            dependencies:
                crud.dependencies,
            filters,
            config,
        }),
        [
            config,
            crud.dependencies,
            filters,
        ],
    );

    const visibleItems = useMemo(() => {
        if (
            typeof config.filterItems
            === 'function'
        ) {
            return config.filterItems(
                crud.items,
                filters,
                context,
            );
        }

        return applyDefaultFilters(
            crud.items,
            filters,
            config.filters,
        );
    }, [
        config,
        context,
        crud.items,
        filters,
    ]);

    function handleFilterChange(event) {
        const {
            name,
            value,
        } = event.target;

        setFilters((currentFilters) => ({
            ...currentFilters,
            [name]: value,
        }));
    }

    function resetFilters() {
        setFilters(
            createInitialFilters(
                config.filters,
            ),
        );
    }

    const modalContext = useMemo(
        () => ({
            ...context,
            item: crud.selectedItem,
        }),
        [
            context,
            crud.selectedItem,
        ],
    );

    return (
        <div className="admin-page crud-page">
            <header className="crud-page__header">
                <div>
                    {config.eyebrow && (
                        <p className="crud-page__eyebrow">
                            {config.eyebrow}
                        </p>
                    )}

                    <h1>
                        {config.title}
                    </h1>

                    {config.description && (
                        <p>
                            {config.description}
                        </p>
                    )}
                </div>
            </header>

            <CrudToolbar
                config={config}
                filters={filters}
                context={context}
                isLoading={crud.isLoading}
                onFilterChange={
                    handleFilterChange
                }
                onResetFilters={
                    resetFilters
                }
                onReload={() => (
                    crud.reload({
                        showLoader: true,
                    })
                )}
                onCreate={
                    crud.openCreateModal
                }
            />

            <div className="crud-page__summary">
                <span>
                    Найдено:
                    {' '}
                    <strong>
                        {visibleItems.length}
                    </strong>
                </span>

                <span>
                    Всего:
                    {' '}
                    <strong>
                        {crud.items.length}
                    </strong>
                </span>
            </div>

            {crud.pageError && (
                <div className="admin-alert">
                    {crud.pageError}
                </div>
            )}

            {crud.isLoading ? (
                <Loader
                    text={
                        config.loadingText
                        ?? 'Загрузка данных...'
                    }
                />
            ) : visibleItems.length === 0 ? (
                <EmptyState
                    title={
                        crud.items.length === 0
                            ? (
                                config.emptyTitle
                                ?? 'Данных пока нет'
                            )
                            : (
                                config.notFoundTitle
                                ?? 'Ничего не найдено'
                            )
                    }
                    description={
                        crud.items.length === 0
                            ? (
                                config.emptyDescription
                                ?? 'Создайте первую запись.'
                            )
                            : (
                                config.notFoundDescription
                                ?? 'Измените параметры поиска или сбросьте фильтры.'
                            )
                    }
                />
            ) : (
                <CrudTable
                    config={config}
                    items={visibleItems}
                    context={context}
                    changingStatusId={
                        crud.changingStatusId
                    }
                    deletingId={
                        crud.deletingId
                    }
                    onEdit={
                        crud.openEditModal
                    }
                    onToggleStatus={
                        crud.toggleItemStatus
                    }
                    onDelete={
                        crud.deleteItem
                    }
                />
            )}

            {crud.isModalOpen && (
                <CrudModal
                    key={
                        crud.selectedItem?.id
                        ?? `new-${config.entityKey}`
                    }
                    config={config}
                    item={crud.selectedItem}
                    context={modalContext}
                    isSaving={crud.isSaving}
                    error={crud.modalError}
                    onClose={
                        crud.closeModal
                    }
                    onSave={
                        crud.saveItem
                    }
                />
            )}
        </div>
    );
}