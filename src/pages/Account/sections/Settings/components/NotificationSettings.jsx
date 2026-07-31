export function NotificationSettings({ role }) {
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

            <section className="settings-card">
                <div>
                    <h4>Хранение уведомлений</h4>
                    <p>
                        Прочитанные уведомления удаляются через 30 дней,
                        непрочитанные — через 180 дней. Каждое уведомление
                        можно удалить отдельно в меню колокольчика.
                    </p>
                </div>
            </section>

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
