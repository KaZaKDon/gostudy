import { useState } from 'react';

import { DirectLessonPaymentNotice } from './DirectLessonPaymentNotice.jsx';
import { TeacherFinanceFilters } from './TeacherFinanceFilters.jsx';
import { TeacherFinanceList } from './TeacherFinanceList.jsx';
import { TeacherFinanceModal } from './TeacherFinanceModal.jsx';
import { TeacherFinanceSummary } from './TeacherFinanceSummary.jsx';

export function TeacherFinanceDashboard({ controller }) {
    const [selectedItem, setSelectedItem] = useState(null);
    const { data } = controller;

    if (controller.isLoading && data.enabled === null) {
        return (
            <p className="teacher-finance-message">
                Загружаем условия подписки…
            </p>
        );
    }

    if (data.enabled === false) {
        return (
            <DirectLessonPaymentNotice
                notice={data.notice}
                subscription={data.subscription}
            />
        );
    }

    return (
        <>
            {data.tariff && (
                <aside className="teacher-finance-terms">
                    <div>
                        <span>Текущие условия</span>
                        <strong>{data.tariff.commission_percent}% комиссия</strong>
                    </div>
                    <p>
                        Оплата урока ожидается в течение {data.tariff.payment_deadline_hours} часов.
                        Выплаты: {data.tariff.payout_frequency.toLowerCase()}.
                    </p>
                </aside>
            )}

            <TeacherFinanceSummary summary={data.summary} />
            <TeacherFinanceFilters controller={controller} />

            {controller.error && (
                <p className="teacher-finance-message teacher-finance-message--error">
                    {controller.error}
                </p>
            )}

            <TeacherFinanceList controller={controller} onOpen={setSelectedItem} />

            <section className="teacher-finance-payouts">
                <h3>История выплат</h3>
                {data.payouts.length ? null : <p>{data.payouts_notice}</p>}
            </section>

            <TeacherFinanceModal item={selectedItem} onClose={() => setSelectedItem(null)} />
        </>
    );
}
