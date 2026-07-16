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

export function useCrud({
    api,
    getListParams,
    loadDependencies,
    buildTogglePayload,
    messages = {},
}) {
    const [items, setItems] = useState([]);
    const [dependencies, setDependencies] = useState({});

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [
        changingStatusId,
        setChangingStatusId,
    ] = useState(null);

    const [
        deletingId,
        setDeletingId,
    ] = useState(null);

    const [pageError, setPageError] = useState('');
    const [modalError, setModalError] = useState('');

    const [selectedItem, setSelectedItem] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const isMountedRef = useRef(false);

    useEffect(() => {
        isMountedRef.current = true;

        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const resolveListParams = useCallback(
        () => {
            if (typeof getListParams === 'function') {
                return getListParams();
            }

            return {};
        },
        [getListParams],
    );

    const requestData = useCallback(
        async () => {
            const listPromise = api.getList(
                resolveListParams(),
            );

            const dependenciesPromise =
                typeof loadDependencies === 'function'
                    ? loadDependencies()
                    : Promise.resolve({});

            const [
                listResponse,
                dependencyResponse,
            ] = await Promise.all([
                listPromise,
                dependenciesPromise,
            ]);

            if (!listResponse?.success) {
                throw new Error(
                    getErrorMessage(
                        listResponse,
                        messages.load
                        || 'Не удалось загрузить данные',
                    ),
                );
            }

            return {
                items: listResponse.data?.items ?? [],
                dependencies: dependencyResponse ?? {},
            };
        },
        [
            api,
            loadDependencies,
            messages.load,
            resolveListParams,
        ],
    );

    useEffect(() => {
        let isActive = true;

        requestData()
            .then((result) => {
                if (!isActive) {
                    return;
                }

                setItems(result.items);
                setDependencies(result.dependencies);
                setPageError('');
            })
            .catch((requestError) => {
                if (!isActive) {
                    return;
                }

                setPageError(
                    requestError.message
                    || messages.load
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
        messages.load,
        requestData,
    ]);

    const reload = useCallback(
        async ({
            showLoader = false,
        } = {}) => {
            if (showLoader) {
                setIsLoading(true);
            }

            setPageError('');

            try {
                const result = await requestData();

                if (!isMountedRef.current) {
                    return false;
                }

                setItems(result.items);
                setDependencies(result.dependencies);

                return true;
            } catch (requestError) {
                if (!isMountedRef.current) {
                    return false;
                }

                setPageError(
                    requestError.message
                    || messages.load
                    || 'Не удалось загрузить данные',
                );

                return false;
            } finally {
                if (
                    showLoader
                    && isMountedRef.current
                ) {
                    setIsLoading(false);
                }
            }
        },
        [
            messages.load,
            requestData,
        ],
    );

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

    async function saveItem(payload) {
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
                if (isMountedRef.current) {
                    setModalError(
                        getErrorMessage(
                            response,
                            messages.save
                            || 'Не удалось сохранить запись',
                        ),
                    );
                }

                return false;
            }

            if (!isMountedRef.current) {
                return false;
            }

            const reloaded = await reload();

            if (!reloaded || !isMountedRef.current) {
                return false;
            }

            setIsModalOpen(false);
            setSelectedItem(null);
            setModalError('');

            return true;
        } catch (requestError) {
            if (isMountedRef.current) {
                setModalError(
                    requestError.message
                    || messages.save
                    || 'Не удалось сохранить запись',
                );
            }

            return false;
        } finally {
            if (isMountedRef.current) {
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
            const payload =
                typeof buildTogglePayload === 'function'
                    ? buildTogglePayload(item)
                    : {
                        ...item,
                        is_active: !item.is_active,
                    };

            const response = await api.update(payload);

            if (!response?.success) {
                if (isMountedRef.current) {
                    setPageError(
                        getErrorMessage(
                            response,
                            messages.toggle
                            || 'Не удалось изменить состояние записи',
                        ),
                    );
                }

                return false;
            }

            return await reload();
        } catch (requestError) {
            if (isMountedRef.current) {
                setPageError(
                    requestError.message
                    || messages.toggle
                    || 'Не удалось изменить состояние записи',
                );
            }

            return false;
        } finally {
            if (isMountedRef.current) {
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
            const response = await api.delete(item.id);

            if (!response?.success) {
                if (isMountedRef.current) {
                    setPageError(
                        getErrorMessage(
                            response,
                            messages.delete
                            || 'Не удалось удалить запись',
                        ),
                    );
                }

                return false;
            }

            return await reload();
        } catch (requestError) {
            if (isMountedRef.current) {
                setPageError(
                    requestError.message
                    || messages.delete
                    || 'Не удалось удалить запись',
                );
            }

            return false;
        } finally {
            if (isMountedRef.current) {
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

        reload,
        openCreateModal,
        openEditModal,
        closeModal,
        saveItem,
        toggleItemStatus,
        deleteItem,
        clearPageError,
    };
}