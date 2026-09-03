const DEFAULT_TIMEZONE = 'Europe/Moscow';

type DateParts = {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
};

function dateParts(date: Date, timezone: string): DateParts {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    });
    const values = Object.fromEntries(
        formatter
            .formatToParts(date)
            .filter((part) => part.type !== 'literal')
            .map((part) => [part.type, Number(part.value)]),
    );

    return values as DateParts;
}

function timezoneOffsetMilliseconds(date: Date, timezone: string): number {
    const parts = dateParts(date, timezone);

    return Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second,
    ) - Math.floor(date.getTime() / 1000) * 1000;
}

export function resolveTimezone(value: string | null | undefined): string {
    const candidate = value?.trim() || DEFAULT_TIMEZONE;

    try {
        new Intl.DateTimeFormat('ru-RU', { timeZone: candidate }).format();
        return candidate;
    } catch {
        return DEFAULT_TIMEZONE;
    }
}

export function parseCalendarDate(value: string): DateParts | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

    if (!match) {
        return null;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const check = new Date(Date.UTC(year, month - 1, day));

    if (
        check.getUTCFullYear() !== year
        || check.getUTCMonth() !== month - 1
        || check.getUTCDate() !== day
    ) {
        return null;
    }

    return { year, month, day, hour: 0, minute: 0, second: 0 };
}

export function parseLocalDateTime(value: string): DateParts | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);

    if (!match) {
        return null;
    }

    const date = parseCalendarDate(`${match[1]}-${match[2]}-${match[3]}`);
    const hour = Number(match[4]);
    const minute = Number(match[5]);

    if (!date || hour > 23 || minute > 59) {
        return null;
    }

    return {
        ...date,
        hour,
        minute,
    };
}

export function addCalendarDays(parts: DateParts, days: number): DateParts {
    const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));

    return {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
        hour: parts.hour,
        minute: parts.minute,
        second: parts.second,
    };
}

export function calendarDayDifference(from: DateParts, to: DateParts): number {
    const fromTime = Date.UTC(from.year, from.month - 1, from.day);
    const toTime = Date.UTC(to.year, to.month - 1, to.day);

    return Math.round((toTime - fromTime) / 86_400_000);
}

export function zonedDateTimeToUtc(parts: DateParts, timezone: string): Date {
    const localTime = Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second,
    );
    let result = new Date(localTime);

    for (let iteration = 0; iteration < 3; iteration += 1) {
        const next = new Date(
            localTime - timezoneOffsetMilliseconds(result, timezone),
        );

        if (next.getTime() === result.getTime()) {
            break;
        }

        result = next;
    }

    return result;
}

export function formatInTimezone(date: Date | null, timezone: string): string | null {
    if (!date) {
        return null;
    }

    const parts = dateParts(date, timezone);
    const pad = (value: number) => String(value).padStart(2, '0');

    return `${parts.year}-${pad(parts.month)}-${pad(parts.day)} `
        + `${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}`;
}
