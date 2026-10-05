import { describe, expect, it } from 'vitest';

import {
    LessonDisputeStatus,
    LessonPaymentStatus,
    LessonPayoutStatus,
} from '../../generated/prisma/enums';
import {
    calculateLessonSettlement,
    resolveTeacherFinanceStatus,
} from './teacher-finance-calculation';

describe('teacher finance calculation', () => {
    it('calculates commission and teacher amount with money rounding', () => {
        expect(calculateLessonSettlement(1_100, 15)).toEqual({
            grossAmount: 1_100,
            commissionPercent: 15,
            commissionAmount: 165,
            teacherAmount: 935,
        });
        expect(calculateLessonSettlement(999.99, 12.5)).toEqual({
            grossAmount: 999.99,
            commissionPercent: 12.5,
            commissionAmount: 125,
            teacherAmount: 874.99,
        });
    });

    it('marks an unpaid lesson overdue after its deadline', () => {
        expect(resolveTeacherFinanceStatus({
            paymentStatus: LessonPaymentStatus.AWAITING_PAYMENT,
            payoutStatus: LessonPayoutStatus.NOT_READY,
            paymentDueAt: new Date('2026-09-26T12:00:00.000Z'),
        }, new Date('2026-09-27T12:00:00.000Z'))).toBe('overdue');
    });

    it('gives an active dispute priority over payment and payout statuses', () => {
        expect(resolveTeacherFinanceStatus({
            paymentStatus: LessonPaymentStatus.PAID,
            payoutStatus: LessonPayoutStatus.READY,
            paymentDueAt: null,
            disputeStatus: LessonDisputeStatus.UNDER_REVIEW,
        })).toBe('disputed');
    });

    it('shows a completed payout as the final visible status', () => {
        expect(resolveTeacherFinanceStatus({
            paymentStatus: LessonPaymentStatus.PAID,
            payoutStatus: LessonPayoutStatus.PAID,
            paymentDueAt: null,
        })).toBe('payout_paid');
    });
});
