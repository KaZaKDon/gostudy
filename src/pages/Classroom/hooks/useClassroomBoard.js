import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import { API } from '../../../api/api.js';
import { apiRequest } from '../../../api/apiRequest.js';

function mergeStrokes(current, incoming) {
    const byId = new Map(current.map((stroke) => [Number(stroke.id), stroke]));

    for (const stroke of incoming) {
        byId.set(Number(stroke.id), stroke);
    }

    return [...byId.values()].sort((left, right) => Number(left.id) - Number(right.id));
}

export function useClassroomBoard({ lessonId, subscribeEvents }) {
    const [strokes, setStrokes] = useState([]);
    const [texts, setTexts] = useState([]);
    const [status, setStatus] = useState('loading');
    const [errorMessage, setErrorMessage] = useState('');
    const lastStrokeIdRef = useRef(0);
    const loadingRef = useRef(false);

    const load = useCallback(async ({ reset = false } = {}) => {
        if (loadingRef.current) {
            return;
        }

        loadingRef.current = true;

        try {
            const afterId = reset ? 0 : lastStrokeIdRef.current;
            const result = await apiRequest(
                `${API.classroomBoard}?lesson_id=${Number(lessonId)}&after_id=${afterId}`,
            );
            const incoming = Array.isArray(result.strokes) ? result.strokes : [];

            setStrokes((current) => reset
                ? incoming
                : mergeStrokes(current, incoming));
            setTexts(Array.isArray(result.texts) ? result.texts : []);
            lastStrokeIdRef.current = Math.max(
                reset ? 0 : lastStrokeIdRef.current,
                ...incoming.map((stroke) => Number(stroke.id) || 0),
            );
            setStatus('success');
            setErrorMessage('');
        } catch (error) {
            setStatus('error');
            setErrorMessage(error instanceof Error
                ? error.message
                : 'Не удалось загрузить доску');
        } finally {
            loadingRef.current = false;
        }
    }, [lessonId]);

    useEffect(() => {
        lastStrokeIdRef.current = 0;
        void load({ reset: true });
    }, [lessonId, load]);

    useEffect(() => subscribeEvents((event) => {
        if (event?.action === 'clear') {
            lastStrokeIdRef.current = 0;
            setStrokes([]);
            setTexts([]);
            return;
        }

        void load();
    }), [load, subscribeEvents]);

    const addStroke = useCallback(async (stroke) => {
        const result = await apiRequest(API.classroomBoardStrokes, {
            method: 'POST',
            body: {
                lesson_id: Number(lessonId),
                ...stroke,
            },
        });

        if (result.stroke) {
            setStrokes((current) => mergeStrokes(current, [result.stroke]));
            lastStrokeIdRef.current = Math.max(
                lastStrokeIdRef.current,
                Number(result.stroke.id) || 0,
            );
        }
    }, [lessonId]);

    const clear = useCallback(async () => {
        await apiRequest(API.classroomBoardClear, {
            method: 'POST',
            body: { lesson_id: Number(lessonId) },
        });
        lastStrokeIdRef.current = 0;
        setStrokes([]);
        setTexts([]);
    }, [lessonId]);

    const addText = useCallback(async (text) => {
        const result = await apiRequest(API.classroomBoardTexts, {
            method: 'POST',
            body: { lesson_id: Number(lessonId), ...text },
        });
        if (result.text) setTexts((current) => [...current, result.text]);
    }, [lessonId]);

    const updateText = useCallback(async (id, text) => {
        const result = await apiRequest(`${API.classroomBoardTexts}/${Number(id)}`, {
            method: 'PATCH',
            body: {
                lesson_id: Number(lessonId),
                content: text.content,
                color: text.color,
                x: text.x,
                y: text.y,
            },
        });
        if (result.text) {
            setTexts((current) => current.map((item) =>
                Number(item.id) === Number(id) ? result.text : item));
        }
    }, [lessonId]);

    const deleteText = useCallback(async (id) => {
        await apiRequest(
            `${API.classroomBoardTexts}/${Number(id)}?lesson_id=${Number(lessonId)}`,
            { method: 'DELETE' },
        );
        setTexts((current) => current.filter((item) => Number(item.id) !== Number(id)));
    }, [lessonId]);

    return {
        strokes,
        texts,
        status,
        errorMessage,
        addStroke,
        addText,
        updateText,
        deleteText,
        clear,
        retry: () => load({ reset: true }),
    };
}
