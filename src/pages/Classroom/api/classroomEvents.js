import {
    API,
    getAuthHeaders,
} from '../../../api/api.js';

const INITIAL_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 10_000;

function waitForRetry(delay, signal) {
    return new Promise((resolve) => {
        const timerId = window.setTimeout(resolve, delay);

        signal.addEventListener('abort', () => {
            window.clearTimeout(timerId);
            resolve();
        }, { once: true });
    });
}

function readEventData(eventBlock) {
    const data = eventBlock
        .split(/\r?\n/)
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n');

    if (!data) {
        return null;
    }

    try {
        return JSON.parse(data);
    } catch {
        return null;
    }
}

async function consumeStream(response, signal, onEvent) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (!signal.aborted) {
        const { done, value } = await reader.read();

        if (done) {
            break;
        }

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop() || '';

        for (const block of blocks) {
            const event = readEventData(block);

            if (
                event
                && event.reason !== 'connected'
                && event.reason !== 'heartbeat'
            ) {
                onEvent(event);
            }
        }
    }
}

export function subscribeClassroomEvents({
    lessonId,
    onEvent,
    onStatus,
}) {
    const controller = new AbortController();

    const connect = async () => {
        let reconnectDelay = INITIAL_RECONNECT_DELAY_MS;

        while (!controller.signal.aborted) {
            onStatus('connecting');

            try {
                const query = new URLSearchParams({
                    lesson_id: String(Number(lessonId)),
                });
                const response = await fetch(`${API.classroomEvents}?${query}`, {
                    headers: getAuthHeaders(),
                    signal: controller.signal,
                });

                if (!response.ok || !response.body) {
                    throw new Error(`Classroom stream failed: ${response.status}`);
                }

                onStatus('connected');
                reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
                await consumeStream(response, controller.signal, onEvent);
            } catch {
                if (controller.signal.aborted) {
                    break;
                }

                onStatus('fallback');
            }

            await waitForRetry(reconnectDelay, controller.signal);
            reconnectDelay = Math.min(
                reconnectDelay * 2,
                MAX_RECONNECT_DELAY_MS,
            );
        }
    };

    void connect();

    return () => controller.abort();
}
