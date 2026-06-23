function getOwnAuthorType(role, activeTab) {
    if (role === 'teacher') {
        return 'teacher';
    }

    if (activeTab === 'parent') {
        return 'parent';
    }

    return 'student';
}

export function MessageBubble({
    role,
    activeTab,
    message,
}) {
    const ownAuthorType = getOwnAuthorType(role, activeTab);
    const isOwnMessage = message.authorType === ownAuthorType;

    return (
        <div
            className={[
                'message-bubble',
                `message-bubble--${message.authorType}`,
                isOwnMessage
                    ? 'message-bubble--own'
                    : 'message-bubble--other',
            ].join(' ')}
        >
            <div className="message-bubble__head">
                <strong>{message.authorName}</strong>
                <span>{message.time}</span>
            </div>

            <p>{message.text}</p>
        </div>
    );
}