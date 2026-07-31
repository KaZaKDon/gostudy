import {
    useEffect,
    useState,
} from 'react';

import { API } from '../../../../../api/api.js';
import { apiRequest } from '../../../../../api/apiRequest.js';

import { SettingsMessage } from './SettingsMessage.jsx';

export function ParentNotificationSettings({
    onEditContacts,
}) {
    const [settings, setSettings] = useState(null);
    const [status, setStatus] = useState('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const controller = new AbortController();

        apiRequest(API.studentNotificationSettings, {
            signal: controller.signal,
        }).then((result) => {
            setSettings(result.settings);
            setStatus('success');
        }).catch((error) => {
            if (error.name !== 'AbortError') {
                setMessage(error.message);
                setStatus('error');
            }
        });

        return () => controller.abort();
    }, []);

    const save = async () => {
        setStatus('saving');
        setMessage('');

        try {
            const result = await apiRequest(API.studentNotificationSettings, {
                method: 'POST',
                body: {
                    parent_notifications_enabled:
                        settings.parent_notifications_enabled,
                },
            });
            setSettings(result.settings);
            setMessage(result.message);
            setStatus('success');
        } catch (error) {
            setMessage(error.message);
            setStatus('error');
        }
    };

    return (
        <section className="settings-panel">
            <header className="settings-panel__header">
                <span>Уведомления</span>
                <h3>Настройки уведомлений</h3>
            </header>

            {status === 'loading' ? (
                <p>Загружаем настройки...</p>
            ) : settings ? (
                <>
                    <section className="settings-card">
                        <div>
                            <h4>События в кабинете</h4>
                            <p>
                                Включены уведомления об уроках, сообщениях,
                                домашних заданиях и результатах проверки.
                            </p>
                        </div>

                        <strong className="settings-status settings-status--success">
                            Включены
                        </strong>
                    </section>

                    <div className="settings-parent-notifications">
                        <div>
                            <h4>Письма родителю</h4>
                            <p>
                                Родитель получит письмо при выдаче задания,
                                напоминание перед сроком и результат проверки.
                            </p>
                            <small>
                                Email: {settings.parent_email || 'не указан'}
                            </small>
                        </div>

                        <label className="settings-switch">
                            <input
                                type="checkbox"
                                checked={settings.parent_notifications_enabled}
                                disabled={
                                    status === 'saving'
                                    || !settings.parent_email
                                }
                                onChange={(event) => setSettings((current) => ({
                                    ...current,
                                    parent_notifications_enabled:
                                        event.target.checked,
                                }))}
                            />
                            <span>{settings.parent_notifications_enabled ? 'Включены' : 'Выключены'}</span>
                        </label>
                    </div>

                    {!settings.parent_email && (
                        <p className="settings-panel__note">
                            Чтобы включить письма, сначала укажите email
                            родителя в анкете ученика.
                        </p>
                    )}

                    <section className="settings-card">
                        <div>
                            <h4>Хранение уведомлений</h4>
                            <p>
                                Прочитанные уведомления удаляются через
                                30 дней, непрочитанные — через 180 дней.
                            </p>
                        </div>
                    </section>

                    <SettingsMessage
                        type={status === 'error' ? 'error' : 'success'}
                    >
                        {message}
                    </SettingsMessage>

                    <div className="settings-panel__actions">
                        {!settings.parent_email && (
                            <button
                                type="button"
                                className="settings-panel__secondary"
                                onClick={onEditContacts}
                            >
                                Указать email родителя
                            </button>
                        )}

                        <button
                            type="button"
                            className="settings-panel__save"
                            disabled={status === 'saving' || !settings.parent_email}
                            onClick={save}
                        >
                            {status === 'saving' ? 'Сохраняем...' : 'Сохранить'}
                        </button>
                    </div>
                </>
            ) : (
                <SettingsMessage type="error">
                    {message || 'Не удалось загрузить настройки'}
                </SettingsMessage>
            )}
        </section>
    );
}
