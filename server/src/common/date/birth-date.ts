const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function parseIsoDateOnly(value: string): Date | null {
    if (!ISO_DATE_ONLY.test(value)) {
        return null;
    }

    const date = new Date(`${value}T00:00:00.000Z`);

    return Number.isNaN(date.getTime())
        || date.toISOString().slice(0, 10) !== value
        ? null
        : date;
}

export function utcStartOfDay(value = new Date()): Date {
    return new Date(Date.UTC(
        value.getUTCFullYear(),
        value.getUTCMonth(),
        value.getUTCDate(),
    ));
}

export function adultBirthDateCutoff(value = new Date()): Date {
    const cutoff = utcStartOfDay(value);
    cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 18);

    return cutoff;
}

export function isAdultBirthDate(
    birthDate: Date,
    value = new Date(),
): boolean {
    return birthDate <= adultBirthDateCutoff(value);
}

export function isPastBirthDate(
    birthDate: Date,
    value = new Date(),
): boolean {
    return birthDate < utcStartOfDay(value);
}
