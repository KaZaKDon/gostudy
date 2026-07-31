import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import { API } from '../../../api/api.js';
import { apiRequest } from '../../../api/apiRequest.js';
import {
    downloadAuthFile,
    submitMultipart,
} from '../../../api/upload.js';
import {
    CLASSROOM_SYNC_INTERVAL,
    CLASSROOM_UPLOAD_LIMITS,
    mergeClassroomMessages,
} from '../utils/classroom.js';

export function useClassroom(lessonId) {
    const [classroom, setClassroom] = useState(null);
    const [status, setStatus] = useState('loading');
    const [errorMessage, setErrorMessage] = useState('');
    const [actionError, setActionError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const lastMessageIdRef = useRef(0);
    const syncRequestRef = useRef(false);

    const applyRealtimeResult = useCallback((result) => {
        setClassroom((current) => {
            if (!current) {
                return current;
            }

            const messages = mergeClassroomMessages(
                current.messages || [],
                Array.isArray(result.messages) ? result.messages : [],
            );

            lastMessageIdRef.current = Number(
                messages[messages.length - 1]?.id || 0,
            );

            return {
                ...current,
                session: result.session || current.session,
                access: result.access || current.access,
                workspace: result.workspace || current.workspace,
                files: Array.isArray(result.files)
                    ? result.files
                    : current.files,
                messages,
            };
        });
    }, []);

    const loadClassroom = useCallback(async () => {
        setStatus('loading');
        setErrorMessage('');

        try {
            const result = await apiRequest(
                `${API.classroomShow}?lesson_id=${Number(lessonId)}`,
            );
            const messages = Array.isArray(result.messages)
                ? result.messages
                : [];

            lastMessageIdRef.current = Number(
                messages[messages.length - 1]?.id || 0,
            );
            setClassroom({
                viewer: result.viewer,
                lesson: result.lesson,
                session: result.session,
                access: result.access,
                workspace: result.workspace || {
                    is_sharing: false,
                    file_id: null,
                    page: 1,
                    version: 0,
                },
                messages,
                files: Array.isArray(result.files) ? result.files : [],
                homework: Array.isArray(result.homework)
                    ? result.homework
                    : [],
                teacherNote: result.teacher_note || '',
                uploadLimits: {
                    maxFiles: Number(result.upload_limits?.max_files)
                        || CLASSROOM_UPLOAD_LIMITS.maxFiles,
                    maxFileBytes: Number(result.upload_limits?.max_file_bytes)
                        || CLASSROOM_UPLOAD_LIMITS.maxFileBytes,
                    maxTotalBytes: Number(result.upload_limits?.max_total_bytes)
                        || CLASSROOM_UPLOAD_LIMITS.maxTotalBytes,
                    lessonMaxBytes: Number(
                        result.upload_limits?.lesson_max_bytes,
                    ) || 0,
                },
            });
            setStatus('success');
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'Не удалось загрузить класс',
            );
            setStatus('error');
        }
    }, [lessonId]);

    const syncClassroom = useCallback(async () => {
        if (syncRequestRef.current || !lessonId) {
            return;
        }

        syncRequestRef.current = true;

        try {
            const result = await apiRequest(API.classroomSync, {
                method: 'POST',
                body: {
                    lesson_id: Number(lessonId),
                    after_message_id: lastMessageIdRef.current,
                },
            });
            applyRealtimeResult(result);
        } catch {
            // Фоновая синхронизация не перекрывает уже загруженный класс.
        } finally {
            syncRequestRef.current = false;
        }
    }, [applyRealtimeResult, lessonId]);

    const runAction = useCallback(async (action) => {
        setIsSaving(true);
        setActionError('');

        try {
            return await action();
        } catch (error) {
            const message = error instanceof Error
                ? error.message
                : 'Не удалось выполнить действие';

            setActionError(message);
            throw error;
        } finally {
            setIsSaving(false);
        }
    }, []);

    const startLesson = useCallback(() => runAction(async () => {
        const result = await apiRequest(API.classroomStart, {
            method: 'POST',
            body: { lesson_id: Number(lessonId) },
        });
        applyRealtimeResult(result);
        return result;
    }), [applyRealtimeResult, lessonId, runAction]);

    const finishLesson = useCallback(() => runAction(async () => {
        const result = await apiRequest(API.classroomFinish, {
            method: 'POST',
            body: { lesson_id: Number(lessonId) },
        });
        applyRealtimeResult(result);
        return result;
    }), [applyRealtimeResult, lessonId, runAction]);

    const sendMessage = useCallback((messageText) => runAction(async () => {
        const result = await apiRequest(API.classroomSendMessage, {
            method: 'POST',
            body: {
                lesson_id: Number(lessonId),
                message_text: messageText,
            },
        });
        applyRealtimeResult({ messages: [result.message] });
        return result.message;
    }), [applyRealtimeResult, lessonId, runAction]);

    const saveNote = useCallback((noteText) => runAction(async () => {
        const result = await apiRequest(API.classroomSaveNote, {
            method: 'POST',
            body: {
                lesson_id: Number(lessonId),
                note_text: noteText,
            },
        });

        setClassroom((current) => current
            ? { ...current, teacherNote: result.teacher_note || '' }
            : current);
        return result;
    }), [lessonId, runAction]);

    const uploadFiles = useCallback((files, onProgress) => runAction(async () => {
        const result = await submitMultipart({
            url: API.classroomUploadFile,
            fields: { lesson_id: Number(lessonId) },
            files,
            limits: classroom?.uploadLimits || CLASSROOM_UPLOAD_LIMITS,
            onProgress,
        });

        setClassroom((current) => current
            ? {
                ...current,
                files: Array.isArray(result.files) ? result.files : [],
                workspace: result.workspace || current.workspace,
            }
            : current);
        return result;
    }), [classroom?.uploadLimits, lessonId, runAction]);

    const deleteFile = useCallback((fileId) => runAction(async () => {
        const result = await apiRequest(API.classroomDeleteFile, {
            method: 'POST',
            body: {
                lesson_id: Number(lessonId),
                file_id: Number(fileId),
            },
        });

        setClassroom((current) => current
            ? {
                ...current,
                files: Array.isArray(result.files) ? result.files : [],
                workspace: result.workspace || current.workspace,
            }
            : current);
        return result;
    }), [lessonId, runAction]);

    const downloadFile = useCallback((file) => runAction(() =>
        downloadAuthFile(
            `${API.classroomDownloadFile}?file_id=${Number(file.id)}`,
            file.original_name,
        )), [runAction]);

    const shareMaterial = useCallback((fileId, page = 1) => runAction(async () => {
        const result = await apiRequest(API.classroomShareMaterial, {
            method: 'POST',
            body: {
                lesson_id: Number(lessonId),
                file_id: Number(fileId),
                page: Math.max(1, Number(page) || 1),
            },
        });

        setClassroom((current) => current
            ? {
                ...current,
                workspace: result.workspace || current.workspace,
            }
            : current);
        return result;
    }), [lessonId, runAction]);

    const stopMaterialSharing = useCallback(() => runAction(async () => {
        const result = await apiRequest(API.classroomStopMaterialSharing, {
            method: 'POST',
            body: { lesson_id: Number(lessonId) },
        });

        setClassroom((current) => current
            ? {
                ...current,
                workspace: result.workspace || current.workspace,
            }
            : current);
        return result;
    }), [lessonId, runAction]);

    useEffect(() => {
        const initialTimer = window.setTimeout(loadClassroom, 0);

        return () => window.clearTimeout(initialTimer);
    }, [loadClassroom]);

    useEffect(() => {
        if (status !== 'success') {
            return undefined;
        }

        const immediateTimer = window.setTimeout(syncClassroom, 0);
        const intervalId = window.setInterval(() => {
            if (document.visibilityState === 'visible') {
                syncClassroom();
            }
        }, CLASSROOM_SYNC_INTERVAL);
        const handleFocus = () => syncClassroom();

        window.addEventListener('focus', handleFocus);

        return () => {
            window.clearTimeout(immediateTimer);
            window.clearInterval(intervalId);
            window.removeEventListener('focus', handleFocus);
        };
    }, [status, syncClassroom]);

    return {
        classroom,
        status,
        errorMessage,
        actionError,
        isSaving,
        retry: loadClassroom,
        clearActionError: () => setActionError(''),
        startLesson,
        finishLesson,
        sendMessage,
        saveNote,
        uploadFiles,
        deleteFile,
        downloadFile,
        shareMaterial,
        stopMaterialSharing,
    };
}
