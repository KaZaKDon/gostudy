import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import { API } from '../../../../api/api.js';
import { apiRequest } from '../../../../api/apiRequest.js';
import {
    DEFAULT_UPLOAD_LIMITS,
    downloadAuthFile,
    submitMultipart,
} from '../../../../api/upload.js';

export function useMaterials(role) {
    const defaultView = role === 'teacher' ? 'mine' : 'assigned';
    const [selectedView, setViewState] = useState(null);
    const view = selectedView || defaultView;
    const [materials, setMaterials] = useState([]);
    const [options, setOptions] = useState(null);
    const [uploadLimits, setUploadLimits] = useState(DEFAULT_UPLOAD_LIMITS);
    const [status, setStatus] = useState('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [notice, setNotice] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const load = useCallback(async (requestedView = view) => {
        if (!role) return;
        setStatus('loading');
        setErrorMessage('');

        try {
            const result = await apiRequest(
                `${API.materials}?view=${encodeURIComponent(requestedView)}`,
            );
            setMaterials(Array.isArray(result.materials) ? result.materials : []);
            setUploadLimits({
                maxFiles: Number(result.upload_limits?.max_files)
                    || DEFAULT_UPLOAD_LIMITS.maxFiles,
                maxFileBytes: Number(result.upload_limits?.max_file_bytes)
                    || DEFAULT_UPLOAD_LIMITS.maxFileBytes,
                maxTotalBytes: Number(result.upload_limits?.max_total_bytes)
                    || DEFAULT_UPLOAD_LIMITS.maxTotalBytes,
            });
            setStatus('success');
        } catch (error) {
            setErrorMessage(error.message || 'Не удалось загрузить материалы');
            setStatus('error');
        }
    }, [role, view]);

    useEffect(() => {
        if (!role) return undefined;
        const timer = window.setTimeout(() => load(view), 0);
        return () => window.clearTimeout(timer);
    }, [load, role, view]);

    const setView = useCallback((nextView) => {
        setNotice('');
        setViewState(nextView);
    }, []);

    const loadOptions = useCallback(async () => {
        if (role !== 'teacher') return null;
        const result = await apiRequest(API.materialOptions);
        setOptions(result);
        setUploadLimits({
            maxFiles: Number(result.upload_limits?.max_files)
                || DEFAULT_UPLOAD_LIMITS.maxFiles,
            maxFileBytes: Number(result.upload_limits?.max_file_bytes)
                || DEFAULT_UPLOAD_LIMITS.maxFileBytes,
            maxTotalBytes: Number(result.upload_limits?.max_total_bytes)
                || DEFAULT_UPLOAD_LIMITS.maxTotalBytes,
        });
        return result;
    }, [role]);

    const mutate = useCallback(async (action) => {
        setIsSaving(true);
        setErrorMessage('');
        setNotice('');
        try {
            const result = await action();
            setNotice(result.message || 'Изменения сохранены');
            await load(view);
            window.dispatchEvent(new Event('gostudy:notifications-refresh'));
            return result;
        } catch (error) {
            setErrorMessage(error.message || 'Не удалось выполнить действие');
            throw error;
        } finally {
            setIsSaving(false);
        }
    }, [load, view]);

    const create = useCallback((fields, files, onProgress) => mutate(() =>
        submitMultipart({
            url: API.materials,
            fields,
            files,
            limits: uploadLimits,
            onProgress,
        })), [mutate, uploadLimits]);

    const update = useCallback((materialId, fields) => mutate(() =>
        apiRequest(`${API.materials}/${materialId}`, {
            method: 'PATCH',
            body: fields,
        })), [mutate]);

    const submitModeration = useCallback((materialId) => mutate(() =>
        apiRequest(`${API.materials}/${materialId}/submit-moderation`, {
            method: 'POST',
        })), [mutate]);

    const hide = useCallback((materialId) => mutate(() =>
        apiRequest(`${API.materials}/${materialId}/hide`, {
            method: 'POST',
        })), [mutate]);

    const assign = useCallback((materialId, relationId) => mutate(() =>
        apiRequest(`${API.materials}/${materialId}/assign`, {
            method: 'POST',
            body: { relation_id: Number(relationId) },
        })), [mutate]);

    const unassign = useCallback((materialId, relationId) => mutate(() =>
        apiRequest(`${API.materials}/${materialId}/unassign`, {
            method: 'POST',
            body: { relation_id: Number(relationId) },
        })), [mutate]);

    const report = useCallback((materialId, reason, comment) => mutate(() =>
        apiRequest(`${API.materials}/${materialId}/report`, {
            method: 'POST',
            body: { reason, comment },
        })), [mutate]);

    const openItem = useCallback(async (material, item) => {
        setErrorMessage('');
        setNotice('');
        if (!item.can_open) {
            setNotice(material.access_type === 'paid'
                ? 'Покупка материалов будет доступна после запуска платёжной системы.'
                : 'У вас пока нет доступа к этому материалу.');
            return;
        }
        if (item.content_type !== 'file') {
            if (item.external_url) {
                window.open(item.external_url, '_blank', 'noopener,noreferrer');
            }
            return;
        }

        try {
            await downloadAuthFile(
                `${API.materialDownload}?item_id=${item.id}`,
                item.original_name || item.title || 'material',
            );
        } catch (error) {
            setErrorMessage(error.message || 'Не удалось скачать материал');
        }
    }, []);

    return {
        view,
        materials,
        options,
        uploadLimits,
        status,
        errorMessage,
        notice,
        isSaving,
        setView,
        load,
        loadOptions,
        create,
        update,
        submitModeration,
        hide,
        assign,
        unassign,
        report,
        openItem,
        clearMessages: () => {
            setErrorMessage('');
            setNotice('');
        },
    };
}
