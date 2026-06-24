export function ClassroomChat({ messages }) {
    return (
        <section className="classroom-card classroom-chat">
            <header className="classroom-card__header">
                <h2>Сообщения</h2>
                <span>чат урока</span>
            </header>

            <div className="classroom-chat__messages">
                {messages.map((message) => (
                    <article
                        className={
                            message.isOwn
                                ? 'classroom-chat__message classroom-chat__message--own'
                                : 'classroom-chat__message'
                        }
                        key={message.id}
                    >
                        <div>
                            <strong>{message.author}</strong>
                            <span>{message.time}</span>
                        </div>

                        <p>{message.text}</p>
                    </article>
                ))}
            </div>

            <form className="classroom-chat__form">
                <input
                    type="text"
                    placeholder="Написать сообщение..."
                    aria-label="Сообщение урока"
                />

                <button type="button">
                    Отправить
                </button>
            </form>
        </section>
    );
}