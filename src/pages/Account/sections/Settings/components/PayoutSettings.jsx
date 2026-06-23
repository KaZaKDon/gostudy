export function PayoutSettings({ section }) {
    return (
        <div className="settings-payouts">
            <section className="settings-payouts__block">
                <h4>Способ выплат</h4>

                <div className="settings-payouts__methods">
                    {section.methods.map((method) => (
                        <span
                            key={method}
                            className={
                                section.payoutMethod === method
                                    ? 'settings-payouts__method settings-payouts__method--active'
                                    : 'settings-payouts__method'
                            }
                        >
                            {section.payoutMethod === method ? '●' : '○'}{' '}
                            {method}
                        </span>
                    ))}
                </div>

                <div className="settings-payouts__actions">
                    <button type="button">
                        Изменить реквизиты
                    </button>
                </div>
            </section>

            <section className="settings-payouts__block">
                <h4>Статус проверки</h4>

                <p className="settings-payouts__status">
                    🟡 {section.verificationStatus}
                </p>
            </section>

            <section className="settings-payouts__block">
                <h4>Последняя выплата</h4>

                <p>
                    {section.lastPayout.date} · {section.lastPayout.amount}
                </p>
            </section>

            <section className="settings-payouts__block">
                <h4>История выплат</h4>

                <div className="settings-payouts__history">
                    {section.payoutsHistory.map((item) => (
                        <div
                            key={item.id}
                            className="settings-payouts__history-row"
                        >
                            <span>{item.date}</span>
                            <strong>{item.amount}</strong>
                            <em>{item.status}</em>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}