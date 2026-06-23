export function MessageComposer({
    value,
    onChange,
    onSend,
}) {
    return (
        <form
            className="message-composer"
            onSubmit={(event) => {
                event.preventDefault();
                onSend();
            }}
        >
            <textarea
                value={value}
                rows="3"
                placeholder="Введите сообщение"
                onChange={(event) => onChange(event.target.value)}
            />

            <button type="submit">
                Отправить
            </button>
        </form>
    );
}