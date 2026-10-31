import { describe, expect, it } from 'vitest';
import { calculateOrder, nextExpiry } from './subscription-policy';
const tariff = { publication_id: 7, version: 2, title: 'GoStudy', price_rubles: 990,
    period_days: 30, students_included: 2, extra_block_students: 2, extra_block_price_rubles: 400 };
describe('Subscription pricing and period', () => {
    it('uses the selected publication price and extra blocks', () => {
        expect(calculateOrder(tariff, 2)).toEqual({ amount: 179000, students: 6 });
        expect(calculateOrder({ ...tariff, price_rubles: 1250 }, 0).amount).toBe(125000);
    });
    it('rejects invalid quantities and unsupported periods', () => {
        for (const blocks of [-1, 0.5, 101, NaN]) expect(() => calculateOrder(tariff, blocks)).toThrow();
        expect(() => calculateOrder({ ...tariff, period_days: 31 }, 0)).toThrow();
        expect(() => calculateOrder({ ...tariff, price_rubles: 0.001 }, 0)).toThrow();
    });
    it('extends an active period by exactly 30 days, including across February', () => {
        const now = new Date('2027-02-01T12:00:00Z');
        expect(nextExpiry(new Date('2027-02-10T12:00:00Z'), now).toISOString()).toBe('2027-03-12T12:00:00.000Z');
    });
    it('starts from now when no period exists or it expired', () => {
        const now = new Date('2026-10-30T12:00:00Z');
        expect(nextExpiry(null, now).toISOString()).toBe('2026-11-29T12:00:00.000Z');
        expect(nextExpiry(new Date('2026-01-01'), now)).toEqual(nextExpiry(null, now));
    });
});
