import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import { API } from '../../../../api/api.js';
import { apiRequest } from '../../../../api/apiRequest.js';

import {
    mapConversation,
    mapMessage,
} from './utils.js';

const DIALOGS_POLL_INTERVAL = 10000;
const THREAD_POLL_INTERVAL = 5000;
const RESUME_REFRESH_DELAY = 750;

function buildThreadUrl(conversation, beforeId = null) {
    const params = new URLSearchParams({
        teacher_id: String(conversation.teacherId),
        student_id: String(conversation.studentId),
        channel_type: conversation.channelType,
        limit: '50',
    });

    if (beforeId) {
        params.set('before_id', String(beforeId));
    }

    return `${API.messageThread}?${params.toString()}`;
}

function mergeMessages(current, incoming) {
    const messagesById = new Map(
        current.map((message) => [message.id, message]),
    );

    incoming.forEach((message) => {
        messagesById.set(message.id, message);
    });

    return [...messagesById.values()].sort(
        (left, right) => left.id - right.id,
    );
}

export function useMessages(role) {
    const [dialogs, setDialogs] = useState([]);
    const [dialogsStatus, setDialogsStatus] = useState('idle');
    const [dialogsError, setDialogsError] = useState('');

    const [selectedConversation, setSelectedConversation] = useState(null);
    const [threadMessages, setThreadMessages] = useState([]);
    const [threadStatus, setThreadStatus] = useState('idle');
    const [threadError, setThreadError] = useState('');
    const [hasMore, setHasMore] = useState(false);
    const [nextBeforeId, setNextBeforeId] = useState(null);
    const [sendStatus, setSendStatus] = useState('idle');

    const selectedKeyRef = useRef(null);
    const selectedConversationRef = useRef(null);
    const dialogsRequestRef = useRef(false);
    const threadRequestsRef = useRef(new Set());
    const lastResumeRefreshRef = useRef(0);

    const totalUnread = useMemo(
        () => dialogs.reduce(
            (total, dialog) => total + dialog.unreadCount,
            0,
        ),
        [dialogs],
    );

    const loadDialogs = useCallback(async ({ silent = false } = {}) => {
        if (!role || dialogsRequestRef.current) {
            return;
        }

        dialogsRequestRef.current = true;

        if (!silent) {
            setDialogsStatus('loading');
            setDialogsError('');
        }

        try {
            const result = await apiRequest(API.messageDialogs);
            const loadedDialogs = Array.isArray(result.dialogs)
                ? result.dialogs.map((dialog) =>
                    mapConversation(dialog, role),
                )
                : [];

            setDialogs(loadedDialogs);
            setDialogsStatus('success');

            setSelectedConversation((current) => {
                if (!current) {
                    selectedConversationRef.current = null;
                    return null;
                }

                const updated = loadedDialogs.find(
                    (dialog) => dialog.key === current.key,
                );

                const nextConversation = updated
                    ? { ...current, ...updated }
                    : current;

                selectedConversationRef.current = nextConversation;

                return nextConversation;
            });
        } catch (error) {
            if (!silent) {
                setDialogsError(
                    error instanceof Error
                        ? error.message
                        : 'Не удалось загрузить диалоги',
                );
                setDialogsStatus('error');
            }
        } finally {
            dialogsRequestRef.current = false;
        }
    }, [role]);

    const markRead = useCallback(async (conversation) => {
        if (!conversation?.id) {
            return;
        }

        await apiRequest(API.markMessagesRead, {
            method: 'POST',
            body: {
                teacher_id: conversation.teacherId,
                student_id: conversation.studentId,
                channel_type: conversation.channelType,
            },
        });

        window.dispatchEvent(
            new Event('gostudy:notifications-refresh'),
        );

        setDialogs((current) => current.map((dialog) =>
            dialog.key === conversation.key
                ? { ...dialog, unreadCount: 0 }
                : dialog,
        ));
    }, []);

    const loadLatestThread = useCallback(async (
        conversation,
        { silent = false } = {},
    ) => {
        if (
            !conversation
            || threadRequestsRef.current.has(conversation.key)
        ) {
            return;
        }

        threadRequestsRef.current.add(conversation.key);

        if (!silent) {
            setThreadStatus('loading');
            setThreadError('');
        }

        try {
            const result = await apiRequest(
                buildThreadUrl(conversation),
            );

            if (selectedKeyRef.current !== conversation.key) {
                return;
            }

            const loadedMessages = Array.isArray(result.messages)
                ? result.messages.map(mapMessage)
                : [];

            setThreadMessages((current) => silent
                ? mergeMessages(current, loadedMessages)
                : loadedMessages,
            );

            if (!silent) {
                setHasMore(Boolean(result.has_more));
                setNextBeforeId(result.next_before_id || null);
            }
            setSelectedConversation((current) => {
                if (current?.key !== conversation.key) {
                    return current;
                }

                const nextConversation = {
                    ...current,
                    id: result.dialog_id ?? current.id,
                    canSend: Boolean(result.can_send),
                };

                selectedConversationRef.current = nextConversation;

                return nextConversation;
            });
            setThreadStatus('success');

            if (result.dialog_id) {
                try {
                    await markRead({
                        ...conversation,
                        id: result.dialog_id ?? conversation.id,
                    });
                } catch {
                    // Повторная синхронизация счётчика произойдёт при опросе списка.
                }
            }
        } catch (error) {
            if (!silent && selectedKeyRef.current === conversation.key) {
                setThreadError(
                    error instanceof Error
                        ? error.message
                        : 'Не удалось загрузить переписку',
                );
                setThreadStatus('error');
            }
        } finally {
            threadRequestsRef.current.delete(conversation.key);
        }
    }, [markRead]);

    const openConversation = useCallback((conversation) => {
        selectedKeyRef.current = conversation.key;
        selectedConversationRef.current = conversation;
        setSelectedConversation(conversation);
        setThreadMessages([]);
        setHasMore(false);
        setNextBeforeId(null);
        setSendStatus('idle');
        loadLatestThread(conversation);
    }, [loadLatestThread]);

    const closeConversation = useCallback(() => {
        selectedKeyRef.current = null;
        selectedConversationRef.current = null;
        setSelectedConversation(null);
        setThreadMessages([]);
        setThreadStatus('idle');
        setThreadError('');
        setSendStatus('idle');
    }, []);

    const loadOlderMessages = useCallback(async () => {
        if (!selectedConversation || !nextBeforeId || threadStatus === 'loading-more') {
            return;
        }

        setThreadStatus('loading-more');
        setThreadError('');

        try {
            const result = await apiRequest(
                buildThreadUrl(selectedConversation, nextBeforeId),
            );

            if (selectedKeyRef.current !== selectedConversation.key) {
                return;
            }

            const olderMessages = Array.isArray(result.messages)
                ? result.messages.map(mapMessage)
                : [];

            setThreadMessages((current) =>
                mergeMessages(olderMessages, current),
            );
            setHasMore(Boolean(result.has_more));
            setNextBeforeId(result.next_before_id || null);
            setThreadStatus('success');
        } catch (error) {
            setThreadError(
                error instanceof Error
                    ? error.message
                    : 'Не удалось загрузить предыдущие сообщения',
            );
            setThreadStatus('error');
        }
    }, [nextBeforeId, selectedConversation, threadStatus]);

    const sendMessage = useCallback(async (messageText) => {
        if (!selectedConversation || sendStatus === 'loading') {
            return false;
        }

        setSendStatus('loading');
        setThreadError('');

        try {
            const result = await apiRequest(API.sendMessage, {
                method: 'POST',
                body: {
                    teacher_id: selectedConversation.teacherId,
                    student_id: selectedConversation.studentId,
                    channel_type: selectedConversation.channelType,
                    message_text: messageText,
                },
            });

            const sentMessage = mapMessage(result.message);

            setThreadMessages((current) =>
                mergeMessages(current, [sentMessage]),
            );
            setSelectedConversation((current) => {
                if (!current) {
                    selectedConversationRef.current = null;
                    return current;
                }

                const nextConversation = {
                    ...current,
                    id: result.dialog_id,
                };

                selectedConversationRef.current = nextConversation;

                return nextConversation;
            });
            setSendStatus('success');
            await loadDialogs({ silent: true });

            return true;
        } catch (error) {
            setThreadError(
                error instanceof Error
                    ? error.message
                    : 'Не удалось отправить сообщение',
            );
            setSendStatus('error');
            return false;
        }
    }, [loadDialogs, selectedConversation, sendStatus]);

    useEffect(() => {
        if (!role) {
            return undefined;
        }

        const initialLoadId = window.setTimeout(() => {
            loadDialogs();
        }, 0);

        const intervalId = window.setInterval(() => {
            if (document.visibilityState === 'visible') {
                loadDialogs({ silent: true });
            }
        }, DIALOGS_POLL_INTERVAL);

        const refreshAfterResume = () => {
            if (document.visibilityState !== 'visible') {
                return;
            }

            const now = Date.now();

            if (
                now - lastResumeRefreshRef.current
                < RESUME_REFRESH_DELAY
            ) {
                return;
            }

            lastResumeRefreshRef.current = now;
            loadDialogs({ silent: true });

            const conversation = selectedConversationRef.current;

            if (conversation) {
                loadLatestThread(conversation, { silent: true });
            }
        };

        window.addEventListener('focus', refreshAfterResume);
        document.addEventListener('visibilitychange', refreshAfterResume);

        return () => {
            window.clearTimeout(initialLoadId);
            window.clearInterval(intervalId);
            window.removeEventListener('focus', refreshAfterResume);
            document.removeEventListener('visibilitychange', refreshAfterResume);
        };
    }, [loadDialogs, loadLatestThread, role]);

    useEffect(() => {
        if (!role) {
            return undefined;
        }

        const intervalId = window.setInterval(() => {
            const conversation = selectedConversationRef.current;

            if (
                document.visibilityState === 'visible'
                && conversation
            ) {
                loadLatestThread(conversation, { silent: true });
            }
        }, THREAD_POLL_INTERVAL);

        return () => window.clearInterval(intervalId);
    }, [loadLatestThread, role]);

    return {
        dialogs,
        dialogsStatus,
        dialogsError,
        totalUnread,
        selectedConversation,
        threadMessages,
        threadStatus,
        threadError,
        hasMore,
        sendStatus,
        reloadDialogs: loadDialogs,
        openConversation,
        closeConversation,
        loadOlderMessages,
        sendMessage,
    };
}
