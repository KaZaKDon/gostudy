import { formatMoney } from '../utils.js';

export function PaymentSummary({
    role,
    summary,
}) {
    const items =
        role === 'teacher'
            ? [
                {
                    label: 'Получено',
                    value: formatMoney(summary.received),
                },
                {
                    label: 'Ожидает подтверждения',
                    value: formatMoney(summary.pendingConfirmation),
                },
                {
                    label: 'Ожидает выплаты',
                    value: formatMoney(summary.awaitingPayout),
                },
                {
                    label: 'Не оплачено',
                    value: formatMoney(summary.unpaid),
                },
            ]
            : [
                {
                    label: 'К оплате',
                    value: formatMoney(summary.toPay),
                },
                {
                    label: 'Оплачено',
                    value: formatMoney(summary.paid),
                },
                {
                    label: 'Покупки материалов',
                    value: summary.materials,
                },
            ];

    return (
        <div className="payments-summary">
            {items.map((item) => (
                <article
                    key={item.label}
                    className="payments-summary__item"
                >
                    <strong>{item.value}</strong>
                    <span>{item.label}</span>
                </article>
            ))}
        </div>
    );
}