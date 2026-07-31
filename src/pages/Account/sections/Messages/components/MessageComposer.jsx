export function MessageComposer({
    value,
    isSending,
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
                maxLength="10000"
                placeholder="Введите сообщение"
                disabled={isSending}
                onChange={(event) => onChange(event.target.value)}
            />

            <button
                type="submit"
                disabled={isSending || !value.trim()}
            >
                {isSending ? 'Отправляем...' : 'Отправить'}
            </button>
        </form>
    );
}
