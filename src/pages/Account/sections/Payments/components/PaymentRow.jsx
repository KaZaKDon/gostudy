import {
    formatMoney,
    getPaymentStatusLabel,
} from '../utils.js';

export function PaymentRow({
    role,
    payment,
    onOpenPayment,
}) {
    const isTeacher = role === 'teacher';

    return (
        <button
            type="button"
            className="payment-row"
            onClick={() => onOpenPayment(payment)}
        >
            <span className="payment-row__title">
                {isTeacher ? payment.studentName : payment.title}
            </span>

            <span className="payment-row__subtitle">
                {isTeacher ? payment.subject : payment.teacher}
            </span>

            <span className="payment-row__meta">
                {isTeacher
                    ? `${payment.lessonsCount} уроков`
                    : payment.date}
            </span>

            <span className="payment-row__amount">
                {formatMoney(payment.amount)}
            </span>

            <span className={`payment-row__status payment-row__status--${payment.status}`}>
                {getPaymentStatusLabel(payment.status)}
            </span>
        </button>
    );
}