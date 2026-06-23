export function ConversationItem({
    conversation,
    onOpenConversation,
}) {
    return (
        <button
            type="button"
            className="conversation-item"
            onClick={() => onOpenConversation(conversation)}
        >
            <span className="conversation-item__avatar">
                {conversation.name
                    .split(' ')
                    .map((part) => part[0])
                    .join('')
                    .slice(0, 2)}
            </span>

            <span className="conversation-item__body">
                <strong>{conversation.name}</strong>
                <small>{conversation.subtitle}</small>
                <em>{conversation.lastMessage}</em>
            </span>

            <span className="conversation-item__meta">
                <small>{conversation.time}</small>

                {conversation.unreadCount > 0 && (
                    <strong>{conversation.unreadCount}</strong>
                )}
            </span>
        </button>
    );
}