import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import { teachersApi } from '../services/teachersApi.js';

const DEFAULT_FILTERS = {
    q: '',
    status: '',
    verification_status: '',
    is_visible: '',
};

const DEFAULT_PAGINATION = {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
};

const SEARCH_DELAY = 350;

export function useTeachers() {
    const [teachers, setTeachers] = useState([]);
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [pagination, setPagination] = useState(DEFAULT_PAGINATION);

    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [isTeacherLoading, setIsTeacherLoading] = useState(false);
    const [isStatusUpdating, setIsStatusUpdating] = useState(false);
    const [isVerificationUpdating, setIsVerificationUpdating] = useState(false);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [teacherError, setTeacherError] = useState('');

    const queryParams = useMemo(() => ({
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
    }), [filters, pagination.limit, pagination.page]);

    const loadTeachers = useCallback(async (params = queryParams) => {
        setIsLoading(true);
        setError('');

        try {
            const response = await teachersApi.getTeachers(params);

            if (!response.success) {
                setError(response.message || 'Ошибка загрузки преподавателей');
                return;
            }

            setTeachers(response.data.items || []);
            setPagination(response.data.pagination || DEFAULT_PAGINATION);
        } catch {
            setError('Не удалось подключиться к серверу');
        } finally {
            setIsLoading(false);
        }
    }, [queryParams]);

    const openTeacher = useCallback(async (id) => {
        setSelectedTeacher(null);
        setTeacherError('');
        setIsTeacherLoading(true);

        try {
            const response = await teachersApi.getTeacher(id);

            if (!response.success) {
                setTeacherError(response.message || 'Ошибка загрузки преподавателя');
                return;
            }

            setSelectedTeacher(response.data);
        } catch {
            setTeacherError('Не удалось подключиться к серверу');
        } finally {
            setIsTeacherLoading(false);
        }
    }, []);

    async function updateTeacherStatus({
        id,
        status,
        blocked_reason = '',
        archive_reason = '',
    }) {
        setIsStatusUpdating(true);
        setTeacherError('');

        try {
            const response = await teachersApi.updateStatus({
                id,
                status,
                blocked_reason,
                archive_reason,
            });

            if (!response.success) {
                setTeacherError(response.message || 'Ошибка изменения статуса');
                return;
            }

            await openTeacher(id);
            await loadTeachers(queryParams);
        } catch {
            setTeacherError('Не удалось подключиться к серверу');
        } finally {
            setIsStatusUpdating(false);
        }
    }

        async function updateTeacherVerification({
        id,
        status,
        comment = '',
    }) {
        setIsVerificationUpdating(true);
        setTeacherError('');

        try {
            const response = await teachersApi.updateVerification({
                id,
                status,
                comment,
            });

            if (!response.success) {
                setTeacherError(response.message || 'Ошибка обновления проверки');
                return;
            }

            await openTeacher(id);
            await loadTeachers(queryParams);
        } catch (error) {
            console.error(error);
            setTeacherError(error.message || 'Не удалось подключиться к серверу');
        } finally {
            setIsVerificationUpdating(false);
        }
    }

    function closeTeacher() {
        setSelectedTeacher(null);
        setTeacherError('');
        setIsTeacherLoading(false);
        setIsStatusUpdating(false);
        setIsVerificationUpdating(false);
    }

    useEffect(() => {
        const timerId = window.setTimeout(() => {
            loadTeachers(queryParams);
        }, SEARCH_DELAY);

        return () => {
            window.clearTimeout(timerId);
        };
    }, [loadTeachers, queryParams]);

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
        loadTeachers(queryParams);
    }

    return {
        teachers,
        filters,
        pagination,
        selectedTeacher,

        isLoading,
        isTeacherLoading,
        isStatusUpdating,
        isVerificationUpdating,

        error,
        teacherError,

        updateFilters,
        resetFilters,
        changePage,
        refresh,

        openTeacher,
        closeTeacher,
        updateTeacherStatus,
        updateTeacherVerification,
    };
}