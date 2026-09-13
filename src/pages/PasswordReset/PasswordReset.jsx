import { useState } from 'react';
import {
    Link,
    useSearchParams,
} from 'react-router-dom';

import { API } from '../../api/api.js';
import { apiRequest } from '../../api/apiRequest.js';
import { PasswordField } from '../../components/PasswordField/PasswordField.jsx';

import './PasswordReset.css';

export function PasswordReset() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token')?.trim() || '';
    const [email, setEmail] = useState('');
    const [passwords, setPasswords] = useState({
        new_password: '',
        new_password_confirmation: '',
    });
    const [status, setStatus] = useState('idle');
    const [message, setMessage] = useState('');

    const isSaving = status === 'saving';
    const isComplete = status === 'success';

    const updatePassword = (event) => {
        const { name, value } = event.target;

        setPasswords((current) => ({
            ...current,
            [name]: value,
        }));
    };

    const submitEmail = async (event) => {
        event.preventDefault();
        setStatus('saving');
        setMessage('');

        try {
            const result = await apiRequest(API.forgotPassword, {
                method: 'POST',
                body: { email },
            });

            setStatus('success');
            setMessage(result.message);
        } catch (error) {
            setStatus('error');
            setMessage(error.message);
        }
    };

    const submitPassword = async (event) => {
        event.preventDefault();

        if (passwords.new_password !== passwords.new_password_confirmation) {
            setStatus('error');
            setMessage('Новый пароль и подтверждение не совпадают');
            return;
        }

        setStatus('saving');
        setMessage('');

        try {
            const result = await apiRequest(API.resetPassword, {
                method: 'POST',
                body: {
                    token,
                    ...passwords,
                },
            });

            setPasswords({
                new_password: '',
                new_password_confirmation: '',
            });
            setStatus('success');
            setMessage(result.message);
        } catch (error) {
            setStatus('error');
            setMessage(error.message);
        }
    };

    return (
        <main className="auth-page">
            <section className="auth-card">
                <Link className="auth-card__back" to="/login">
                    ← Назад ко входу
                </Link>

                <h1>Восстановление пароля</h1>

                {!token ? (
                    <>
                        <p className="auth-card__note">
                            Введите почту, указанную при регистрации. Мы
                            отправим ссылку для восстановления доступа.
                        </p>

                        <form className="auth-card__form" onSubmit={submitEmail}>
                            <label>
                                <span>Почта</span>

                                <input
                                    type="email"
                                    value={email}
                                    placeholder="example@mail.ru"
                                    autoComplete="email"
                                    required
                                    disabled={isSaving || isComplete}
                                    onChange={(event) => setEmail(event.target.value)}
                                />
                            </label>

                            {message && (
                                <p className={status === 'error'
                                    ? 'auth-card__error'
                                    : 'auth-card__success'}
                                >
                                    {message}
                                </p>
                            )}

                            {!isComplete && (
                                <button type="submit" disabled={isSaving}>
                                    {isSaving ? 'Отправляем...' : 'Отправить ссылку'}
                                </button>
                            )}
                        </form>
                    </>
                ) : (
                    <>
                        <p className="auth-card__note">
                            Придумайте новый пароль длиной не менее 8 символов.
                        </p>

                        <form className="auth-card__form" onSubmit={submitPassword}>
                            <PasswordField
                                label="Новый пароль"
                                name="new_password"
                                value={passwords.new_password}
                                placeholder="Не менее 8 символов"
                                autoComplete="new-password"
                                minLength={8}
                                required
                                disabled={isSaving || isComplete}
                                onChange={updatePassword}
                            />

                            <PasswordField
                                label="Повторите новый пароль"
                                name="new_password_confirmation"
                                value={passwords.new_password_confirmation}
                                placeholder="Повторите новый пароль"
                                autoComplete="new-password"
                                minLength={8}
                                required
                                disabled={isSaving || isComplete}
                                onChange={updatePassword}
                            />

                            {message && (
                                <p className={status === 'error'
                                    ? 'auth-card__error'
                                    : 'auth-card__success'}
                                >
                                    {message}
                                </p>
                            )}

                            {!isComplete && (
                                <button type="submit" disabled={isSaving}>
                                    {isSaving ? 'Сохраняем...' : 'Установить пароль'}
                                </button>
                            )}

                            {isComplete && (
                                <p className="auth-card__bottom">
                                    <Link to="/login">Перейти ко входу</Link>
                                </p>
                            )}
                        </form>
                    </>
                )}
            </section>
        </main>
    );
}
