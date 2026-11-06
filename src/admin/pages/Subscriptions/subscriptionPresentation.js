export const money = (kopecks) => new Intl.NumberFormat('ru-RU', {
    style: 'currency', currency: 'RUB',
}).format(kopecks / 100);

export function dateTime(value) {
    return value ? new Intl.DateTimeFormat('ru-RU', {
        timeZone: 'Europe/Moscow', dateStyle: 'short', timeStyle: 'short',
    }).format(new Date(value)) : '—';
}

export const paymentLabels = { paid: 'Оплачен', pending: 'Ожидает оплаты' };
export const periodLabels = { active: 'Действует', scheduled: 'Начнётся позже', expired: 'Завершён' };
export const receiptLabels = {
    scheduled: 'Запланирован', submitted: 'Обрабатывается', registered: 'Зарегистрирован',
    review: 'Требует проверки', held: 'Приостановлен',
};
export function receiptVariant(receipt) {
    if (!receipt) return 'default';
    if (receipt.state === 'registered') return 'success';
    if (receipt.state === 'review' || receipt.overdue) return 'danger';
    return receipt.state === 'held' ? 'warning' : 'info';
}
