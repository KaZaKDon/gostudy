import { ConversationItem } from './ConversationItem.jsx';

export function ConversationList({
    conversations,
    status,
    errorMessage,
    onOpenConversation,
    onRetry,
}) {
    if (status === 'loading') {
        return (
            <div className="conversation-list__empty">
                Загружаем диалоги...
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="conversation-list__error">
                <p>{errorMessage}</p>

                <button type="button" onClick={() => onRetry()}>
                    Повторить
                </button>
            </div>
        );
    }

    if (!conversations.length) {
        return (
            <div className="conversation-list__empty">
                Диалогов пока нет.
            </div>
        );
    }

    return (
        <div className="conversation-list">
            {conversations.map((conversation) => (
                <ConversationItem
                    key={conversation.key}
                    conversation={conversation}
                    onOpenConversation={onOpenConversation}
                />
            ))}
        </div>
    );
}
