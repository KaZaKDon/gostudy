import { formatMoney } from '../utils.js';

export function TeacherFinanceSummary({ summary }) {
    const items = [
        {
            label: 'Проведено уроков',
            value: summary.completed_lessons,
        },
        {
            label: 'Стоимость уроков',
            value: formatMoney(summary.gross_amount),
        },
        {
            label: 'Начислено преподавателю',
            value: formatMoney(summary.teacher_amount),
        },
        {
            label: 'Комиссия GoStudy',
            value: formatMoney(summary.commission_amount),
        },
        {
            label: 'Готово к выплате',
            value: formatMoney(summary.ready_for_payout_amount),
        },
        {
            label: 'Оплата просрочена',
            value: formatMoney(summary.overdue_amount),
            tone: summary.overdue_amount > 0 ? 'danger' : '',
        },
    ];

    return (
        <div className="payments-summary payments-summary--teacher">
            {items.map((item) => (
                <article
                    key={item.label}
                    className={`payments-summary__item ${item.tone ? `payments-summary__item--${item.tone}` : ''}`}
                >
                    <strong>{item.value}</strong>
                    <span>{item.label}</span>
                </article>
            ))}
        </div>
    );
}
