import { PaymentRow } from './PaymentRow.jsx';

export function TeacherPayments({
    payments,
    onOpenPayment,
}) {
    return (
        <div className="payments-list">
            {payments.map((payment) => (
                <PaymentRow
                    key={payment.id}
                    role="teacher"
                    payment={payment}
                    onOpenPayment={onOpenPayment}
                />
            ))}
        </div>
    );
}