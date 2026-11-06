import { Link } from 'react-router-dom';
import { Badge, EmptyState, Table, TableCell, TableRow } from '../../components/ui/index.js';
import { dateTime, money, paymentLabels, periodLabels, receiptLabels, receiptVariant } from './subscriptionPresentation.js';

const columns = [
    { key: 'order', label: 'Заказ' }, { key: 'teacher', label: 'Преподаватель' },
    { key: 'payment', label: 'Оплата' }, { key: 'period', label: 'Период доступа · МСК' },
    { key: 'students', label: 'Лимит учеников' }, { key: 'first', label: 'Чек предоплаты' },
    { key: 'receipt', label: 'Итоговый чек' },
];

function FinalReceipt({ receipt, paid, isTest }) {
    if (isTest) return <span className="subscriptions-muted">Тестовый платёж</span>;
    if (!receipt) return <span className={paid ? 'subscriptions-attention' : 'subscriptions-muted'}>
        {paid ? 'Нет задания — проверьте' : 'После оплаты'}
    </span>;
    return <div className="subscriptions-stack">
        <Badge variant={receiptVariant(receipt)}>{receiptLabels[receipt.state] || receipt.state}</Badge>
        <span>{dateTime(receipt.due_at)}</span>
        {receipt.overdue && <strong className="subscriptions-attention">Срок наступил, регистрация не подтверждена</strong>}
        <details className="subscriptions-receipt-details">
            <summary>Данные чека</summary>
            <dl>
                <div><dt>Задание</dt><dd>№{receipt.id}</dd></div>
                <div><dt>Отправлен</dt><dd>{dateTime(receipt.submitted_at)}</dd></div>
                <div><dt>Зарегистрирован</dt><dd>{dateTime(receipt.registered_at)}</dd></div>
                <div><dt>Попыток обработки</dt><dd>{receipt.attempts}</dd></div>
                <div><dt>Следующая проверка</dt><dd>{receipt.state === 'registered' || receipt.state === 'held' ? '—' : dateTime(receipt.next_attempt_at)}</dd></div>
                {receipt.last_code && <div><dt>Последний код</dt><dd>{receipt.last_code}</dd></div>}
                {receipt.hold_reason && <div><dt>Причина приостановки</dt><dd>{receipt.hold_reason}</dd></div>}
            </dl>
        </details>
    </div>;
}

export function SubscriptionsTable({ items }) {
    if (!items.length) return <EmptyState title="Оплаты не найдены" description="Попробуйте изменить поиск или фильтры." />;
    return <Table columns={columns} minWidth={1250} className="subscriptions-table">
        {items.map((order) => <TableRow key={order.id}>
            <TableCell>
                <div className="subscriptions-stack">
                    <strong>№{order.id}</strong>
                    <Badge variant={order.is_test ? 'warning' : 'info'}>{order.is_test ? 'Тестовый' : 'Реальный'}</Badge>
                    <small className="subscriptions-muted">Создан: {dateTime(order.created_at)}</small>
                </div>
            </TableCell>
            <TableCell>
                <div className="subscriptions-stack">
                    <Link to={`/admin/teachers/${order.teacher.id}`}>{order.teacher.full_name || 'Без имени'}</Link>
                    <span>{order.teacher.email}</span>
                    <small className="subscriptions-muted">ID {order.teacher.id}</small>
                </div>
            </TableCell>
            <TableCell>
                <div className="subscriptions-stack">
                    <strong>{money(order.amount_kopecks)}</strong>
                    <Badge variant={order.payment_status === 'paid' ? 'success' : 'warning'}>
                        {paymentLabels[order.payment_status] || order.payment_status}
                    </Badge>
                    <span>{dateTime(order.paid_at)}</span>
                </div>
            </TableCell>
            <TableCell>
                {order.period ? <div className="subscriptions-stack">
                    <Badge variant={order.period.state === 'active' ? 'success' : 'info'}>
                        {periodLabels[order.period.state] || order.period.state}
                    </Badge>
                    <span>С {dateTime(order.period.starts_at)}</span>
                    <span>По {dateTime(order.period.ends_at)}</span>
                </div> : <span className={!order.is_test && order.payment_status === 'paid' ? 'subscriptions-attention' : 'subscriptions-muted'}>
                    {order.is_test ? 'Тестовый доступ учитывается отдельно' : order.payment_status === 'paid' ? 'Нет периода — проверьте' : 'После оплаты'}
                </span>}
            </TableCell>
            <TableCell>
                <div className="subscriptions-stack">
                    <strong>{order.period ? `До ${order.period.students}` : '—'}</strong>
                    <small className="subscriptions-muted">Доп. блоков: {order.extra_blocks}</small>
                </div>
            </TableCell>
            <TableCell><span className="subscriptions-muted">
                {order.first_receipt_state === 'provider_check' ? 'Проверить в Robokassa'
                    : order.first_receipt_state === 'not_applicable' ? 'Тестовый платёж' : 'После оплаты'}
            </span></TableCell>
            <TableCell><FinalReceipt receipt={order.final_receipt} paid={order.payment_status === 'paid'} isTest={order.is_test} /></TableCell>
        </TableRow>)}
    </Table>;
}
