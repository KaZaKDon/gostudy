import { formatFileSize } from '../../../../../api/upload.js';

export function MessageBubble({
    message,
    onDownloadAttachment,
    onReport,
}) {
    return (
        <div
            className={[
                'message-bubble',
                `message-bubble--${message.authorType}`,
                message.isOwn
                    ? 'message-bubble--own'
                    : 'message-bubble--other',
            ].join(' ')}
        >
            <div className="message-bubble__head">
                <strong>{message.authorName}</strong>
                <span>{message.time}</span>
            </div>

            {message.text && <p>{message.text}</p>}

            {!!message.attachments.length && (
                <div className="message-bubble__attachments">
                    {message.attachments.map((attachment) => (
                        <button
                            key={attachment.id}
                            type="button"
                            onClick={() => onDownloadAttachment(attachment)}
                        >
                            <span>{attachment.originalName}</span>
                            <small>{formatFileSize(attachment.fileSize)}</small>
                        </button>
                    ))}
                </div>
            )}

            {!message.isOwn && !message.isHidden && (
                <button
                    type="button"
                    className="message-bubble__report"
                    onClick={() => onReport(message)}
                >
                    Пожаловаться
                </button>
            )}
        </div>
    );
}
