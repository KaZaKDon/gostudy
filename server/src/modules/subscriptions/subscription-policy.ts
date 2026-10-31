export type TariffSnapshot = {
    publication_id: number;
    version: number;
    title: string;
    price_rubles: number;
    period_days: number;
    students_included: number;
    extra_block_students: number;
    extra_block_price_rubles: number;
};

export function calculateOrder(tariff: TariffSnapshot, blocks: number) {
    if (!Number.isInteger(blocks) || blocks < 0 || blocks > 100) throw new Error('Invalid blocks');
    for (const value of [tariff.price_rubles, tariff.extra_block_price_rubles]) {
        if (!Number.isFinite(value) || value < 0 || Math.abs(value * 100 - Math.round(value * 100)) > 0.00001) {
            throw new Error('Invalid price');
        }
    }
    for (const value of [tariff.period_days, tariff.students_included, tariff.extra_block_students]) {
        if (!Number.isInteger(value) || value < 1) throw new Error('Invalid tariff limits');
    }
    // The signed public offer currently defines exactly 30 days.
    if (tariff.period_days !== 30) throw new Error('Unsupported subscription period');
    const amount = Math.round(tariff.price_rubles * 100) + blocks * Math.round(tariff.extra_block_price_rubles * 100);
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > 100000000) throw new Error('Invalid total');
    return { amount, students: tariff.students_included + blocks * tariff.extra_block_students };
}

export function nextExpiry(current: Date | null, now: Date): Date {
    return new Date(Math.max(current?.getTime() ?? 0, now.getTime()) + 30 * 86400000);
}
