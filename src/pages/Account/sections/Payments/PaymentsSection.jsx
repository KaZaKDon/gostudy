import { useState } from 'react';

import { PaymentSummary } from './components/PaymentSummary.jsx';
import { TeacherPayments } from './components/TeacherPayments.jsx';
import { StudentPayments } from './components/StudentPayments.jsx';
import { PaymentModal } from './components/PaymentModal.jsx';

import './PaymentsSection.css';

export function PaymentsSection({
    role,
    payments,
}) {
    const [selectedPayment, setSelectedPayment] = useState(null);

    const isTeacher = role === 'teacher';

    return (
        <section className="payments-section">
            <header className="payments-section__header">
                <div>
                    <span>Оплаты</span>

                    <h2>
                        {isTeacher
                            ? 'Финансы преподавателя'
                            : 'Мои оплаты'}
                    </h2>
                </div>
            </header>

            <PaymentSummary
                role={role}
                summary={payments.summary}
            />

            {isTeacher ? (
                <TeacherPayments
                    payments={payments.payments}
                    onOpenPayment={setSelectedPayment}
                />
            ) : (
                <StudentPayments
                    payments={payments.payments}
                    onOpenPayment={setSelectedPayment}
                />
            )}

            <PaymentModal
                role={role}
                payment={selectedPayment}
                onClose={() => setSelectedPayment(null)}
            />
        </section>
    );
}