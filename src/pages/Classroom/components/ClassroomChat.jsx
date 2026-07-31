import {
    useEffect,
    useRef,
    useState,
} from 'react';

import { formatClassroomTime } from '../utils/classroom.js';

export function ClassroomChat({
    messages,
    canSend,
    isSaving,
    onSend,
}) {
    const [messageText, setMessageText] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const messagesRef = useRef(null);

    useEffect(() => {
        const container = messagesRef.current;

        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }, [messages]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        const normalizedText = messageText.trim();

        if (!normalizedText || !canSend || isSaving) {
            return;
        }

        setErrorMessage('');

        try {
            await onSend(normalizedText);
            setMessageText('');
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'Не удалось отправить сообщение',
            );
        }
    };

    return (
        <section className="classroom-card classroom-chat">
            <header className="classroom-card__header">
                <h2>Сообщения</h2>
                <span>чат урока</span>
            </header>

            <div className="classroom-chat__messages" ref={messagesRef}>
                {messages.length === 0 ? (
                    <p className="classroom-empty-text">
                        Сообщений пока нет.
                    </p>
                ) : messages.map((message) => (
                    <article
                        className={
                            message.is_own
                                ? 'classroom-chat__message classroom-chat__message--own'
                                : 'classroom-chat__message'
                        }
                        key={message.id}
                    >
                        <div>
                            <strong>{message.sender_name}</strong>
                            <span>{formatClassroomTime(message.created_at)}</span>
                        </div>

                        <p>{message.text}</p>
                    </article>
                ))}
            </div>

            <form className="classroom-chat__form" onSubmit={handleSubmit}>
                <label>
                    <span className="sr-only">Сообщение урока</span>
                    <input
                        type="text"
                        maxLength="2000"
                        value={messageText}
                        disabled={!canSend || isSaving}
                        placeholder={
                            canSend
                                ? 'Написать сообщение...'
                                : 'Чат доступен во время урока'
                        }
                        onChange={(event) => setMessageText(event.target.value)}
                    />
                </label>

                <button
                    type="submit"
                    disabled={!canSend || isSaving || !messageText.trim()}
                >
                    Отправить
                </button>

                {errorMessage && (
                    <p className="classroom-inline-error" role="alert">
                        {errorMessage}
                    </p>
                )}
            </form>
        </section>
    );
}
