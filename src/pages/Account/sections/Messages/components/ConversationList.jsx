import { ConversationItem } from './ConversationItem.jsx';

export function ConversationList({
    conversations,
    onOpenConversation,
}) {
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
                    key={conversation.id}
                    conversation={conversation}
                    onOpenConversation={onOpenConversation}
                />
            ))}
        </div>
    );
}