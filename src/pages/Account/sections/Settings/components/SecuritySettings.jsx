import {
    useEffect,
    useState,
} from 'react';

import { API } from '../../../../../api/api.js';
import { apiRequest } from '../../../../../api/apiRequest.js';
import { PasswordField } from '../../../../../components/PasswordField/PasswordField.jsx';

import { SettingsMessage } from './SettingsMessage.jsx';

const EMPTY_PASSWORDS = {
    current_password: '',
    new_password: '',
    new_password_confirmation: '',
};

export function SecuritySettings() {
    const [activeSessions, setActiveSessions] = useState(null);
    const [passwords, setPasswords] = useState(EMPTY_PASSWORDS);
    const [status, setStatus] = useState('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const controller = new AbortController();

        apiRequest(API.accountSecurity, {
            signal: controller.signal,
        }).then((result) => {
            setActiveSessions(result.active_sessions);
            setStatus('idle');
        }).catch((error) => {
            if (error.name !== 'AbortError') {
                setStatus('error');
                setMessage(error.message);
            }
        });

        return () => controller.abort();
    }, []);

    const updatePassword = (event) => {
        const { name, value } = event.target;

        setPasswords((current) => ({
            ...current,
            [name]: value,
        }));
    };

    const changePassword = async (event) => {
        event.preventDefault();

        if (passwords.new_password !== passwords.new_password_confirmation) {
            setStatus('error');
            setMessage('Новый пароль и подтверждение не совпадают');
            return;
        }

        setStatus('saving');
        setMessage('');

        try {
            const result = await apiRequest(API.accountSecurity, {
                method: 'POST',
                body: {
                    action: 'change_password',
                    ...passwords,
                },
            });

            setPasswords(EMPTY_PASSWORDS);
            setActiveSessions(result.active_sessions);
            setStatus('success');
            setMessage(result.message);
        } catch (error) {
            setStatus('error');
            setMessage(error.message);
        }
    };

    const closeOtherSessions = async () => {
        setStatus('saving');
        setMessage('');

        try {
            const result = await apiRequest(API.accountSecurity, {
                method: 'POST',
                body: { action: 'logout_other_sessions' },
            });

            setActiveSessions(result.active_sessions);
            setStatus('success');
            setMessage(result.message);
        } catch (error) {
            setStatus('error');
            setMessage(error.message);
        }
    };

    const isSaving = status === 'saving';

    return (
        <section className="settings-panel">
            <header className="settings-panel__header">
                <span>Настройки</span>
                <h3>Безопасность</h3>
            </header>

            <section className="settings-card">
                <div>
                    <h4>Активные сеансы</h4>
                    <p>
                        {activeSessions === null
                            ? 'Загружаем данные...'
                            : `${activeSessions} ${activeSessions === 1 ? 'сеанс' : 'сеанса'}`}
                    </p>
                </div>

                <button
                    type="button"
                    className="settings-panel__secondary"
                    disabled={isSaving || activeSessions === null || activeSessions <= 1}
                    onClick={closeOtherSessions}
                >
                    Завершить остальные
                </button>
            </section>

            <form className="settings-form" onSubmit={changePassword}>
                <h4>Изменить пароль</h4>

                <div className="settings-panel__fields">
                    <PasswordField
                        label="Текущий пароль"
                        name="current_password"
                        value={passwords.current_password}
                        onChange={updatePassword}
                        required
                        disabled={isSaving}
                    />

                    <PasswordField
                        label="Новый пароль"
                        name="new_password"
                        value={passwords.new_password}
                        onChange={updatePassword}
                        placeholder="Не менее 8 символов"
                        autoComplete="new-password"
                        required
                        disabled={isSaving}
                    />

                    <PasswordField
                        label="Повторите новый пароль"
                        name="new_password_confirmation"
                        value={passwords.new_password_confirmation}
                        onChange={updatePassword}
                        placeholder="Повторите новый пароль"
                        autoComplete="new-password"
                        required
                        disabled={isSaving}
                    />
                </div>

                <SettingsMessage
                    type={status === 'error' ? 'error' : 'success'}
                >
                    {message}
                </SettingsMessage>

                <div className="settings-panel__actions">
                    <button
                        type="submit"
                        className="settings-panel__save"
                        disabled={isSaving}
                    >
                        {isSaving ? 'Сохраняем...' : 'Изменить пароль'}
                    </button>
                </div>
            </form>
        </section>
    );
}
