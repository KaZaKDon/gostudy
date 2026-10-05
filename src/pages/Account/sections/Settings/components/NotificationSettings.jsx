import { useNotificationCapabilities } from '../hooks/useNotificationCapabilities.js';
import { NotificationRetentionStatus } from './NotificationRetentionStatus.jsx';

export function NotificationSettings({ role }) {
    const { capabilities, status } = useNotificationCapabilities();

    return (
        <section className="settings-panel">
            <header className="settings-panel__header">
                <span>Настройки</span>
                <h3>Уведомления</h3>
            </header>

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

            <NotificationRetentionStatus
                capabilities={capabilities}
                status={status}
            />

            {role === 'teacher' && (
                <p className="settings-panel__note">
                    Email-рассылки преподавателю пока не подключены,
                    поэтому на экране нет переключателя, который ничего
                    не меняет.
                </p>
            )}
        </section>
    );
}
