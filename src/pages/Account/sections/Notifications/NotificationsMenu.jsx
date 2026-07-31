import {
    useEffect,
    useRef,
    useState,
} from 'react';

import './NotificationsMenu.css';

function formatNotificationTime(value) {
    if (!value) {
        return '';
    }

    const date = new Date(String(value).replace(' ', 'T'));

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

export function NotificationsMenu({
    controller,
    onOpenNotification,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const rootRef = useRef(null);

    const {
        notifications,
        unreadCount,
        status,
        errorMessage,
        actionError,
        hasMore,
        loadMore,
        retry,
        markRead,
        markAllRead,
        deleteNotification,
        clearNotifications,
    } = controller;

    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        const closeOnOutsideClick = (event) => {
            if (!rootRef.current?.contains(event.target)) {
                setIsOpen(false);
            }
        };

        const closeOnEscape = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('pointerdown', closeOnOutsideClick);
        document.addEventListener('keydown', closeOnEscape);

        return () => {
            document.removeEventListener('pointerdown', closeOnOutsideClick);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [isOpen]);

    const handleOpen = async (notification) => {
        setIsOpen(false);
        await markRead(notification.id);
        onOpenNotification(notification);
    };

    const handleDelete = async (event, notificationId) => {
        event.stopPropagation();
        await deleteNotification(notificationId);
    };

    const handleClearAll = async () => {
        const confirmed = window.confirm(
            'Удалить все уведомления? Восстановить их будет нельзя.',
        );

        if (confirmed) {
            await clearNotifications('all');
        }
    };

    return (
        <div
            ref={rootRef}
            className="notifications-menu"
        >
            <button
                type="button"
                className="notifications-menu__bell"
                aria-label={
                    unreadCount > 0
                        ? `Уведомления: ${unreadCount} непрочитанных`
                        : 'Уведомления'
                }
                aria-expanded={isOpen}
                onClick={() => setIsOpen((current) => !current)}
            >
                <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
                </svg>

                {unreadCount > 0 && (
                    <b>{unreadCount > 99 ? '99+' : unreadCount}</b>
                )}
            </button>

            {isOpen && (
                <section className="notifications-menu__panel">
                    <header className="notifications-menu__header">
                        <div>
                            <span>События</span>
                            <h2>Уведомления</h2>
                        </div>

                        {unreadCount > 0 && (
                            <button
                                type="button"
                                onClick={markAllRead}
                            >
                                Прочитать все
                            </button>
                        )}
                    </header>

                    <div className="notifications-menu__list">
                        {status === 'loading' && notifications.length === 0 ? (
                            <p className="notifications-menu__state">
                                Загружаем уведомления...
                            </p>
                        ) : status === 'error' && notifications.length === 0 ? (
                            <div className="notifications-menu__state">
                                <p>{errorMessage}</p>
                                <button type="button" onClick={retry}>
                                    Повторить
                                </button>
                            </div>
                        ) : notifications.length === 0 ? (
                            <p className="notifications-menu__state">
                                Новых событий пока нет
                            </p>
                        ) : (
                            notifications.map((notification) => (
                                <article
                                    key={notification.id}
                                    className={
                                        notification.isRead
                                            ? 'notifications-menu__item'
                                            : 'notifications-menu__item notifications-menu__item--unread'
                                    }
                                >
                                    <button
                                        type="button"
                                        className="notifications-menu__item-open"
                                        onClick={() => handleOpen(notification)}
                                    >
                                        <span className="notifications-menu__item-title">
                                            {notification.title}
                                        </span>
                                        <span className="notifications-menu__item-message">
                                            {notification.message}
                                        </span>
                                        <time dateTime={notification.createdAt || undefined}>
                                            {formatNotificationTime(notification.createdAt)}
                                        </time>
                                    </button>

                                    <button
                                        type="button"
                                        className="notifications-menu__item-delete"
                                        aria-label={`Удалить уведомление «${notification.title}»`}
                                        data-tooltip="Удалить уведомление"
                                        onClick={(event) => handleDelete(
                                            event,
                                            notification.id,
                                        )}
                                    >
                                        <span aria-hidden="true">×</span>
                                    </button>
                                </article>
                            ))
                        )}

                        {hasMore && notifications.length > 0 && (
                            <button
                                type="button"
                                className="notifications-menu__more"
                                disabled={status === 'loading-more'}
                                onClick={loadMore}
                            >
                                {status === 'loading-more'
                                    ? 'Загружаем...'
                                    : 'Показать ещё'}
                            </button>
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <footer className="notifications-menu__footer">
                            {actionError && (
                                <p role="alert">{actionError}</p>
                            )}

                            <div>
                                <button
                                    type="button"
                                    onClick={() => clearNotifications('read')}
                                >
                                    Очистить прочитанные
                                </button>
                                <button
                                    type="button"
                                    onClick={handleClearAll}
                                >
                                    Удалить все
                                </button>
                            </div>
                        </footer>
                    )}
                </section>
            )}
        </div>
    );
}
