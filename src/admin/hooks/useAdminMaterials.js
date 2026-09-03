import { useCallback, useEffect, useMemo, useState } from 'react';

import { materialsApi } from '../services/materialsApi.js';

const PAGE = { page: 1, limit: 20, total: 0, pages: 0 };

export function useAdminMaterials() {
    const [mode, setMode] = useState('materials');
    const [filters, setFilters] = useState({ q: '', status: 'pending' });
    const [reportStatus, setReportStatus] = useState('pending');
    const [materials, setMaterials] = useState([]);
    const [reports, setReports] = useState([]);
    const [pagination, setPagination] = useState(PAGE);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [selectedReport, setSelectedReport] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const query = useMemo(() => mode === 'materials'
        ? { ...filters, page: pagination.page, limit: pagination.limit }
        : { status: reportStatus, page: pagination.page, limit: pagination.limit },
    [filters, mode, pagination.limit, pagination.page, reportStatus]);

    const load = useCallback(async (params = query) => {
        setIsLoading(true);
        setError('');
        try {
            const response = mode === 'materials'
                ? await materialsApi.list(params)
                : await materialsApi.reports(params);
            if (mode === 'materials') setMaterials(response.data?.items || []);
            else setReports(response.data?.items || []);
            setPagination(response.data?.pagination || PAGE);
        } catch (requestError) {
            setError(requestError.message || 'Не удалось загрузить материалы');
        } finally {
            setIsLoading(false);
        }
    }, [mode, query]);

    useEffect(() => {
        const timer = window.setTimeout(() => load(query), 300);
        return () => window.clearTimeout(timer);
    }, [load, query]);

    function changeMode(nextMode) {
        setMode(nextMode);
        setPagination(PAGE);
        setNotice('');
    }

    function updateFilters(next) {
        setFilters(next);
        setPagination((current) => ({ ...current, page: 1 }));
    }

    async function save(action) {
        setIsSaving(true);
        setError('');
        setNotice('');
        try {
            const response = await action();
            setNotice(response.message || 'Решение сохранено');
            setSelectedMaterial(null);
            setSelectedReport(null);
            await load(query);
            return true;
        } catch (requestError) {
            setError(requestError.message || 'Не удалось сохранить решение');
            return false;
        } finally {
            setIsSaving(false);
        }
    }

    return {
        mode,
        filters,
        reportStatus,
        materials,
        reports,
        pagination,
        selectedMaterial,
        selectedReport,
        isLoading,
        isSaving,
        error,
        notice,
        changeMode,
        updateFilters,
        setReportStatus: (status) => {
            setReportStatus(status);
            setPagination((current) => ({ ...current, page: 1 }));
        },
        changePage: (page) => setPagination((current) => ({ ...current, page })),
        refresh: load,
        openMaterial: setSelectedMaterial,
        closeMaterial: () => setSelectedMaterial(null),
        openReport: setSelectedReport,
        closeReport: () => setSelectedReport(null),
        moderate: (id, body) => save(() => materialsApi.moderate(id, body)),
        resolveReport: (id, body) => save(() => materialsApi.resolveReport(id, body)),
        download: async (item) => {
            try {
                await materialsApi.download(item);
            } catch (requestError) {
                setError(requestError.message);
            }
        },
    };
}
