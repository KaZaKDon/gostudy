import { createHash, timingSafeEqual } from 'node:crypto';

export function signature(parts: string[], password: string): string {
    return createHash('md5').update([...parts, password].join(':'), 'utf8').digest('hex');
}

export function verifyResult(input: Record<string, unknown>, password: string): boolean {
    // No Shp_* parameters are issued by this integration. Reject unexpected ones.
    if (Object.keys(input).some((key) => key.toLowerCase().startsWith('shp_'))) return false;
    const { OutSum, InvId, SignatureValue } = input;
    if (typeof OutSum !== 'string' || !/^\d{1,8}(?:\.\d{1,6})?$/.test(OutSum)
        || typeof InvId !== 'string' || !/^[1-9]\d{0,9}$/.test(InvId)
        || typeof SignatureValue !== 'string' || !/^[a-fA-F0-9]{32}$/.test(SignatureValue)) return false;
    const expected = signature([OutSum, InvId], password);
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(SignatureValue, 'hex'));
}

export function kopecks(value: string): number {
    if (!/^\d{1,8}(?:\.\d{1,6})?$/.test(value)) throw new Error('Invalid amount');
    const [whole, fraction = ''] = value.split('.');
    if (/[1-9]/.test(fraction.slice(2))) throw new Error('Fractional kopecks');
    return Number(whole) * 100 + Number(fraction.padEnd(2, '0').slice(0, 2));
}
