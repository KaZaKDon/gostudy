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

function normalizeUploadLimits(limits) {
    return {
        maxFiles: Number(limits?.max_files)
            || DEFAULT_UPLOAD_LIMITS.maxFiles,
        maxFileBytes: Number(limits?.max_file_bytes)
            || DEFAULT_UPLOAD_LIMITS.maxFileBytes,
        maxTotalBytes: Number(limits?.max_total_bytes)
            || DEFAULT_UPLOAD_LIMITS.maxTotalBytes,
    };
}

function withQuery(url, params = {}) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            search.set(key, String(value));
        }
    });
    const query = search.toString();
    return query ? `${url}?${query}` : url;
}

export function useLessonDisputes(targetDisputeId = null) {
    const [statusFilter, setStatusFilter] = useState('');
    const [disputes, setDisputes] = useState([]);
    const [options, setOptions] = useState({ children: [], lessons: [] });
    const [selected, setSelected] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [uploadLimits, setUploadLimits] = useState(DEFAULT_UPLOAD_LIMITS);

    const load = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const result = await apiRequest(withQuery(API.lessonDisputes, {
                status: statusFilter,
            }));
            setDisputes(result.disputes || []);
            setUploadLimits(normalizeUploadLimits(result.upload_limits));
        } catch (requestError) {
            setError(requestError.message || 'Не удалось загрузить споры');
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter]);

    const loadOptions = useCallback(async (studentId = null) => {
        const result = await apiRequest(withQuery(API.lessonDisputeOptions, {
            student_id: studentId,
        }));
        setOptions({
            children: result.children || [],
            lessons: result.lessons || [],
        });
        setUploadLimits(normalizeUploadLimits(result.upload_limits));
        return result;
    }, []);

    const open = useCallback(async (disputeId) => {
        setError('');
        try {
            const result = await apiRequest(`${API.lessonDisputes}/${disputeId}`);
            setSelected(result.dispute || null);
            setUploadLimits(normalizeUploadLimits(result.upload_limits));
            window.dispatchEvent(new Event('gostudy:notifications-refresh'));
            return true;
        } catch (requestError) {
            setError(requestError.message || 'Не удалось открыть спор');
            return false;
        }
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(load, 0);
        return () => window.clearTimeout(timer);
    }, [load]);

    useEffect(() => {
        if (!targetDisputeId) return undefined;
        const timer = window.setTimeout(() => open(targetDisputeId), 0);
        return () => window.clearTimeout(timer);
    }, [open, targetDisputeId]);

    const create = useCallback(async ({ lessonId, reason, description, files }) => {
        setIsSaving(true);
        setError('');
        setNotice('');
        try {
            const result = await submitMultipart({
                url: API.lessonDisputes,
                fields: {
                    lesson_id: lessonId,
                    reason,
                    description,
                },
                files,
                limits: uploadLimits,
            });
            setSelected(result.dispute || null);
            setNotice(result.message || 'Спор открыт');
            await load();
            window.dispatchEvent(new Event('gostudy:notifications-refresh'));
            return true;
        } catch (requestError) {
            setError(requestError.message || 'Не удалось открыть спор');
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [load, uploadLimits]);

    const reply = useCallback(async (disputeId, messageText, files) => {
        setIsSaving(true);
        setError('');
        setNotice('');
        try {
            const result = await submitMultipart({
                url: `${API.lessonDisputes}/${disputeId}/messages`,
                fields: { message_text: messageText },
                files,
                limits: uploadLimits,
            });
            setSelected(result.dispute || null);
            setNotice(result.message || 'Ответ добавлен');
            await load();
            window.dispatchEvent(new Event('gostudy:notifications-refresh'));
            return true;
        } catch (requestError) {
            setError(requestError.message || 'Не удалось добавить ответ');
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [load, uploadLimits]);

    const download = useCallback(async (disputeId, attachment) => {
        setError('');
        try {
            await downloadAuthFile(
                `${API.lessonDisputes}/${disputeId}/attachments/${attachment.id}`,
                attachment.original_name,
            );
        } catch (requestError) {
            setError(requestError.message || 'Не удалось скачать вложение');
        }
    }, []);

    return {
        statusFilter,
        disputes,
        options,
        selected,
        isLoading,
        isSaving,
        error,
        notice,
        uploadLimits,
        setStatusFilter,
        setSelected,
        clearMessages: () => {
            setError('');
            setNotice('');
        },
        load,
        loadOptions,
        open,
        create,
        reply,
        download,
    };
}
