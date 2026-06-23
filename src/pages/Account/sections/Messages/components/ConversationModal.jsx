import { MessageBubble } from './MessageBubble.jsx';
import { MessageComposer } from './MessageComposer.jsx';

export function ConversationModal({
    role,
    activeTab,
    conversation,
    draft,
    onDraftChange,
    onSend,
    onClose,
}) {
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

                <div className="conversation-modal__messages">
                    {conversation.messages.map((message) => (
                        <MessageBubble
                            key={message.id}
                            role={role}
                            activeTab={activeTab}
                            message={message}
                        />
                    ))}
                </div>

                <MessageComposer
                    value={draft}
                    onChange={onDraftChange}
                    onSend={onSend}
                />
            </section>
        </div>
    );
}