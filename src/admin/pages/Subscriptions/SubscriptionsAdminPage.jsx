import { useAdminAuth } from '../../auth/useAdminAuth.js';
import { Loader, Pagination } from '../../components/ui/index.js';
import { useAdminSubscriptions } from '../../hooks/useAdminSubscriptions.js';
import { SubscriptionsToolbar } from './SubscriptionsToolbar.jsx';
import { SubscriptionsTable } from './SubscriptionsTable.jsx';
import { dateTime, money } from './subscriptionPresentation.js';
import './subscriptions-admin.css';

export function SubscriptionsAdminPage() {
    const { user } = useAdminAuth();
    const allowed = user?.role === 'admin';
    const { result, status, error, query, applyFilters, changePage, refresh } = useAdminSubscriptions(allowed);
    if (!allowed) return <div className="admin-alert" role="alert">Раздел доступен только администратору.</div>;
    const ready = status === 'ready' && result;
    return <div className="admin-page subscriptions-page">
        <SubscriptionsToolbar onApply={applyFilters} onRefresh={refresh} busy={status === 'loading'} />
        <p className="subscriptions-note">
            Все даты — по Москве. Период показывает срок оплаченного доступа; каждый заказ отображается отдельно.
            Регистрация чека предоплаты проверяется в Robokassa. Итоговый чек имеет собственный статус.
        </p>
        {query.mode !== 'live' && <div className="admin-alert">Выбран режим с тестовыми платежами. Тестовые суммы не являются выручкой.</div>}
        {error && <div className="admin-alert" role="alert">{error}</div>}
        {status === 'loading' && <Loader text="Загрузка подписок и оплат…" />}
        {ready && <>
            <section className="subscriptions-summary" aria-label="Итоги по применённым фильтрам">
                <div><span>Оплачено по фильтру</span><strong>{money(result.summary.paid_kopecks)}</strong><small>До вычета комиссий{query.mode !== 'live' ? ', включая выбранные тестовые суммы' : ''}</small></div>
                <div><span>Оплаченных заказов</span><strong>{result.summary.paid_count}</strong></div>
                <div><span>Ожидают оплаты</span><strong>{result.summary.pending_count}</strong></div>
                <div><span>Действующих периодов</span><strong>{result.summary.active_periods}</strong><small>По применённым фильтрам</small></div>
            </section>
            <p className="subscriptions-muted">Данные на {dateTime(result.as_of)} МСК</p>
            <SubscriptionsTable items={result.items} />
            <Pagination {...result.pagination} onPageChange={changePage} />
        </>}
    </div>;
}
