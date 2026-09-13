import {
    useEffect,
    useState,
} from 'react';

import { API } from '../../../../../api/api.js';
import { apiRequest } from '../../../../../api/apiRequest.js';

import { SettingsMessage } from './SettingsMessage.jsx';

const CATEGORIES = [
    {
        field: 'homework_enabled',
        label: 'Домашние задания',
        description: 'Выдача, проверка и отмена задания.',
    },
    {
        field: 'diary_enabled',
        label: 'Дневник',
        description: 'Новая или обновлённая запись об уроке.',
    },
    {
        field: 'schedule_enabled',
        label: 'Расписание',
        description: 'Подтверждённый перенос или отмена занятия.',
    },
    {
        field: 'messages_enabled',
        label: 'Сообщения',
        description: 'Новое сообщение преподавателя в чатах ребёнка и родителя.',
    },
];

export function ParentChildNotificationSettings() {
    const [settings, setSettings] = useState([]);
    const [status, setStatus] = useState('loading');
    const [savingStudentId, setSavingStudentId] = useState(null);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const controller = new AbortController();

        apiRequest(API.parentNotificationSettings, {
            signal: controller.signal,
        }).then((result) => {
            setSettings(result.settings || []);
            setStatus('success');
        }).catch((error) => {
            if (error.name !== 'AbortError') {
                setMessage(error.message);
                setStatus('error');
            }
        });

        return () => controller.abort();
    }, []);

    const toggle = async (studentId, field, enabled) => {
        const current = settings.find(
            (setting) => setting.student_id === studentId,
        );

        if (!current || savingStudentId !== null) {
            return;
        }

        const updated = { ...current, [field]: enabled };
        setSettings((items) => items.map((item) => (
            item.student_id === studentId ? updated : item
        )));
        setSavingStudentId(studentId);
        setMessage('');

        try {
            const result = await apiRequest(API.parentNotificationSettings, {
                method: 'POST',
                body: {
                    student_id: studentId,
                    homework_enabled: updated.homework_enabled,
                    diary_enabled: updated.diary_enabled,
                    schedule_enabled: updated.schedule_enabled,
                    messages_enabled: updated.messages_enabled,
                },
            });

            setSettings((items) => items.map((item) => (
                item.student_id === studentId ? result.setting : item
            )));
            setMessage(result.message);
            setStatus('success');
        } catch (error) {
            setSettings((items) => items.map((item) => (
                item.student_id === studentId ? current : item
            )));
            setMessage(error.message);
            setStatus('error');
        } finally {
            setSavingStudentId(null);
        }
    };

    return (
        <section className="settings-panel">
            <header className="settings-panel__header">
                <span>Уведомления</span>
                <h3>События детей</h3>
                <p className="settings-panel__note">
                    Выберите, какие события показывать в колокольчике отдельно
                    для каждого ребёнка. Доступ к разделам при этом сохраняется.
                </p>
            </header>

            {status === 'loading' ? (
                <p>Загружаем настройки...</p>
            ) : settings.length ? (
                <div className="settings-child-notifications">
                    {settings.map((setting) => (
                        <section
                            className="settings-child-notifications__card"
                            key={setting.student_id}
                        >
                            <div className="settings-child-notifications__heading">
                                <div>
                                    <span>Ребёнок</span>
                                    <h4>{setting.full_name}</h4>
                                </div>

                                {savingStudentId === setting.student_id && (
                                    <small>Сохраняем...</small>
                                )}
                            </div>

                            <div className="settings-child-notifications__list">
                                {CATEGORIES.map((category) => (
                                    <label
                                        className="settings-child-notifications__item"
                                        key={category.field}
                                    >
                                        <span>
                                            <strong>{category.label}</strong>
                                            <small>{category.description}</small>
                                        </span>

                                        <span className="settings-switch">
                                            <input
                                                type="checkbox"
                                                checked={setting[category.field]}
                                                disabled={savingStudentId !== null}
                                                onChange={(event) => toggle(
                                                    setting.student_id,
                                                    category.field,
                                                    event.target.checked,
                                                )}
                                            />
                                            <span>
                                                {setting[category.field]
                                                    ? 'Включены'
                                                    : 'Выключены'}
                                            </span>
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            ) : status === 'error' ? (
                <SettingsMessage type="error">
                    {message || 'Не удалось загрузить настройки'}
                </SettingsMessage>
            ) : (
                <section className="settings-card">
                    <div>
                        <h4>Нет подключённых детей</h4>
                        <p>
                            Настройки появятся после подтверждения и привязки
                            аккаунта ребёнка.
                        </p>
                    </div>
                </section>
            )}

            {settings.length > 0 && message && (
                <SettingsMessage
                    type={status === 'error' ? 'error' : 'success'}
                >
                    {message}
                </SettingsMessage>
            )}
        </section>
    );
}
