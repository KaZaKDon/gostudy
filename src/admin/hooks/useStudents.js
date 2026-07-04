import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import { studentsApi } from '../services/studentsApi.js';

const DEFAULT_FILTERS = {
    q: '',
    status: '',
};

const DEFAULT_PAGINATION = {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
};

const SEARCH_DELAY = 350;

export function useStudents() {
    const [students, setStudents] = useState([]);
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [pagination, setPagination] = useState(DEFAULT_PAGINATION);

    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isStudentLoading, setIsStudentLoading] = useState(false);
    const [isStatusUpdating, setIsStatusUpdating] = useState(false);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [studentError, setStudentError] = useState('');

    const queryParams = useMemo(() => ({
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
    }), [filters, pagination.limit, pagination.page]);

    const loadStudents = useCallback(async (params = queryParams) => {
        setIsLoading(true);
        setError('');

        try {
            const response = await studentsApi.getStudents(params);

            if (!response.success) {
                setError(response.message || 'Ошибка загрузки учеников');
                return;
            }

            setStudents(response.data.items || []);
            setPagination(response.data.pagination || DEFAULT_PAGINATION);
        } catch {
            setError('Не удалось подключиться к серверу');
        } finally {
            setIsLoading(false);
        }
    }, [queryParams]);

    const openStudent = useCallback(async (id) => {
        setSelectedStudent(null);
        setStudentError('');
        setIsStudentLoading(true);

        try {
            const response = await studentsApi.getStudent(id);

            if (!response.success) {
                setStudentError(response.message || 'Ошибка загрузки ученика');
                return;
            }

            setSelectedStudent(response.data);
        } catch {
            setStudentError('Не удалось подключиться к серверу');
        } finally {
            setIsStudentLoading(false);
        }
    }, []);

    async function updateStudentStatus({
        id,
        status,
        blocked_reason = '',
        archive_reason = '',
    }) {
        setIsStatusUpdating(true);
        setStudentError('');

        try {
            const response = await studentsApi.updateStatus({
                id,
                status,
                blocked_reason,
                archive_reason,
            });

            if (!response.success) {
                setStudentError(response.message || 'Ошибка изменения статуса');
                return;
            }

            await openStudent(id);
            await loadStudents(queryParams);
        } catch {
            setStudentError('Не удалось подключиться к серверу');
        } finally {
            setIsStatusUpdating(false);
        }
    }

    function closeStudent() {
        setSelectedStudent(null);
        setStudentError('');
        setIsStudentLoading(false);
        setIsStatusUpdating(false);
    }

    useEffect(() => {
        const timerId = window.setTimeout(() => {
            loadStudents(queryParams);
        }, SEARCH_DELAY);

        return () => {
            window.clearTimeout(timerId);
        };
    }, [loadStudents, queryParams]);

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
        loadStudents(queryParams);
    }

    return {
        students,
        filters,
        pagination,
        selectedStudent,

        isLoading,
        isStudentLoading,
        isStatusUpdating,

        error,
        studentError,

        updateFilters,
        resetFilters,
        changePage,
        refresh,

        openStudent,
        closeStudent,
        updateStudentStatus,
    };
}