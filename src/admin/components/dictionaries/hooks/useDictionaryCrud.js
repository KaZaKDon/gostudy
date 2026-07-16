import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

function getErrorMessage(
    response,
    fallbackMessage,
) {
    return response?.message || fallbackMessage;
}

export function useDictionaryCrud({
    api,
    getListParams,
    loadDependencies,
}) {
    const [items, setItems] = useState([]);
    const [dependencies, setDependencies] =
        useState({});

    const [isLoading, setIsLoading] =
        useState(true);

    const [isSaving, setIsSaving] =
        useState(false);

    const [
        changingStatusId,
        setChangingStatusId,
    ] = useState(null);

    const [
        deletingId,
        setDeletingId,
    ] = useState(null);

    const [pageError, setPageError] =
        useState('');

    const [modalError, setModalError] =
        useState('');

    const [selectedItem, setSelectedItem] =
        useState(null);

    const [isModalOpen, setIsModalOpen] =
        useState(false);

    const mountedRef = useRef(true);

    useEffect(() => {
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const loadData = useCallback(
        async ({
            showLoader = true,
        } = {}) => {
            if (showLoader) {
                setIsLoading(true);
            }

            setPageError('');

            try {
                const listParams =
                    typeof getListParams === 'function'
                        ? getListParams()
                        : {};

                const requests = [
                    api.getList(listParams),
                ];

                if (
                    typeof loadDependencies
                    === 'function'
                ) {
                    requests.push(
                        loadDependencies(),
                    );
                }

                const [
                    listResponse,
                    dependencyResponse,
                ] = await Promise.all(requests);

                if (!mountedRef.current) {
                    return false;
                }

                if (!listResponse?.success) {
                    setPageError(
                        getErrorMessage(
                            listResponse,
                            'Не удалось загрузить данные',
                        ),
                    );

                    return false;
                }

                setItems(
                    listResponse.data?.items ?? [],
                );

                if (
                    typeof loadDependencies
                    === 'function'
                ) {
                    setDependencies(
                        dependencyResponse ?? {},
                    );
                }

                return true;
            } catch (requestError) {
                if (!mountedRef.current) {
                    return false;
                }

                setPageError(
                    requestError.message
                    || 'Не удалось загрузить данные',
                );

                return false;
            } finally {
                if (
                    showLoader
                    && mountedRef.current
                ) {
                    setIsLoading(false);
                }
            }
        },
        [
            api,
            getListParams,
            loadDependencies,
        ],
    );

    useEffect(() => {
        let isActive = true;

        const listParams =
            typeof getListParams === 'function'
                ? getListParams()
                : {};

        const requests = [
            api.getList(listParams),
        ];

        if (
            typeof loadDependencies
            === 'function'
        ) {
            requests.push(
                loadDependencies(),
            );
        }

        Promise.all(requests)
            .then(([
                listResponse,
                dependencyResponse,
            ]) => {
                if (!isActive) {
                    return;
                }

                if (!listResponse?.success) {
                    setPageError(
                        getErrorMessage(
                            listResponse,
                            'Не удалось загрузить данные',
                        ),
                    );

                    return;
                }

                setItems(
                    listResponse.data?.items ?? [],
                );

                if (
                    typeof loadDependencies
                    === 'function'
                ) {
                    setDependencies(
                        dependencyResponse ?? {},
                    );
                }
            })
            .catch((requestError) => {
                if (!isActive) {
                    return;
                }

                setPageError(
                    requestError.message
                    || 'Не удалось загрузить данные',
                );
            })
            .finally(() => {
                if (isActive) {
                    setIsLoading(false);
                }
            });

        return () => {
            isActive = false;
        };
    }, [
        api,
        getListParams,
        loadDependencies,
    ]);

    function openCreateModal() {
        setSelectedItem(null);
        setModalError('');
        setIsModalOpen(true);
    }

    function openEditModal(item) {
        setSelectedItem(item);
        setModalError('');
        setIsModalOpen(true);
    }

    function closeModal() {
        if (isSaving) {
            return;
        }

        setIsModalOpen(false);
        setSelectedItem(null);
        setModalError('');
    }

    async function saveItem(
        payload,
        localValidationMessage = '',
    ) {
        if (localValidationMessage) {
            setModalError(
                localValidationMessage,
            );

            return false;
        }

        if (!payload) {
            return false;
        }

        setIsSaving(true);
        setModalError('');

        try {
            const response = selectedItem
                ? await api.update(payload)
                : await api.create(payload);

            if (!response?.success) {
                setModalError(
                    getErrorMessage(
                        response,
                        'Не удалось сохранить запись',
                    ),
                );

                return false;
            }

            setIsModalOpen(false);
            setSelectedItem(null);
            setModalError('');

            await loadData({
                showLoader: false,
            });

            return true;
        } catch (requestError) {
            setModalError(
                requestError.message
                || 'Не удалось сохранить запись',
            );

            return false;
        } finally {
            if (mountedRef.current) {
                setIsSaving(false);
            }
        }
    }

    async function toggleItemStatus(item) {
        if (
            !item
            || typeof api.update !== 'function'
        ) {
            return false;
        }

        setChangingStatusId(item.id);
        setPageError('');

        try {
            const response = await api.update({
                ...item,
                is_active: !item.is_active,
            });

            if (!response?.success) {
                setPageError(
                    getErrorMessage(
                        response,
                        'Не удалось изменить состояние записи',
                    ),
                );

                return false;
            }

            await loadData({
                showLoader: false,
            });

            return true;
        } catch (requestError) {
            setPageError(
                requestError.message
                || 'Не удалось изменить состояние записи',
            );

            return false;
        } finally {
            if (mountedRef.current) {
                setChangingStatusId(null);
            }
        }
    }

    async function deleteItem(item) {
        if (
            !item
            || typeof api.delete !== 'function'
        ) {
            return false;
        }

        setDeletingId(item.id);
        setPageError('');

        try {
            const response = await api.delete(
                item.id,
            );

            if (!response?.success) {
                setPageError(
                    getErrorMessage(
                        response,
                        'Не удалось удалить запись',
                    ),
                );

                return false;
            }

            await loadData({
                showLoader: false,
            });

            return true;
        } catch (requestError) {
            setPageError(
                requestError.message
                || 'Не удалось удалить запись',
            );

            return false;
        } finally {
            if (mountedRef.current) {
                setDeletingId(null);
            }
        }
    }

    function clearPageError() {
        setPageError('');
    }

    return {
        items,
        dependencies,

        isLoading,
        isSaving,
        changingStatusId,
        deletingId,

        pageError,
        modalError,

        selectedItem,
        isModalOpen,

        loadData,
        openCreateModal,
        openEditModal,
        closeModal,
        saveItem,
        toggleItemStatus,
        deleteItem,
        clearPageError,
    };
}