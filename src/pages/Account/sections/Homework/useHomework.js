import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import { API } from '../../../../api/api.js';
import { apiRequest } from '../../../../api/apiRequest.js';
import { submitMultipart } from '../../../../api/upload.js';
import { DEFAULT_UPLOAD_LIMITS } from '../../../../api/upload.js';

const HOMEWORK_POLL_INTERVAL = 30000;

export function useHomework(role) {
    const [homework, setHomework] = useState([]);
    const [selectedHomework, setSelectedHomework] = useState(null);
    const [actionableCount, setActionableCount] = useState(0);
    const [status, setStatus] = useState('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [options, setOptions] = useState(null);
    const [uploadLimits, setUploadLimits] = useState(DEFAULT_UPLOAD_LIMITS);
    const requestRef = useRef(false);

    const loadHomework = useCallback(async ({ silent = false } = {}) => {
        if (!role || requestRef.current) {
            return;
        }

        requestRef.current = true;

        if (!silent) {
            setStatus('loading');
            setErrorMessage('');
        }

        try {
            const result = await apiRequest(API.homework);
            setHomework(Array.isArray(result.homework) ? result.homework : []);
            setActionableCount(Number(result.actionable_count) || 0);
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
            if (!silent) {
                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : 'Не удалось загрузить домашние задания',
                );
                setStatus('error');
            }
        } finally {
            requestRef.current = false;
        }
    }, [role]);

    const loadDetails = useCallback(async (homeworkId) => {
        const result = await apiRequest(
            `${API.homeworkShow}?id=${Number(homeworkId)}`,
        );

        setSelectedHomework(result.homework);

        if (role === 'student' && !result.homework.viewed_at) {
            await apiRequest(API.markHomeworkViewed, {
                method: 'POST',
                body: { homework_id: Number(homeworkId) },
            });
            await loadHomework({ silent: true });
        }

        return result.homework;
    }, [loadHomework, role]);

    const loadOptions = useCallback(async () => {
        if (role !== 'teacher') {
            return null;
        }

        const result = await apiRequest(API.homeworkOptions);
        setOptions(result);
        return result;
    }, [role]);

    const runMutation = useCallback(async (action) => {
        setIsSaving(true);
        setErrorMessage('');

        try {
            const result = await action();
            await loadHomework({ silent: true });

            if (selectedHomework?.id) {
                await loadDetails(selectedHomework.id);
            }

            window.dispatchEvent(new Event('gostudy:notifications-refresh'));
            return result;
        } finally {
            setIsSaving(false);
        }
    }, [loadDetails, loadHomework, selectedHomework?.id]);

    const createHomework = useCallback((fields, files, onProgress) =>
        runMutation(() => submitMultipart({
            url: API.createHomework,
            fields,
            files,
            limits: uploadLimits,
            onProgress,
        })), [runMutation, uploadLimits]);

    const submitHomework = useCallback((homeworkId, answerText, files, onProgress) =>
        runMutation(() => submitMultipart({
            url: API.submitHomework,
            fields: {
                homework_id: homeworkId,
                answer_text: answerText,
            },
            files,
            limits: uploadLimits,
            onProgress,
        })), [runMutation, uploadLimits]);

    const reviewHomework = useCallback((homeworkId, decision, grade, comment) =>
        runMutation(() => apiRequest(API.reviewHomework, {
            method: 'POST',
            body: {
                homework_id: homeworkId,
                decision,
                grade,
                teacher_comment: comment,
            },
        })), [runMutation]);

    const cancelHomework = useCallback((homeworkId) =>
        runMutation(() => apiRequest(API.cancelHomework, {
            method: 'POST',
            body: { homework_id: homeworkId },
        })), [runMutation]);

    useEffect(() => {
        if (!role) {
            return undefined;
        }

        const initialId = window.setTimeout(() => loadHomework(), 0);
        const intervalId = window.setInterval(() => {
            if (document.visibilityState === 'visible') {
                loadHomework({ silent: true });
            }
        }, HOMEWORK_POLL_INTERVAL);
        const refresh = () => loadHomework({ silent: true });

        window.addEventListener('focus', refresh);
        window.addEventListener('gostudy:homework-refresh', refresh);

        return () => {
            window.clearTimeout(initialId);
            window.clearInterval(intervalId);
            window.removeEventListener('focus', refresh);
            window.removeEventListener('gostudy:homework-refresh', refresh);
        };
    }, [loadHomework, role]);

    return {
        homework,
        selectedHomework,
        actionableCount,
        status,
        errorMessage,
        isSaving,
        options,
        uploadLimits,
        loadHomework,
        loadDetails,
        closeDetails: () => setSelectedHomework(null),
        loadOptions,
        createHomework,
        submitHomework,
        reviewHomework,
        cancelHomework,
    };
}
