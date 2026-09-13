import {
    useEffect,
    useMemo,
    useRef,
} from 'react';

import { MessageBubble } from './MessageBubble.jsx';
import { MessageComposer } from './MessageComposer.jsx';

export function ConversationModal({
    conversation,
    messages,
    threadStatus,
    errorMessage,
    hasMore,
    sendStatus,
    draft,
    files,
    uploadLimits,
    uploadProgress,
    fileError,
    suspendKeyboardClose,
    onDraftChange,
    onFilesChange,
    onSend,
    onDownloadAttachment,
    onReportMessage,
    onLoadOlder,
    onClose,
}) {
    const messagesContainerRef = useRef(null);

    const lastMessageId = useMemo(
        () => messages.at(-1)?.id ?? null,
        [messages],
    );

    useEffect(() => {
        if (!conversation) {
            return undefined;
        }

        const handleKeyDown = (event) => {
            if (event.key === 'Escape' && !suspendKeyboardClose) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [conversation, onClose, suspendKeyboardClose]);

    useEffect(() => {
        const container = messagesContainerRef.current;

        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }, [conversation?.key, lastMessageId]);

    if (!conversation) return null;

    return (
        <div className="conversation-modal">
            <button
                type="button"
                className="conversation-modal__overlay"
                aria-label="Закрыть переписку"
                onClick={onClose}
            />

            <section
                className="conversation-modal__panel"
                role="dialog"
                aria-modal="true"
            >
                <header className="conversation-modal__header">
                    <div>
                        <span>Переписка</span>
                        <h2>{conversation.name}</h2>
                    <p>{conversation.subtitle}</p>
                    {conversation.parentAccessNotice && (
                        <small className="conversation-modal__notice">
                            {conversation.parentAccessNotice}
                        </small>
                    )}
                </div>

                    <button
                        type="button"
                        className="conversation-modal__close"
                        aria-label="Закрыть"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </header>

                <div
                    ref={messagesContainerRef}
                    className="conversation-modal__messages"
                >
                    {hasMore && (
                        <button
                            type="button"
                            className="conversation-modal__older"
                            disabled={threadStatus === 'loading-more'}
                            onClick={onLoadOlder}
                        >
                            {threadStatus === 'loading-more'
                                ? 'Загружаем...'
                                : 'Показать предыдущие сообщения'}
                        </button>
                    )}

                    {threadStatus === 'loading' && (
                        <p className="conversation-modal__state">
                            Загружаем переписку...
                        </p>
                    )}

                    {threadStatus !== 'loading' && !messages.length && !errorMessage && (
                        <p className="conversation-modal__state">
                            Сообщений пока нет.
                        </p>
                    )}

                    {messages.map((message) => (
                        <MessageBubble
                            key={message.id}
                            message={message}
                            onDownloadAttachment={onDownloadAttachment}
                            onReport={onReportMessage}
                        />
                    ))}

                    {errorMessage && (
                        <p className="conversation-modal__error">
                            {errorMessage}
                        </p>
                    )}
                </div>

                {conversation.canSend ? (
                    <MessageComposer
                        value={draft}
                        files={files}
                        uploadLimits={uploadLimits}
                        uploadProgress={uploadProgress}
                        fileError={fileError}
                        isSending={sendStatus === 'loading'}
                        onChange={onDraftChange}
                        onFilesChange={onFilesChange}
                        onSend={onSend}
                    />
                ) : (
                    <p className="conversation-modal__readonly">
                        Переписка доступна только для просмотра.
                    </p>
                )}
            </section>
        </div>
    );
}
