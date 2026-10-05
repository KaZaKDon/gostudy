export function NotificationRetentionStatus({
    capabilities,
    status,
}) {
    const retention = capabilities?.retention;

    if (status === 'loading') {
        return (
            <section className="settings-card">
                <div>
                    <h4>Хранение уведомлений</h4>
                    <p>Проверяем режим хранения...</p>
                </div>

                <strong className="settings-status">Проверка</strong>
            </section>
        );
    }

    if (status !== 'success' || !retention) {
        return (
            <section className="settings-card">
                <div>
                    <h4>Хранение уведомлений</h4>
                    <p>
                        Статус автоматической очистки не удалось проверить.
                        Уведомления можно удалять вручную через колокольчик.
                    </p>
                </div>

                <strong className="settings-status">Вручную</strong>
            </section>
        );
    }

    if (!retention.automatic_cleanup_available) {
        return (
            <section className="settings-card">
                <div>
                    <h4>Хранение уведомлений</h4>
                    <p>
                        Автоматическая очистка по сроку пока не подключена.
                        Уведомления можно удалять по одному или очистить ленту
                        вручную через колокольчик.
                    </p>
                </div>

                <strong className="settings-status">Вручную</strong>
            </section>
        );
    }

    return (
        <section className="settings-card">
            <div>
                <h4>Хранение уведомлений</h4>
                <p>
                    Прочитанные уведомления удаляются через
                    {' '}{retention.read_after_days} дней, непрочитанные — через
                    {' '}{retention.unread_after_days} дней.
                </p>
            </div>

            <strong className="settings-status settings-status--success">
                Автоматически
            </strong>
        </section>
    );
}
