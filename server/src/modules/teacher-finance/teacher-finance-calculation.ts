import {
    LessonDisputeStatus,
    LessonPaymentStatus,
    LessonPayoutStatus,
} from '../../generated/prisma/enums';

export type TeacherFinanceVisibleStatus =
    | 'awaiting_payment'
    | 'overdue'
    | 'pay_later'
    | 'paid'
    | 'ready_for_payout'
    | 'payout_paid'
    | 'disputed'
    | 'waived'
    | 'refunded'
    | 'not_due';

export function roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateLessonSettlement(
    grossAmount: number,
    commissionPercent: number,
) {
    const gross = roundMoney(Math.max(0, grossAmount));
    const percent = roundMoney(
        Math.min(100, Math.max(0, commissionPercent)),
    );
    const commission = roundMoney(gross * percent / 100);

    return {
        grossAmount: gross,
        commissionPercent: percent,
        commissionAmount: commission,
        teacherAmount: roundMoney(gross - commission),
    };
}

export function resolveTeacherFinanceStatus(input: {
    paymentStatus: LessonPaymentStatus;
    payoutStatus: LessonPayoutStatus;
    paymentDueAt: Date | null;
    disputeStatus?: LessonDisputeStatus | null;
}, now = new Date()): TeacherFinanceVisibleStatus {
    if (
        input.disputeStatus === LessonDisputeStatus.OPEN
        || input.disputeStatus === LessonDisputeStatus.UNDER_REVIEW
    ) {
        return 'disputed';
    }

    if (input.payoutStatus === LessonPayoutStatus.PAID) {
        return 'payout_paid';
    }

    if (input.payoutStatus === LessonPayoutStatus.READY) {
        return 'ready_for_payout';
    }

    if (input.paymentStatus === LessonPaymentStatus.AWAITING_PAYMENT) {
        return input.paymentDueAt && input.paymentDueAt <= now
            ? 'overdue'
            : 'awaiting_payment';
    }

    return input.paymentStatus.toLowerCase() as TeacherFinanceVisibleStatus;
}
