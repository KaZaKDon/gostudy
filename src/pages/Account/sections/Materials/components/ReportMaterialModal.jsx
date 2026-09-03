import { useState } from 'react';

const REASONS = [
    ['copyright', 'Нарушение авторских прав'],
    ['inappropriate', 'Недопустимое содержание'],
    ['harmful', 'Опасная или вредная информация'],
    ['broken_link', 'Ссылка не работает'],
    ['other', 'Другая причина'],
];

export function ReportMaterialModal({ material, isSaving, onReport, onClose }) {
    const [reason, setReason] = useState('other');
    const [comment, setComment] = useState('');
    const [error, setError] = useState('');

    if (!material) return null;

    async function handleSubmit(event) {
        event.preventDefault();
        try {
            await onReport(material.id, reason, comment.trim());
            onClose();
        } catch (requestError) {
            setError(requestError.message);
        }
    }

    return (
        <div className="material-modal">
            <button type="button" className="material-modal__overlay" aria-label="Закрыть" onClick={onClose} />
            <form className="material-modal__panel material-modal__panel--compact" onSubmit={handleSubmit}>
                <header className="material-modal__header">
                    <div>
                        <span>Обращение администрации</span>
                        <h2>Пожаловаться на материал</h2>
                    </div>
                    <button type="button" onClick={onClose}>×</button>
                </header>
                <div className="material-modal__form">
                    {error && <p className="materials-message materials-message--error material-modal__wide">{error}</p>}
                    <p className="material-modal__hint material-modal__wide">«{material.title}»</p>
                    <label className="material-modal__wide">
                        <span>Причина</span>
                        <select value={reason} onChange={(event) => setReason(event.target.value)}>
                            {REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                    </label>
                    <label className="material-modal__wide">
                        <span>Комментарий</span>
                        <textarea rows="5" maxLength="3000" value={comment} onChange={(event) => setComment(event.target.value)} />
                    </label>
                </div>
                <footer className="material-modal__actions">
                    <button type="button" onClick={onClose}>Отмена</button>
                    <button type="submit" className="material-modal__accept" disabled={isSaving}>Отправить</button>
                </footer>
            </form>
        </div>
    );
}
