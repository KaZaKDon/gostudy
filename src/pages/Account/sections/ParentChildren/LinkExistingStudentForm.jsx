import { useState } from 'react';

import { API } from '../../../../api/api.js';
import { apiRequest } from '../../../../api/apiRequest.js';

export function LinkExistingStudentForm({ child, onRequestCreated }) {
    const [isOpen, setIsOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle');
    const [message, setMessage] = useState('');
    const pendingRequest = child.link_request?.status === 'pending';

    if (child.student_account_created) {
        return (
            <p className="parent-child-link-state is-linked">
                Аккаунт ученика привязан: {child.linked_student_email}
            </p>
        );
    }

    if (pendingRequest) {
        return (
            <p className="parent-child-link-state">
                Запрос отправлен на {child.link_request.student_email}.
                Ожидаем подтверждения ученика.
            </p>
        );
    }

    if (child.verification_status !== 'verified') {
        return null;
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setStatus('saving');
        setMessage('');

        try {
            const result = await apiRequest(
                `${API.parentChildren}/${child.id}/link-existing`,
                { method: 'POST', body: { email } },
            );
            setStatus('success');
            setMessage(result.message);
            onRequestCreated(result.request);
        } catch (error) {
            setStatus('error');
            setMessage(error instanceof Error
                ? error.message
                : 'Не удалось отправить запрос');
        }
    }

    if (!isOpen) {
        return (
            <button
                type="button"
                className="parent-child-link-button"
                onClick={() => setIsOpen(true)}
            >
                Привязать существующий аккаунт
            </button>
        );
    }

    return (
        <form className="parent-child-link-form" onSubmit={handleSubmit}>
            <label>
                <span>Email существующего аккаунта ученика</span>
                <input
                    type="email"
                    value={email}
                    maxLength={320}
                    autoComplete="email"
                    placeholder="student@example.com"
                    required
                    onChange={(event) => setEmail(event.target.value)}
                />
            </label>
            <p>
                Имя, фамилия и год рождения в аккаунте ученика должны совпадать
                с карточкой.
            </p>
            {message && (
                <p className={`parent-child-link-form__message is-${status}`}>
                    {message}
                </p>
            )}
            <div>
                <button type="submit" disabled={status === 'saving'}>
                    {status === 'saving' ? 'Отправляем...' : 'Отправить запрос'}
                </button>
                <button type="button" onClick={() => setIsOpen(false)}>
                    Отмена
                </button>
            </div>
        </form>
    );
}
