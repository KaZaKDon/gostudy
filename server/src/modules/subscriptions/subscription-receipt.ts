import { createHash } from 'node:crypto';
import { calculateOrder, type TariffSnapshot } from './subscription-policy';

export type ReceiptItem = {
    name: string; quantity: number; sum: number;
    payment_method: 'full_prepayment' | 'full_payment'; payment_object: 'service'; tax: 'none';
};
export type PrepaymentReceipt = { sno: 'usn_income'; items: ReceiptItem[] };
export type LiveDetails = {
    schema: 1; merchant: string; email: string; siteUrl: string;
    receipt: PrepaymentReceipt; receiptEncoded: string;
    consent: { version: string; acceptedAt: string; ipAddress: string | null; userAgent: string | null;
        documents: { path: string; version: string; sha256: string; text: string }[] };
};

export function prepaymentReceipt(tariff: TariffSnapshot, blocks: number): PrepaymentReceipt {
    const calculation = calculateOrder(tariff, blocks);
    // One service package: the quantity is 1; all seats belong to the same 30-day period.
    return { sno: 'usn_income', items: [{
        name: `Доступ к GoStudy на 30 дней, до ${calculation.students} учеников`,
        quantity: 1, sum: calculation.amount / 100,
        payment_method: 'full_prepayment', payment_object: 'service', tax: 'none',
    }] };
}

export function finalReceiptId(jobId: number): string {
    if (!Number.isInteger(jobId) || jobId < 1 || jobId > 2147483647) throw new Error('Invalid fiscal job id');
    // Subscription order ids are positive PostgreSQL int32; fiscal ids never overlap them.
    return String(2147483648 + jobId);
}

export function finalReceipt(jobId: number, orderId: number, amount: number, details: LiveDetails) {
    const total = details.receipt.items.reduce((sum, item) => sum + Math.round(item.sum * 100), 0);
    if (details.schema !== 1 || total !== amount || details.receipt.sno !== 'usn_income') {
        throw new Error('Receipt snapshot mismatch');
    }
    return { merchantId: details.merchant, id: finalReceiptId(jobId), originId: String(orderId),
        operation: 'sell', sno: details.receipt.sno, url: details.siteUrl, total: amount / 100,
        items: details.receipt.items.map((item) => ({ ...item, payment_method: 'full_payment' })),
        client: { email: details.email }, payments: [{ type: 2, sum: amount / 100 }], vats: [{ type: 'none', sum: 0 }],
    };
}

// RoboFiscal uses base64(JSON) + base64(MD5 hex), with padding stripped (not a JWT).
export function fiscalEnvelope(payload: unknown, password1: string): string {
    const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64').replace(/=+$/, '');
    const hash = createHash('md5').update(body + password1, 'utf8').digest('hex');
    return `${body}.${Buffer.from(hash, 'utf8').toString('base64').replace(/=+$/, '')}`;
}
