import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import { API } from '../../../api/api.js';
import { fetchAuthFileBlob } from '../../../api/upload.js';
import { getClassroomFilePreviewKind } from '../utils/classroom.js';

const EMPTY_PREVIEW = {
    status: 'idle',
    kind: null,
    objectUrl: '',
    data: null,
    text: '',
    errorMessage: '',
};

export function useClassroomFilePreview(file) {
    const [loadedPreview, setLoadedPreview] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);
    const fileId = Number(file?.id || 0);
    const fileMimeType = String(file?.mime_type || '');
    const fileName = String(file?.original_name || '');
    const kind = fileId
        ? getClassroomFilePreviewKind({
            mime_type: fileMimeType,
            original_name: fileName,
        })
        : null;
    const requestKey = `${fileId}:${reloadKey}`;

    useEffect(() => {
        if (!fileId || kind === 'unsupported') {
            return undefined;
        }

        const abortController = new AbortController();
        let isCurrent = true;
        let objectUrl = '';

        const loadPreview = async () => {
            try {
                const blob = await fetchAuthFileBlob(
                    `${API.classroomDownloadFile}?file_id=${fileId}`,
                    { signal: abortController.signal },
                );

                if (!isCurrent) {
                    return;
                }

                if (kind === 'text') {
                    const text = await blob.text();

                    if (isCurrent) {
                        setLoadedPreview({
                            ...EMPTY_PREVIEW,
                            requestKey,
                            status: 'success',
                            kind,
                            text,
                        });
                    }
                    return;
                }

                if (kind === 'docx') {
                    const data = await blob.arrayBuffer();

                    if (isCurrent) {
                        setLoadedPreview({
                            ...EMPTY_PREVIEW,
                            requestKey,
                            status: 'success',
                            kind,
                            data,
                        });
                    }
                    return;
                }

                objectUrl = URL.createObjectURL(blob);
                setLoadedPreview({
                    ...EMPTY_PREVIEW,
                    requestKey,
                    status: 'success',
                    kind,
                    objectUrl,
                });
            } catch (error) {
                if (!isCurrent || error?.name === 'AbortError') {
                    return;
                }

                setLoadedPreview({
                    ...EMPTY_PREVIEW,
                    requestKey,
                    status: 'error',
                    kind,
                    errorMessage: error instanceof Error
                        ? error.message
                        : 'Не удалось открыть материал',
                });
            }
        };

        loadPreview();

        return () => {
            isCurrent = false;
            abortController.abort();

            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [
        fileId,
        kind,
        reloadKey,
        requestKey,
    ]);

    const retry = useCallback(() => {
        setReloadKey((current) => current + 1);
    }, []);

    if (!fileId) {
        return { ...EMPTY_PREVIEW, retry };
    }

    if (kind === 'unsupported') {
        return {
            ...EMPTY_PREVIEW,
            status: 'unsupported',
            kind,
            retry,
        };
    }

    if (loadedPreview?.requestKey !== requestKey) {
        return {
            ...EMPTY_PREVIEW,
            status: 'loading',
            kind,
            retry,
        };
    }

    return { ...loadedPreview, retry };
}
