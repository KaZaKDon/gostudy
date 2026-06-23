import {
    formatMoney,
    getPaymentStatusLabel,
} from '../utils.js';

export function PaymentModal({
    role,
    payment,
    onClose,
}) {
    if (!payment) return null;

    const isTeacher = role === 'teacher';

    return (
        <div className="payment-modal">
            <button
                type="button"
                className="payment-modal__overlay"
                aria-label="Закрыть оплату"
                onClick={onClose}
            />

            <section
                className="payment-modal__panel"
                role="dialog"
                aria-modal="true"
            >
                <header className="payment-modal__header">
                    <div>
                        <span>
                            {isTeacher
                                ? 'История оплаты'
                                : 'Оплата'}
                        </span>

                        <h2>
                            {isTeacher
                                ? payment.studentName
                                : payment.title}
                        </h2>

                        <p>
                            {isTeacher
                                ? payment.subject
                                : payment.teacher}
                        </p>
                    </div>

                    <button
                        type="button"
                        className="payment-modal__close"
                        aria-label="Закрыть"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </header>

                {isTeacher ? (
                    <div className="payment-modal__content">
                        <section>
                            <h3>История</h3>

                            <div className="payment-history">
                                {payment.history.map((item) => (
                                    <div
                                        key={item.id}
                                        className="payment-history__row"
                                    >
                                        <span>{item.date}</span>
                                        <strong>{item.title}</strong>
                                        <span>{formatMoney(item.amount)}</span>
                                        <em>
                                            {getPaymentStatusLabel(item.status)}
                                        </em>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                ) : (
                    <div className="payment-modal__content">
                        <section>
                            <h3>Детали</h3>

                            <div className="payment-details">
                                <span>Дата: {payment.date}</span>
                                <span>Сумма: {formatMoney(payment.amount)}</span>
                                <span>
                                    Статус:{' '}
                                    {getPaymentStatusLabel(payment.status)}
                                </span>
                            </div>
                        </section>
                    </div>
                )}

                <footer className="payment-modal__actions">
                    {!isTeacher && payment.status === 'pending' && (
                        <button
                            type="button"
                            className="payment-modal__primary"
                        >
                            {payment.type === 'material'
                                ? 'Купить'
                                : 'Оплатить'}
                        </button>
                    )}

                    <button type="button" onClick={onClose}>
                        Закрыть
                    </button>
                </footer>
            </section>
        </div>
    );
}