import { useState } from 'react';

import { API } from '../../../../api/api.js';
import { apiRequest } from '../../../../api/apiRequest.js';
import { PasswordField } from '../../../../components/PasswordField/PasswordField.jsx';

export function CreateStudentAccountForm({ child, onAccountCreated }) {
    const [isOpen, setIsOpen] = useState(false);
    const [form, setForm] = useState({
        email: '',
        password: '',
        passwordConfirmation: '',
    });
    const [status, setStatus] = useState('idle');
    const [message, setMessage] = useState('');

    if (
        child.student_account_created
        || child.verification_status !== 'verified'
        || child.link_request?.status === 'pending'
    ) {
        return null;
    }

    function updateField(field, value) {
        setForm((current) => ({ ...current, [field]: value }));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setMessage('');

        if (form.password !== form.passwordConfirmation) {
            setStatus('error');
            setMessage('Пароли не совпадают');
            return;
        }

        setStatus('saving');
        try {
            const result = await apiRequest(
                `${API.parentChildren}/${child.id}/create-student-account`,
                {
                    method: 'POST',
                    body: {
                        email: form.email,
                        password: form.password,
                        password_confirmation: form.passwordConfirmation,
                    },
                },
            );
            setStatus('success');
            setMessage(result.message);
            onAccountCreated(result.student, result.message);
        } catch (error) {
            setStatus('error');
            setMessage(error instanceof Error
                ? error.message
                : 'Не удалось создать аккаунт ученика');
        }
    }

    if (!isOpen) {
        return (
            <button
                type="button"
                className="parent-child-link-button is-secondary"
                onClick={() => setIsOpen(true)}
            >
                Создать новый аккаунт ученика
            </button>
        );
    }

    return (
        <form className="parent-child-link-form" onSubmit={handleSubmit}>
            <h4>Новый аккаунт ученика</h4>
            <label>
                <span>Email ученика</span>
                <input
                    type="email"
                    value={form.email}
                    maxLength={320}
                    autoComplete="email"
                    required
                    onChange={(event) => updateField('email', event.target.value)}
                />
            </label>
            <PasswordField
                label="Временный пароль"
                placeholder="Не менее 6 символов"
                autoComplete="new-password"
                value={form.password}
                minLength={6}
                maxLength={72}
                required
                disabled={status === 'saving'}
                onChange={(event) => updateField('password', event.target.value)}
            />
            <PasswordField
                label="Повторите пароль"
                placeholder="Повторите временный пароль"
                autoComplete="new-password"
                value={form.passwordConfirmation}
                minLength={6}
                maxLength={72}
                required
                disabled={status === 'saving'}
                onChange={(event) => updateField(
                    'passwordConfirmation',
                    event.target.value,
                )}
            />
            <p>
                Ученик подтвердит свою почту, войдёт с этим паролем и завершит
                анкету. Данные карточки будут перенесены автоматически.
            </p>
            {message && (
                <p className={`parent-child-link-form__message is-${status}`}>
                    {message}
                </p>
            )}
            <div>
                <button type="submit" disabled={status === 'saving'}>
                    {status === 'saving' ? 'Создаём...' : 'Создать и привязать'}
                </button>
                <button type="button" onClick={() => setIsOpen(false)}>
                    Отмена
                </button>
            </div>
        </form>
    );
}
