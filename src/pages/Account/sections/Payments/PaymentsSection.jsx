import { useState } from 'react';

import { API_FEATURES } from '../../../../api/api.js';
import { DirectLessonPaymentNotice } from './components/DirectLessonPaymentNotice.jsx';
import { PaymentSummary } from './components/PaymentSummary.jsx';
import { StudentPayments } from './components/StudentPayments.jsx';
import { PaymentModal } from './components/PaymentModal.jsx';
import { TeacherFinanceDashboard } from './components/TeacherFinanceDashboard.jsx';
import { useTeacherFinance } from './useTeacherFinance.js';

import './PaymentsSection.css';

export function PaymentsSection({
    role,
    payments,
}) {
    const [selectedPayment, setSelectedPayment] = useState(null);

    const isTeacher = role === 'teacher';
    const teacherFinance = useTeacherFinance(isTeacher);

    return (
        <section className="payments-section">
            <header className="payments-section__header">
                <div>
                    <span>Финансовый учёт</span>

                    <h2>
                        {isTeacher
                            ? 'Подписка и расчёты'
                            : 'Мои оплаты'}
                    </h2>
                </div>
            </header>

            {isTeacher ? (
                <TeacherFinanceDashboard controller={teacherFinance} />
            ) : !API_FEATURES.lessonSettlements ? (
                <DirectLessonPaymentNotice />
            ) : (
                <>
                    <PaymentSummary
                        role={role}
                        summary={payments.summary}
                    />
                    <StudentPayments
                        payments={payments.payments}
                        onOpenPayment={setSelectedPayment}
                    />
                </>
            )}

            {!isTeacher && API_FEATURES.lessonSettlements && (
                <PaymentModal
                    role={role}
                    payment={selectedPayment}
                    onClose={() => setSelectedPayment(null)}
                />
            )}
        </section>
    );
}
