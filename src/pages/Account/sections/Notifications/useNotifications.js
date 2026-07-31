import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import { API } from '../../../../api/api.js';
import { apiRequest } from '../../../../api/apiRequest.js';

const NOTIFICATIONS_POLL_INTERVAL = 15000;
const PAGE_SIZE = 20;

function mapNotification(notification) {
    return {
        id: Number(notification.id),
        type: notification.type || '',
        dedupeKey: notification.dedupe_key || null,
        title: notification.title || 'Уведомление',
        message: notification.message || '',
        targetSection: notification.target_section || null,
        targetEntityType: notification.target_entity_type || null,
        targetEntityId: notification.target_entity_id === null
            ? null
            : Number(notification.target_entity_id),
        targetDate: notification.target_date || null,
        isRead: Boolean(notification.is_read),
        readAt: notification.read_at || null,
        createdAt: notification.created_at || null,
    };
}

function mergeNotifications(current, incoming) {
    const notificationsById = new Map(
        current.map((notification) => [notification.id, notification]),
    );

    incoming.forEach((notification) => {
        if (notification.dedupeKey) {
            for (const [id, currentNotification] of notificationsById) {
                if (
                    currentNotification.dedupeKey === notification.dedupeKey
                    && id !== notification.id
                ) {
                    notificationsById.delete(id);
                }
            }
        }

        notificationsById.set(notification.id, notification);
    });

    return [...notificationsById.values()].sort(
        (left, right) => right.id - left.id,
    );
}

