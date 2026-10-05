export function TeacherFinanceFilters({ controller }) {
    return (
        <div className="teacher-finance-filters">
            <label>
                <span>Период</span>
                <select
                    value={controller.period}
                    onChange={(event) => controller.setPeriod(event.target.value)}
                >
                    <option value="current_month">Текущий месяц</option>
                    <option value="previous_month">Прошлый месяц</option>
                    <option value="90_days">Последние 90 дней</option>
                    <option value="all">Всё время</option>
                </select>
            </label>

            <label>
                <span>Состояние</span>
                <select
                    value={controller.status}
                    onChange={(event) => controller.setStatus(event.target.value)}
                >
                    <option value="">Все уроки</option>
                    <option value="awaiting_payment">Ожидают оплаты</option>
                    <option value="overdue">Оплата просрочена</option>
                    <option value="pay_later">Оплатят позже</option>
                    <option value="paid">Оплачено</option>
                    <option value="ready_for_payout">Готово к выплате</option>
                    <option value="payout_paid">Выплачено</option>
                    <option value="disputed">Спорные</option>
                    <option value="waived">Без начисления</option>
                    <option value="refunded">Возвращено</option>
                </select>
            </label>
        </div>
    );
}
