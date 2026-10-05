import {
    formatMoney,
    getPaymentStatusLabel,
    getTeacherFinanceDisplayAmounts,
    getTeacherFinanceNoAccrualReason,
} from '../utils.js';

function formatDate(value) {
    if (!value) return '—';
    return new Intl.DateTimeFormat('ru-RU', {
        dateStyle: 'long',
        timeStyle: 'short',
    }).format(new Date(value));
}

export function TeacherFinanceModal({ item, onClose }) {
    if (!item) return null;

    const amounts = getTeacherFinanceDisplayAmounts(item);
    const noAccrualReason = getTeacherFinanceNoAccrualReason(item.status);

    return (
        <div className="payment-modal">
            <button
                type="button"
                className="payment-modal__overlay"
                aria-label="Закрыть расчёт"
                onClick={onClose}
            />
            <section className="payment-modal__panel" role="dialog" aria-modal="true">
                <header className="payment-modal__header">
                    <div>
                        <span>Расчёт по уроку</span>
                        <h2>{item.student_name}</h2>
                        <p>{item.subject_name} · {formatDate(item.lesson_date)}</p>
                    </div>
                    <button type="button" className="payment-modal__close" aria-label="Закрыть" onClick={onClose}>×</button>
                </header>

                <div className="payment-modal__content teacher-finance-detail">
                    <section>
                        <h3>Урок</h3>
                        <dl>
                            <div><dt>Тема</dt><dd>{item.title}</dd></div>
                            <div><dt>Продолжительность</dt><dd>{item.duration_minutes} минут</dd></div>
                            <div><dt>Состояние</dt><dd>{getPaymentStatusLabel(item.status)}</dd></div>
                            <div><dt>Срок оплаты</dt><dd>{formatDate(item.payment_due_at)}</dd></div>
                        </dl>
                    </section>

                    <section>
                        <h3>Расчёт</h3>
                        <dl>
                            <div><dt>Стоимость урока</dt><dd>{formatMoney(item.gross_amount)}</dd></div>
                            <div>
                                <dt>Комиссия GoStudy ({item.commission_percent}%)</dt>
                                <dd>{amounts.hasNoAccrual ? '' : '−'}{formatMoney(amounts.commissionAmount)}</dd>
                            </div>
                            <div className="teacher-finance-detail__total"><dt>Преподавателю</dt><dd>{formatMoney(amounts.teacherAmount)}</dd></div>
                            <div><dt>Версия тарифа</dt><dd>{item.tariff_version ? `№${item.tariff_version}` : 'Не зафиксирована'}</dd></div>
                        </dl>
                    </section>

                    {noAccrualReason && (
                        <section className="teacher-finance-detail__notice">
                            <h3>Почему нет начисления</h3>
                            <p>{noAccrualReason}</p>
                        </section>
                    )}

                    {item.payment_comment && (
                        <section>
                            <h3>Комментарий по оплате</h3>
                            <p>{item.payment_comment}</p>
                        </section>
                    )}
                </div>

                <footer className="payment-modal__actions">
                    <button type="button" onClick={onClose}>Закрыть</button>
                </footer>
            </section>
        </div>
    );
}
