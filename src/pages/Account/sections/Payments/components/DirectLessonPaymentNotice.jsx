function formatRubles(value) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        maximumFractionDigits: 0,
    }).format(Number(value) || 0);
}

export function DirectLessonPaymentNotice({
    notice,
    subscription = null,
}) {
    return (
        <section className="direct-lesson-payment-notice">
            <div>
                <span>Расчёты за занятия</span>
                <h3>Оплата напрямую преподавателю</h3>
                <p>
                    {notice || 'GoStudy не принимает оплату за уроки и не удерживает комиссию с занятий.'}
                </p>
            </div>

            {subscription && (
                <aside>
                    <span>Подписка GoStudy</span>
                    <strong>
                        {formatRubles(subscription.price_rubles)}
                        {' '}/ {subscription.period_days} дней
                    </strong>
                    <p>
                        Включено до {subscription.students_included} учеников.
                        {' '}Следующие {subscription.extra_block_students} —
                        {' '}+{formatRubles(subscription.extra_block_price_rubles)}.
                    </p>
                </aside>
            )}
        </section>
    );
}