export function useNotifications(isEnabled) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [status, setStatus] = useState('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [actionError, setActionError] = useState('');
    const [hasMore, setHasMore] = useState(false);
    const requestRef = useRef(false);
    const dataVersionRef = useRef(0);
    const actionInProgressRef = useRef(false);
    const nextBeforeIdRef = useRef(null);
    const loadedPastFirstPageRef = useRef(false);

    const beginAction = useCallback(() => {
        if (actionInProgressRef.current) {
            return false;
        }

        actionInProgressRef.current = true;
        dataVersionRef.current += 1;

        return true;
    }, []);

    const endAction = useCallback(() => {
        actionInProgressRef.current = false;
    }, []);

    const loadNotifications = useCallback(async ({
        silent = false,
        append = false,
    } = {}) => {
        if (
            !isEnabled
            || requestRef.current
            || actionInProgressRef.current
        ) {
            return;
        }

        requestRef.current = true;
        const requestDataVersion = dataVersionRef.current;

        if (!silent) {
            setStatus(append ? 'loading-more' : 'loading');
            setErrorMessage('');
        }

        try {
            const params = new URLSearchParams({
                limit: String(PAGE_SIZE),
            });

            if (append && nextBeforeIdRef.current) {
                params.set('before_id', String(nextBeforeIdRef.current));
            }

            const result = await apiRequest(
                `${API.notifications}?${params.toString()}`,
            );

            if (
                requestDataVersion !== dataVersionRef.current
                || actionInProgressRef.current
            ) {
                return;
            }

            const loaded = Array.isArray(result.notifications)
                ? result.notifications.map(mapNotification)
                : [];

            setNotifications((current) =>
                append
                    ? mergeNotifications(current, loaded)
                    : mergeNotifications(current, loaded),
            );
            setUnreadCount(Number(result.unread_count) || 0);
            setStatus('success');

            if (append) {
                loadedPastFirstPageRef.current = true;
                nextBeforeIdRef.current = result.next_before_id || null;
                setHasMore(Boolean(result.has_more));
            } else if (!loadedPastFirstPageRef.current) {
                nextBeforeIdRef.current = result.next_before_id || null;
                setHasMore(Boolean(result.has_more));
            }
        } catch (error) {
            if (
                !silent
                && requestDataVersion === dataVersionRef.current
                && !actionInProgressRef.current
            ) {
                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : 'Не удалось загрузить уведомления',
                );
                setStatus('error');
            }
        } finally {
            requestRef.current = false;
        }
    }, [isEnabled]);

    const markRead = useCallback(async (notificationId) => {
        const notification = notifications.find(
            (item) => item.id === notificationId,
        );

        if (!notification || notification.isRead) {
            return;
        }

        if (!beginAction()) {
            return;
        }

        setNotifications((current) => current.map((item) =>
            item.id === notificationId
                ? { ...item, isRead: true }
                : item,
        ));
        setUnreadCount((current) => Math.max(0, current - 1));

        try {
            const result = await apiRequest(API.markNotificationsRead, {
                method: 'POST',
                body: { notification_id: notificationId },
            });

            setUnreadCount(Number(result.unread_count) || 0);
        } catch {
            setNotifications((current) => current.map((item) =>
                item.id === notificationId
                    ? { ...item, isRead: false }
                    : item,
            ));
            setUnreadCount((current) => current + 1);
        } finally {
            endAction();
        }
    }, [beginAction, endAction, notifications]);

    const deleteNotification = useCallback(async (notificationId) => {
        const notification = notifications.find(
            (item) => item.id === notificationId,
        );

        if (!notification) {
            return;
        }

        if (!beginAction()) {
            return;
        }

        setActionError('');
        setNotifications((current) => current.filter(
            (item) => item.id !== notificationId,
        ));

        if (!notification.isRead) {
            setUnreadCount((current) => Math.max(0, current - 1));
        }

        try {
            const result = await apiRequest(API.deleteNotification, {
                method: 'POST',
                body: { notification_id: notificationId },
            });

            setUnreadCount(Number(result.unread_count) || 0);
        } catch (error) {
            setActionError(
                error instanceof Error
                    ? error.message
                    : 'Не удалось удалить уведомление',
            );
            setNotifications((current) => mergeNotifications(
                current,
                [notification],
            ));

            if (!notification.isRead) {
                setUnreadCount((current) => current + 1);
            }
        } finally {
            endAction();
        }
    }, [beginAction, endAction, notifications]);

    const clearNotifications = useCallback(async (mode) => {
        if (!['read', 'all'].includes(mode)) {
            return;
        }

        if (!beginAction()) {
            return;
        }

        const previousNotifications = notifications;
        const previousUnreadCount = unreadCount;
        const previousHasMore = hasMore;
        const previousNextBeforeId = nextBeforeIdRef.current;
        const previousLoadedPastFirstPage = loadedPastFirstPageRef.current;

        setActionError('');
        setNotifications((current) => mode === 'all'
            ? []
            : current.filter((item) => !item.isRead));

        if (mode === 'all') {
            setUnreadCount(0);
            setHasMore(false);
            nextBeforeIdRef.current = null;
            loadedPastFirstPageRef.current = false;
        }

        try {
            const result = await apiRequest(API.clearNotifications, {
                method: 'POST',
                body: { mode },
            });

            setUnreadCount(Number(result.unread_count) || 0);

        } catch (error) {
            setActionError(
                error instanceof Error
                    ? error.message
                    : 'Не удалось очистить уведомления',
            );
            setNotifications(previousNotifications);
            setUnreadCount(previousUnreadCount);
            setHasMore(previousHasMore);
            nextBeforeIdRef.current = previousNextBeforeId;
            loadedPastFirstPageRef.current = previousLoadedPastFirstPage;
        } finally {
            endAction();
        }
    }, [
        beginAction,
        endAction,
        hasMore,
        notifications,
        unreadCount,
    ]);

    const markAllRead = useCallback(async () => {
        if (unreadCount === 0) {
            return;
        }

        if (!beginAction()) {
            return;
        }

        const previousNotifications = notifications;
        const previousUnreadCount = unreadCount;

        setNotifications((current) => current.map((item) => ({
            ...item,
            isRead: true,
        })));
        setUnreadCount(0);

        try {
            const result = await apiRequest(API.markNotificationsRead, {
                method: 'POST',
                body: { mark_all: true },
            });

            setUnreadCount(Number(result.unread_count) || 0);
        } catch {
            setNotifications(previousNotifications);
            setUnreadCount(previousUnreadCount);
        } finally {
            endAction();
        }
    }, [
        beginAction,
        endAction,
        notifications,
        unreadCount,
    ]);

    useEffect(() => {
        if (!isEnabled) {
            return undefined;
        }

        const initialLoadId = window.setTimeout(() => {
            loadNotifications();
        }, 0);

        const intervalId = window.setInterval(() => {
            if (document.visibilityState === 'visible') {
                loadNotifications({ silent: true });
            }
        }, NOTIFICATIONS_POLL_INTERVAL);

        const refresh = () => {
            if (document.visibilityState === 'visible') {
                loadNotifications({ silent: true });
            }
        };

        window.addEventListener('focus', refresh);
        document.addEventListener('visibilitychange', refresh);
        window.addEventListener('gostudy:notifications-refresh', refresh);

        return () => {
            window.clearTimeout(initialLoadId);
            window.clearInterval(intervalId);
            window.removeEventListener('focus', refresh);
            document.removeEventListener('visibilitychange', refresh);
            window.removeEventListener('gostudy:notifications-refresh', refresh);
        };
    }, [isEnabled, loadNotifications]);

    return {
        notifications,
        unreadCount,
        status,
        errorMessage,
        actionError,
        hasMore,
        loadMore: () => loadNotifications({ append: true }),
        retry: () => loadNotifications(),
        markRead,
        markAllRead,
        deleteNotification,
        clearNotifications,
    };
}
