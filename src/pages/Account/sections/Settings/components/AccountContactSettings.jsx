import { useState } from 'react';

import { API } from '../../../../../api/api.js';
import { apiRequest } from '../../../../../api/apiRequest.js';

import { SettingsField } from './SettingsField.jsx';
import { SettingsMessage } from './SettingsMessage.jsx';

export function AccountContactSettings({ user }) {
    const [phone, setPhone] = useState(user?.phone || '');
    const [status, setStatus] = useState('idle');
    const [message, setMessage] = useState('');

    const save = async (event) => {
        event.preventDefault();
        setStatus('saving');
        setMessage('');

        try {
            const result = await apiRequest(API.updateAccount, {
                method: 'POST',
                body: { phone },
            });

            setPhone(result.user.phone || '');
            setStatus('success');
            setMessage(result.message);
        } catch (error) {
            setStatus('error');
            setMessage(error.message);
        }
    };

    return (
        <section className="settings-panel">
            <header className="settings-panel__header">
                <span>Настройки</span>
                <h3>Контакты</h3>
            </header>

            <form className="settings-form" onSubmit={save}>
                <div className="settings-panel__fields">
                    <SettingsField
                        label="Email"
                        value={user?.email || 'Не указан'}
                        hint="Для смены email потребуется отдельное подтверждение адреса."
                    />

                    <label className="settings-field">
                        <span className="settings-field__label">
                            Телефон
                        </span>

                        <input
                            type="tel"
                            value={phone}
                            maxLength={50}
                            autoComplete="tel"
                            placeholder="+7 900 000-00-00"
                            disabled={status === 'saving'}
                            onChange={(event) => setPhone(event.target.value)}
                        />
                    </label>
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
                        disabled={status === 'saving'}
                    >
                        {status === 'saving' ? 'Сохраняем...' : 'Сохранить телефон'}
                    </button>
                </div>
            </form>
        </section>
    );
}
