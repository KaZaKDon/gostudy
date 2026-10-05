export function formatMoney(value) {
    return `${Number(value || 0).toLocaleString('ru-RU', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })} ₽`;
}

const NO_ACCRUAL_STATUSES = new Set(['waived', 'refunded']);

export function getTeacherFinanceDisplayAmounts(item) {
    const hasNoAccrual = NO_ACCRUAL_STATUSES.has(item?.status);

    return {
        hasNoAccrual,
        commissionAmount: hasNoAccrual ? 0 : item?.commission_amount,
        teacherAmount: hasNoAccrual ? 0 : item?.teacher_amount,
    };
}

export function getTeacherFinanceNoAccrualReason(status) {
    if (status === 'refunded') {
        return 'Оплата за урок возвращена. Начисление преподавателю и комиссия GoStudy отменены.';
    }

    if (status === 'waived') {
        return 'Урок отменён. Начисление преподавателю и комиссия GoStudy не производятся.';
    }

    return '';
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

        case 'awaiting_payment':
            return 'Ожидает оплаты';

        case 'overdue':
            return 'Оплата просрочена';

        case 'pay_later':
            return 'Оплатят позже';

        case 'ready_for_payout':
            return 'Готово к выплате';

        case 'payout_paid':
            return 'Выплачено';

        case 'disputed':
            return 'На рассмотрении';

        case 'waived':
            return 'Без начисления';

        case 'refunded':
            return 'Возвращено';

        case 'cancelled':
            return 'Отменено';

        default:
            return status;
    }
}
