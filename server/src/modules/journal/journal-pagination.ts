import {
    parseLocalDateTime,
    zonedDateTimeToUtc,
} from '../schedule/schedule-time';

export type JournalCursor = {
    date: Date;
    id: number;
};

export function parseJournalCursor(
    dateValue: string | undefined,
    idValue: number | undefined,
    timezone: string,
): JournalCursor | null {
    if (dateValue === undefined && idValue === undefined) {
        return null;
    }

    if (dateValue === undefined || idValue === undefined) {
        throw new Error('Некорректный указатель страницы');
    }

    const localDate = parseLocalDateTime(
        dateValue.replace(' ', 'T').slice(0, 16),
    );
    const second = Number(dateValue.slice(-2));

    if (!localDate || second > 59 || idValue < 1) {
        throw new Error('Некорректный указатель страницы');
    }

    return {
        date: zonedDateTimeToUtc({
            ...localDate,
            second,
        }, timezone),
        id: idValue,
    };
}
