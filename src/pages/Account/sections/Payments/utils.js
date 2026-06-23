export function formatMoney(value) {
    return `${value.toLocaleString('ru-RU')} ₽`;
}

export function getPaymentStatusLabel(status) {
    switch (status) {
        case 'pending':
            return 'Ожидает оплаты';

        case 'paid':
            return 'Оплачено';

        case 'confirmed':
            return 'Подтверждено';

        case 'payout':
            return 'Выплачено';

        case 'unpaid':
            return 'Не оплачено';

        case 'cancelled':
            return 'Отменено';

        default:
            return status;
    }
}