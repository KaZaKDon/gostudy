import { describe, expect, it } from 'vitest';
import { kopecks, signature, verifyResult } from './robokassa-signature';

const signed = (OutSum = '990.000000') => ({ OutSum, InvId: '17', SignatureValue: signature([OutSum, '17'], 'test-password-2') });
describe('Robokassa callback authentication', () => {
    it('matches a fixed MD5 checkout fixture', () => {
        expect(signature(['demo', '990.00', '12'], 'password_1')).toBe('6c9d6eb96b82e643b343c26a85349a37');
    });
    it('accepts a six-decimal result with uppercase digest', () => {
        const input = signed();
        expect(verifyResult({ ...input, SignatureValue: input.SignatureValue.toUpperCase() }, 'test-password-2')).toBe(true);
        expect(kopecks(input.OutSum)).toBe(99000);
    });
    it('does not normalize the signed amount before verification', () => {
        expect(verifyResult({ ...signed(), OutSum: '990.00' }, 'test-password-2')).toBe(false);
    });
    it('rejects forged values, arrays, missing digest and unexpected custom parameters', () => {
        for (const input of [{ ...signed(), OutSum: '1.00' }, { ...signed(), InvId: ['17'] },
            { ...signed(), SignatureValue: '' }, { ...signed(), Shp_user: 'another' }]) {
            expect(verifyResult(input, 'test-password-2')).toBe(false);
        }
    });
    it('never accepts the first password for a result', () => {
        expect(verifyResult(signed(), 'test-password-1')).toBe(false);
    });
    it('rejects invalid money and fractional kopecks', () => {
        for (const amount of ['NaN', '-1', '1e3', '99,00', '990.000001']) expect(() => kopecks(amount)).toThrow();
    });
});
