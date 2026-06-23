import { PaymentRow } from './PaymentRow.jsx';

export function StudentPayments({
    payments,
    onOpenPayment,
}) {
    return (
        <div className="payments-list">
            {payments.map((payment) => (
                <PaymentRow
                    key={payment.id}
                    role="student"
                    payment={payment}
                    onOpenPayment={onOpenPayment}
                />
            ))}
        </div>
    );
}