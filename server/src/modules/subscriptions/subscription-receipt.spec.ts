import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { finalReceipt, finalReceiptId, fiscalEnvelope, prepaymentReceipt } from './subscription-receipt';
import { fiscalOutcome } from './subscription-receipt.worker';

const tariff = { publication_id: 1, version: 1, title: 'Тариф', price_rubles: 990, period_days: 30,
    students_included: 2, extra_block_students: 2, extra_block_price_rubles: 400 };
describe('Fiscal receipts', () => {
    it('preserves full paid sum and seats, then offsets prepayment without a second charge', () => {
        const receipt = prepaymentReceipt(tariff, 3);
        const final = finalReceipt(7, 8, 219000, { schema: 1, merchant: 'gostudy', email: 'test@example.test',
            siteUrl: 'https://gostudyonline.ru/', receipt } as any);
        expect(receipt.items[0].sum).toBe(2190);
        expect(final).toMatchObject({ id: '2147483655', originId: '8', operation: 'sell', total: 2190,
            payments: [{ type: 2, sum: 2190 }], vats: [{ type: 'none', sum: 0 }] });
        expect(final.items[0]).toMatchObject({ payment_method: 'full_payment', payment_object: 'service', tax: 'none' });
        expect(final.items[0].name).toBe(receipt.items[0].name);
        expect(receipt.items[0].payment_method).toBe('full_prepayment');
    });
    it('has stable ids outside the order id range and rejects inconsistent amounts', () => {
        expect(Number(finalReceiptId(1))).toBeGreaterThan(2147483647);
        expect(finalReceiptId(2147483647)).toBe('4294967295');
        expect(() => finalReceiptId(0)).toThrow();
        expect(() => finalReceipt(1, 1, 5, { schema: 1, receipt: prepaymentReceipt(tariff, 0) } as any)).toThrow('mismatch');
    });
    it('signs the UTF8 base64 body plus Password1, and base64-encodes the MD5 hex text', () => {
        const payload = { merchantId: 'gostudy', id: '2147483649', name: 'Доступ' };
        const [body, hash] = fiscalEnvelope(payload, 'private-fixture').split('.');
        expect(JSON.parse(Buffer.from(body, 'base64').toString('utf8'))).toEqual(payload);
        expect(Buffer.from(hash, 'base64').toString()).toBe(createHash('md5').update(body + 'private-fixture').digest('hex'));
        expect(body + hash).not.toContain('=');
    });
    it('does not confuse accepted or waiting receipts with fiscal registration', () => {
        expect(fiscalOutcome({ ResultCode: '0' })).toBe('pending');
        expect(fiscalOutcome({ Code: '0', Statuses: [] })).toBe('pending');
        expect(fiscalOutcome({ Code: '0', Statuses: [{ Code: 'Wait' }] })).toBe('pending');
        expect(fiscalOutcome({ Code: '0', Statuses: [{ Code: 'Done' }] })).toBe('registered');
        expect(fiscalOutcome({ Code: '0', Statuses: [{ Code: 'Fail' }] })).toBe('review');
    });
});
