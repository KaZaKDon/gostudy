import { useState } from 'react';
import { Button, Input, Select } from '../../components/ui/index.js';
import { DEFAULT_SUBSCRIPTION_FILTERS } from '../../hooks/useAdminSubscriptions.js';

const options = (items) => items.map(([value, label]) => ({ value, label }));
const modes = options([['live', 'Реальные'], ['test', 'Тестовые'], ['all', 'Все режимы']]);
const payments = options([['', 'Все оплаты'], ['paid', 'Оплачен'], ['pending', 'Ожидает оплаты']]);
const periods = options([['', 'Все периоды'], ['active', 'Действует'], ['scheduled', 'Начнётся позже'], ['expired', 'Завершён'], ['missing', 'Нет периода']]);
const receipts = options([['', 'Все итоговые чеки'], ['scheduled', 'Запланирован'], ['submitted', 'Обрабатывается'], ['registered', 'Зарегистрирован'], ['review', 'Требует проверки'], ['held', 'Приостановлен'], ['missing', 'Нет задания']]);

export function SubscriptionsToolbar({ onApply, onRefresh, busy }) {
    const [filters, setFilters] = useState({ ...DEFAULT_SUBSCRIPTION_FILTERS });
    const [error, setError] = useState('');
    function change(event) {
        setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
        setError('');
    }
    function apply(event) {
        event.preventDefault();
        if (filters.paid_from && filters.paid_to && filters.paid_from > filters.paid_to) {
            setError('Начало диапазона позже окончания');
            return;
        }
        onApply(filters);
    }
    function reset() {
        setFilters({ ...DEFAULT_SUBSCRIPTION_FILTERS });
        setError('');
        onApply(DEFAULT_SUBSCRIPTION_FILTERS);
    }
    return <form className="subscriptions-filters" onSubmit={apply}>
        <div className="subscriptions-filters__fields">
            <Input label="Поиск" type="search" name="q" value={filters.q} onChange={change}
                maxLength={255} placeholder="ФИО, email, ID преподавателя или заказа" />
            <Select label="Режим" name="mode" value={filters.mode} options={modes} onChange={change} />
            <Select label="Оплата" name="payment_status" value={filters.payment_status} options={payments} onChange={change} />
            <Select label="Период доступа" name="period_status" value={filters.period_status} options={periods} onChange={change} />
            <Select label="Итоговый чек" name="receipt_state" value={filters.receipt_state} options={receipts} onChange={change} />
            <Input label="Оплачено с (МСК)" type="date" name="paid_from" value={filters.paid_from} onChange={change} />
            <Input label="Оплачено по (МСК)" type="date" name="paid_to" value={filters.paid_to} onChange={change} />
        </div>
        {error && <p className="admin-alert" role="alert">{error}</p>}
        <div className="subscriptions-filters__actions">
            <Button type="submit" variant="primary" disabled={busy}>Применить</Button>
            <Button onClick={reset} disabled={busy}>Сбросить</Button>
            <Button onClick={onRefresh} disabled={busy}>Обновить данные</Button>
        </div>
    </form>;
}
