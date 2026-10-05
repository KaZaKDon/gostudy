import {
    useEffect,
    useState,
} from 'react';

import { API } from '../../../../../api/api.js';
import { apiRequest } from '../../../../../api/apiRequest.js';

import { useNotificationCapabilities } from '../hooks/useNotificationCapabilities.js';
import { NotificationRetentionStatus } from './NotificationRetentionStatus.jsx';
import { SettingsMessage } from './SettingsMessage.jsx';

export function StudentNotificationSettings({
    onEditContacts,
}) {
    const {
        capabilities,
        status: capabilitiesStatus,
    } = useNotificationCapabilities();
    const [settings, setSettings] = useState(null);
    const [status, setStatus] = useState('loading');
    const [message, setMessage] = useState('');
    const emailCapability = capabilities?.parent_email;
    const emailDeliveryAvailable = Boolean(
        emailCapability?.delivery_available,
    );
    const canSaveParentPreference = Boolean(
        settings?.parent_email
        && capabilitiesStatus === 'success'
        && emailCapability?.preference_storage_available,
    );

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
                            {capabilitiesStatus === 'loading' ? (
                                <p>Проверяем доступность email-доставки...</p>
                            ) : capabilitiesStatus !== 'success' ? (
                                <p>
                                    Доступность email-доставки не подтверждена.
                                    Письма не считаются включёнными.
                                </p>
                            ) : emailDeliveryAvailable ? (
                                <p>
                                    Родитель получает письма об учебных
                                    событиях согласно сохранённой настройке.
                                </p>
                            ) : (
                                <p>
                                    Отправка учебных событий по email пока не
                                    подключена. Настройку можно сохранить
                                    заранее для будущего запуска.
                                </p>
                            )}
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
                                    || !canSaveParentPreference
                                }
                                onChange={(event) => setSettings((current) => ({
                                    ...current,
                                    parent_notifications_enabled:
                                        event.target.checked,
                                }))}
                            />
                            <span>
                                {emailDeliveryAvailable
                                    ? settings.parent_notifications_enabled
                                        ? 'Включены'
                                        : 'Выключены'
                                    : settings.parent_notifications_enabled
                                        ? 'Настройка сохранена'
                                        : 'Не выбрано'}
                            </span>
                        </label>
                    </div>

                    {!settings.parent_email && (
                        <p className="settings-panel__note">
                            Чтобы сохранить настройку будущей email-доставки,
                            сначала укажите email родителя в анкете ученика.
                        </p>
                    )}

                    <NotificationRetentionStatus
                        capabilities={capabilities}
                        status={capabilitiesStatus}
                    />

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
                            disabled={
                                status === 'saving'
                                || !canSaveParentPreference
                            }
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
