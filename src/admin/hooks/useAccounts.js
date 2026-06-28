import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from 'react';

import {
    accountsApi
} from '../services/accountsApi.js';

const DEFAULT_FILTERS = {
    q: '',
    role: '',
    status: '',
};

const DEFAULT_PAGINATION = {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
};

const SEARCH_DELAY = 350;

export function useAccounts() {
    const [accounts, setAccounts] = useState([]);
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [pagination, setPagination] = useState(DEFAULT_PAGINATION);

    const [selectedAccount, setSelectedAccount] = useState(null);
    const [isAccountLoading, setIsAccountLoading] = useState(false);
    const [isStatusUpdating, setIsStatusUpdating] = useState(false);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [accountError, setAccountError] = useState('');

    const [isRoleUpdating, setIsRoleUpdating] = useState(false);

    const queryParams = useMemo(() => ({
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
    }), [filters, pagination.limit, pagination.page]);

    const loadAccounts = useCallback(async (params = queryParams) => {
        setIsLoading(true);
        setError('');

        try {
            const response = await accountsApi.getAccounts(params);

            if (!response.success) {
                setError(response.message || 'Ошибка загрузки аккаунтов');
                return;
            }

            setAccounts(response.data.items || []);
            setPagination(response.data.pagination || DEFAULT_PAGINATION);
        } catch {
            setError('Не удалось подключиться к серверу');
        } finally {
            setIsLoading(false);
        }
    }, [queryParams]);

    const openAccount = useCallback(async (id) => {
        setSelectedAccount(null);
        setAccountError('');
        setIsAccountLoading(true);

        try {
            const response = await accountsApi.getAccount(id);

            if (!response.success) {
                setAccountError(response.message || 'Ошибка загрузки аккаунта');
                return;
            }

            setSelectedAccount(response.data);
        } catch {
            setAccountError('Не удалось подключиться к серверу');
        } finally {
            setIsAccountLoading(false);
        }
    }, []);

    async function updateAccountStatus({
        id,
        status,
        blocked_reason = ''
    }) {
        setIsStatusUpdating(true);
        setAccountError('');

        try {
            const response = await accountsApi.updateStatus({
                id,
                status,
                blocked_reason,
            });

            if (!response.success) {
                setAccountError(response.message || 'Ошибка изменения статуса');
                return;
            }

            await openAccount(id);
            await loadAccounts(queryParams);
        } catch {
            setAccountError('Не удалось подключиться к серверу');
        } finally {
            setIsStatusUpdating(false);
        }
    }

    async function updateAccountRole({
        id,
        role
    }) {
        setIsRoleUpdating(true);
        setAccountError('');

        try {
            const response = await accountsApi.updateRole({
                id,
                role,
            });

            if (!response.success) {
                setAccountError(response.message || 'Ошибка изменения роли');
                return;
            }

            await openAccount(id);
            await loadAccounts(queryParams);
        } catch {
            setAccountError('Не удалось подключиться к серверу');
        } finally {
            setIsRoleUpdating(false);
        }
    }

    function closeAccount() {
        setSelectedAccount(null);
        setAccountError('');
        setIsAccountLoading(false);
        setIsStatusUpdating(false);
    }

    useEffect(() => {
        const timerId = window.setTimeout(() => {
            loadAccounts(queryParams);
        }, SEARCH_DELAY);

        return () => {
            window.clearTimeout(timerId);
        };
    }, [loadAccounts, queryParams]);

    function updateFilters(nextFilters) {
        setFilters(nextFilters);
        setPagination((current) => ({
            ...current,
            page: 1,
        }));
    }

    function resetFilters() {
        setFilters(DEFAULT_FILTERS);
        setPagination((current) => ({
            ...current,
            page: 1,
        }));
    }

    function changePage(nextPage) {
        setPagination((current) => ({
            ...current,
            page: nextPage,
        }));
    }

    function refresh() {
        loadAccounts(queryParams);
    }

    return {
        accounts,
        filters,
        pagination,
        selectedAccount,

        isLoading,
        isAccountLoading,
        isStatusUpdating,

        error,
        accountError,

        updateFilters,
        resetFilters,
        changePage,
        refresh,

        openAccount,
        closeAccount,
        updateAccountStatus,

        isRoleUpdating,
        updateAccountRole,
    };
}